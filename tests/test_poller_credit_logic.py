"""
Tests de la lógica de crédito del poller Lambda (poller.py).
Cubre: AC-5 (confirm/release atómica), AC-6 (idempotencia poller — sin doble débito),
       AC-13 (métricas CloudWatch por tenant).

Los wrappers Python que llaman al RPC se testean verificando que:
- Los argumentos correctos se pasan a supabase.rpc()
- La excepción 'tour_not_in_generating' se captura como warning sin re-raise
  (esto es lo que garantiza AC-6: sin doble débito en segunda invocación).

NOTA: La lógica SQL atómica en sí (confirm_credit_consumption,
release_credit_reservation) requiere un test de integración contra Postgres real
(pgTAP o Supabase branch). Ver 05-tests.md § Gaps de integración SQL.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch, call

import pytest


TENANT_ID = str(uuid.uuid4())
TOUR_ID = str(uuid.uuid4())
ACCOUNT_ID = str(uuid.uuid4())
VIDEO_S3_KEY = f"tours/{TENANT_ID}/{TOUR_ID}/output.mp4"


def _make_generating_tour(with_account=True, timed_out=False):
    now = datetime.now(tz=timezone.utc)
    if timed_out:
        timeout_at = (now - timedelta(minutes=5)).isoformat()
    else:
        timeout_at = (now + timedelta(minutes=20)).isoformat()

    return {
        "id": TOUR_ID,
        "tenant_id": TENANT_ID,
        "account_id": ACCOUNT_ID if with_account else None,
        "status": "generating",
        "bedrock_invocation_arns": ["arn:aws:bedrock:us-west-2::async-invoke/clip0"],
        "timeout_at": timeout_at,
        "image_s3_keys": [f"img_{i}.jpg" for i in range(5)],
        "clip_prompts": None,
        "clip_s3_keys": None,
        "video_s3_key": None,
        "accepted_at": now.isoformat(),
        "started_at": now.isoformat(),
    }


def _make_clip_status(state="Completed", output_s3_key=None):
    status = MagicMock()
    status.state = state
    status.output_s3_key = output_s3_key or f"tours/{TENANT_ID}/{TOUR_ID}/clip_000/output.mp4"
    status.failure_message = "bedrock error" if state == "Failed" else None
    return status


# ---------------------------------------------------------------------------
# AC-5: confirm_credit_consumption se llama con los parámetros correctos
# ---------------------------------------------------------------------------

def test_handle_completion_calls_confirm_credit_rpc_with_correct_args():
    """AC-5: _handle_completion invoca confirm_credit_consumption con los parámetros correctos."""
    from poller import _handle_completion

    tour = _make_generating_tour(with_account=True)
    clip_statuses = [_make_clip_status("Completed")]

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.return_value = MagicMock()
    mock_supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    mock_s3 = MagicMock()
    mock_s3.download_clip_to_tmp = MagicMock()
    mock_s3.upload_final_video = MagicMock()
    mock_s3.generate_video_presigned_url.return_value = "https://s3.presigned/output.mp4"

    mock_webhook_svc = MagicMock()
    mock_metrics = MagicMock()

    mock_settings = MagicMock()
    mock_settings.clip_duration_secs = 9
    mock_settings.bedrock_price_per_second = 1.5
    mock_settings.video_presigned_url_expiry_seconds = 86400

    with (
        patch("src.services.ffmpeg_service.concat_clips"),
        patch("tempfile.TemporaryDirectory") as mock_tmpdir,
        patch("os.path.join", side_effect=lambda *args: "/tmp/" + args[-1]),
    ):
        mock_tmpdir.return_value.__enter__.return_value = "/tmp"

        _handle_completion(
            tour=tour,
            clip_statuses=clip_statuses,
            supabase=mock_supa,
            s3=mock_s3,
            webhook_svc=mock_webhook_svc,
            metrics=mock_metrics,
            settings=mock_settings,
            log_ctx={"tenant_id": TENANT_ID, "tour_id": TOUR_ID},
        )

    # Verificar que confirm_credit_consumption fue invocado con los parámetros correctos
    mock_supa.rpc.assert_called_once_with(
        "confirm_credit_consumption",
        {
            "p_tour_id": TOUR_ID,
            "p_account_id": ACCOUNT_ID,
            "p_tenant_id": TENANT_ID,
            "p_video_s3_key": f"tours/{TENANT_ID}/{TOUR_ID}/output.mp4",
        },
    )


def test_handle_completion_does_not_call_confirm_for_on_demand():
    """AC-8/AC-5: tour on-demand (account_id=None) → confirm_credit_consumption se llama
    con p_account_id=None, sin intentar descontar crédito."""
    from poller import _handle_completion

    tour = _make_generating_tour(with_account=False)
    clip_statuses = [_make_clip_status("Completed")]

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.return_value = MagicMock()
    mock_supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    mock_s3 = MagicMock()
    mock_s3.generate_video_presigned_url.return_value = "https://s3/output.mp4"

    mock_settings = MagicMock()
    mock_settings.clip_duration_secs = 9
    mock_settings.bedrock_price_per_second = 1.5
    mock_settings.video_presigned_url_expiry_seconds = 86400

    with (
        patch("src.services.ffmpeg_service.concat_clips"),
        patch("tempfile.TemporaryDirectory") as mock_tmpdir,
        patch("os.path.join", side_effect=lambda *args: "/tmp/" + args[-1]),
    ):
        mock_tmpdir.return_value.__enter__.return_value = "/tmp"

        _handle_completion(
            tour=tour,
            clip_statuses=clip_statuses,
            supabase=mock_supa,
            s3=mock_s3,
            webhook_svc=MagicMock(),
            metrics=MagicMock(),
            settings=mock_settings,
            log_ctx={},
        )

    # confirm_credit_consumption igual se llama, pero con account_id=None
    call_kwargs = mock_supa.rpc.call_args.args[1]
    assert call_kwargs["p_account_id"] is None


# ---------------------------------------------------------------------------
# AC-6: idempotencia del poller — excepción de dominio capturada como warning
# ---------------------------------------------------------------------------

def _run_handle_completion_with_rpc_exception(exc_string: str) -> MagicMock:
    """Helper: ejecuta _handle_completion con una excepción RPC y devuelve el mock de supabase."""
    from poller import _handle_completion

    tour = _make_generating_tour(with_account=True)
    clip_statuses = [_make_clip_status("Completed")]

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.side_effect = Exception(exc_string)
    mock_supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    mock_s3 = MagicMock()
    mock_s3.generate_video_presigned_url.return_value = "https://s3/output.mp4"

    mock_settings = MagicMock()
    mock_settings.clip_duration_secs = 9
    mock_settings.bedrock_price_per_second = 1.5
    mock_settings.video_presigned_url_expiry_seconds = 86400

    with (
        patch("src.services.ffmpeg_service.concat_clips"),
        patch("tempfile.TemporaryDirectory") as mock_tmpdir,
        patch("os.path.join", side_effect=lambda *args: "/tmp/" + args[-1]),
    ):
        mock_tmpdir.return_value.__enter__.return_value = "/tmp"

        # No debe lanzar excepción — debe capturar y retornar
        _handle_completion(
            tour=tour,
            clip_statuses=clip_statuses,
            supabase=mock_supa,
            s3=mock_s3,
            webhook_svc=MagicMock(),
            metrics=MagicMock(),
            settings=mock_settings,
            log_ctx={"tenant_id": TENANT_ID, "tour_id": TOUR_ID},
        )

    return mock_supa


def test_handle_completion_captures_tour_not_in_finalizing_as_warning():
    """AC-6: segunda invocación del poller → 'tour_not_in_finalizing' (string post-migración 008,
    flujo normal) capturado como warning, sin re-raise. Garantiza sin doble débito."""
    mock_supa = _run_handle_completion_with_rpc_exception(
        "tour_not_in_finalizing: tour already confirmed by another instance"
    )
    # RPC invocado una sola vez; ninguna excepción propagada
    assert mock_supa.rpc.call_count == 1


def test_handle_completion_captures_tour_not_in_generating_mixed_deploy():
    """AC-6: despliegue mixto (pre-migración 008) — 'tour_not_in_generating' también
    capturado como warning para garantizar compatibilidad durante el rollout.
    El poller tolera ambos strings según comentario en poller.py L212-215."""
    mock_supa = _run_handle_completion_with_rpc_exception(
        "tour_not_in_generating: tour already completed"
    )
    # RPC invocado una sola vez; ninguna excepción propagada
    assert mock_supa.rpc.call_count == 1


def test_handle_completion_reraises_unknown_rpc_exceptions():
    """AC-6 (negativo): excepciones RPC desconocidas SÍ se re-lanzan para que SQS reintente."""
    from poller import _handle_completion
    import pytest

    tour = _make_generating_tour(with_account=True)
    clip_statuses = [_make_clip_status("Completed")]

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.side_effect = Exception("connection_timeout: rds unreachable")
    mock_supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    mock_s3 = MagicMock()
    mock_s3.generate_video_presigned_url.return_value = "https://s3/output.mp4"

    mock_settings = MagicMock()
    mock_settings.clip_duration_secs = 9
    mock_settings.bedrock_price_per_second = 1.5
    mock_settings.video_presigned_url_expiry_seconds = 86400

    with (
        patch("src.services.ffmpeg_service.concat_clips"),
        patch("tempfile.TemporaryDirectory") as mock_tmpdir,
        patch("os.path.join", side_effect=lambda *args: "/tmp/" + args[-1]),
        pytest.raises(Exception, match="connection_timeout"),
    ):
        mock_tmpdir.return_value.__enter__.return_value = "/tmp"

        _handle_completion(
            tour=tour,
            clip_statuses=clip_statuses,
            supabase=mock_supa,
            s3=mock_s3,
            webhook_svc=MagicMock(),
            metrics=MagicMock(),
            settings=mock_settings,
            log_ctx={"tenant_id": TENANT_ID, "tour_id": TOUR_ID},
        )


def test_handle_failure_calls_release_credit_rpc_with_correct_args():
    """AC-5: _handle_failure invoca release_credit_reservation con los parámetros correctos."""
    from poller import _handle_failure

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.return_value = MagicMock()

    mock_webhook_svc = MagicMock()
    mock_metrics = MagicMock()

    _handle_failure(
        supabase=mock_supa,
        webhook_svc=mock_webhook_svc,
        metrics=mock_metrics,
        tour_id=TOUR_ID,
        tenant_id=TENANT_ID,
        account_id=ACCOUNT_ID,
        reason="bedrock_clip_failure: timeout",
        log_ctx={},
    )

    mock_supa.rpc.assert_called_once_with(
        "release_credit_reservation",
        {
            "p_tour_id": TOUR_ID,
            "p_account_id": ACCOUNT_ID,
            "p_tenant_id": TENANT_ID,
            "p_failure_reason": "bedrock_clip_failure: timeout",
        },
    )
    mock_webhook_svc.enqueue_webhook.assert_called_once()
    enqueue_kwargs = mock_webhook_svc.enqueue_webhook.call_args.kwargs
    assert enqueue_kwargs["status"] == "failed"


def test_handle_failure_on_demand_passes_none_account_id():
    """AC-5/AC-8: fallo en tour on-demand → release_credit_reservation con account_id=None."""
    from poller import _handle_failure

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.return_value = MagicMock()

    _handle_failure(
        supabase=mock_supa,
        webhook_svc=MagicMock(),
        metrics=MagicMock(),
        tour_id=TOUR_ID,
        tenant_id=TENANT_ID,
        account_id=None,
        reason="timeout",
        log_ctx={},
    )

    call_kwargs = mock_supa.rpc.call_args.args[1]
    assert call_kwargs["p_account_id"] is None


# ---------------------------------------------------------------------------
# AC-13: métricas CloudWatch por tenant
# ---------------------------------------------------------------------------

def test_handle_failure_emits_tour_failed_metric():
    """AC-13: fallo → emite métrica ToursFailed con TenantId correcto."""
    from poller import _handle_failure

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.return_value = MagicMock()
    mock_metrics = MagicMock()

    _handle_failure(
        supabase=mock_supa,
        webhook_svc=MagicMock(),
        metrics=mock_metrics,
        tour_id=TOUR_ID,
        tenant_id=TENANT_ID,
        account_id=None,
        reason="timeout",
        log_ctx={},
    )

    mock_metrics.tour_failed.assert_called_once_with(TENANT_ID)


def test_handle_completion_emits_tour_completed_metric_with_cost():
    """AC-13: completado → emite métrica ToursCompleted con costo Bedrock."""
    from poller import _handle_completion

    tour = _make_generating_tour(with_account=False)
    clip_statuses = [_make_clip_status("Completed")]

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.return_value = MagicMock()
    mock_supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    mock_s3 = MagicMock()
    mock_s3.generate_video_presigned_url.return_value = "https://s3/output.mp4"

    mock_metrics = MagicMock()

    mock_settings = MagicMock()
    mock_settings.clip_duration_secs = 9
    mock_settings.bedrock_price_per_second = 1.5  # → 1 clip × 9s × 1.5 = 13.5 USD
    mock_settings.video_presigned_url_expiry_seconds = 86400

    with (
        patch("src.services.ffmpeg_service.concat_clips"),
        patch("tempfile.TemporaryDirectory") as mock_tmpdir,
        patch("os.path.join", side_effect=lambda *args: "/tmp/" + args[-1]),
    ):
        mock_tmpdir.return_value.__enter__.return_value = "/tmp"

        _handle_completion(
            tour=tour,
            clip_statuses=clip_statuses,
            supabase=mock_supa,
            s3=mock_s3,
            webhook_svc=MagicMock(),
            metrics=mock_metrics,
            settings=mock_settings,
            log_ctx={},
        )

    mock_metrics.tour_completed.assert_called_once()
    call_args = mock_metrics.tour_completed.call_args
    assert call_args.args[0] == TENANT_ID
    expected_cost = 1 * 9 * 1.5
    assert abs(call_args.args[1] - expected_cost) < 0.01
