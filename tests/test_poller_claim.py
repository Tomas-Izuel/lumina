"""
Tests del claim atómico del Poller (M-2 fix, migración 008).
Cubre: comportamiento del claim 'generating' → 'finalizing' antes del trabajo pesado.

Escenarios:
  1. Claim exitoso: UPDATE retorna 1 fila → _handle_completion es llamado.
  2. Claim fallido: UPDATE retorna 0 filas → _handle_completion NO es llamado (otra instancia).
  3. Tour en 'finalizing' en el SELECT inicial → retorna 'in_progress' sin claim.
  4. Timeout en 'finalizing' → _handle_failure es llamado (release_credit_reservation).
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, call, patch


def _make_tour(
    status="generating",
    has_arns=True,
    timeout_minutes_ahead=30,
    tour_id="tour-uuid",
    tenant_id="tenant-uuid",
    account_id=None,
):
    """Crea un dict de tour mínimo para los tests del poller."""
    now = datetime.now(tz=timezone.utc)
    timeout_at = (now + timedelta(minutes=timeout_minutes_ahead)).isoformat()
    return {
        "id": tour_id,
        "tenant_id": tenant_id,
        "account_id": account_id,
        "status": status,
        "bedrock_invocation_arns": ["arn:aws:bedrock:us-west-2::async-invoke/abc"] if has_arns else None,
        "timeout_at": timeout_at,
    }


def _make_clip_status(state="Completed", output_s3_key="tours/t/t/clip_0.mp4"):
    """Mock de ClipStatus."""
    cs = MagicMock()
    cs.state = state
    cs.output_s3_key = output_s3_key
    cs.failure_message = None
    return cs


class TestAtomicClaim:
    """Verifica que el claim atómico 'generating'→'finalizing' funcione correctamente."""

    def test_claim_succeeded_calls_handle_completion(self):
        """Claim exitoso (UPDATE retorna 1 fila) → _handle_completion es invocado."""
        from poller import _poll_tour

        tour = _make_tour(status="generating")
        now = datetime.now(tz=timezone.utc)

        mock_backend = MagicMock()
        mock_backend.get_clip_status.return_value = _make_clip_status(state="Completed")

        mock_supabase = MagicMock()
        # UPDATE retorna 1 fila → claim exitoso
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "tour-uuid", "status": "finalizing"}]
        )

        with patch("poller._handle_completion") as mock_completion:
            result = _poll_tour(
                tour=tour,
                now=now,
                supabase=mock_supabase,
                s3=MagicMock(),
                backend=mock_backend,
                webhook_svc=MagicMock(),
                metrics=MagicMock(),
                settings=MagicMock(),
                log_ctx={"tenant_id": "t", "tour_id": "tour-uuid"},
            )

        assert result == "completed"
        mock_completion.assert_called_once()

    def test_claim_failed_skips_completion(self):
        """Claim fallido (UPDATE retorna 0 filas) → _handle_completion NO es invocado."""
        from poller import _poll_tour

        tour = _make_tour(status="generating")
        now = datetime.now(tz=timezone.utc)

        mock_backend = MagicMock()
        mock_backend.get_clip_status.return_value = _make_clip_status(state="Completed")

        mock_supabase = MagicMock()
        # UPDATE retorna lista vacía → otra instancia ya reclamó
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch("poller._handle_completion") as mock_completion:
            result = _poll_tour(
                tour=tour,
                now=now,
                supabase=mock_supabase,
                s3=MagicMock(),
                backend=mock_backend,
                webhook_svc=MagicMock(),
                metrics=MagicMock(),
                settings=MagicMock(),
                log_ctx={"tenant_id": "t", "tour_id": "tour-uuid"},
            )

        assert result == "in_progress"
        mock_completion.assert_not_called()

    def test_claim_not_attempted_when_clips_in_progress(self):
        """Clips en InProgress → no se intenta el claim (trabajo pesado no aplica)."""
        from poller import _poll_tour

        tour = _make_tour(status="generating")
        now = datetime.now(tz=timezone.utc)

        mock_backend = MagicMock()
        mock_backend.get_clip_status.return_value = _make_clip_status(state="InProgress")

        mock_supabase = MagicMock()

        result = _poll_tour(
            tour=tour,
            now=now,
            supabase=mock_supabase,
            s3=MagicMock(),
            backend=mock_backend,
            webhook_svc=MagicMock(),
            metrics=MagicMock(),
            settings=MagicMock(),
            log_ctx={"tenant_id": "t", "tour_id": "tour-uuid"},
        )

        assert result == "in_progress"
        # UPDATE para claim no debe haber sido llamado
        mock_supabase.table.return_value.update.assert_not_called()

    def test_claim_not_attempted_when_clips_failed(self):
        """Clip fallido → fallo directo sin intentar claim."""
        from poller import _poll_tour

        tour = _make_tour(status="generating")
        now = datetime.now(tz=timezone.utc)

        mock_clip = _make_clip_status(state="Failed")
        mock_clip.failure_message = "InternalServerError"

        mock_backend = MagicMock()
        mock_backend.get_clip_status.return_value = mock_clip

        mock_supabase = MagicMock()

        with patch("poller._handle_failure") as mock_failure:
            result = _poll_tour(
                tour=tour,
                now=now,
                supabase=mock_supabase,
                s3=MagicMock(),
                backend=mock_backend,
                webhook_svc=MagicMock(),
                metrics=MagicMock(),
                settings=MagicMock(),
                log_ctx={"tenant_id": "t", "tour_id": "tour-uuid"},
            )

        assert result == "failed"
        mock_failure.assert_called_once()
        # UPDATE para claim no debe haber sido llamado
        mock_supabase.table.return_value.update.assert_not_called()


class TestFinalizingStatus:
    """Verifica que tours en estado 'finalizing' sean manejados correctamente."""

    def test_finalizing_tour_returns_in_progress(self):
        """Tour en 'finalizing' (reclamado por otra instancia) → retorna in_progress sin claim."""
        from poller import _poll_tour

        tour = _make_tour(status="finalizing")
        now = datetime.now(tz=timezone.utc)

        mock_supabase = MagicMock()
        mock_backend = MagicMock()

        result = _poll_tour(
            tour=tour,
            now=now,
            supabase=mock_supabase,
            s3=MagicMock(),
            backend=mock_backend,
            webhook_svc=MagicMock(),
            metrics=MagicMock(),
            settings=MagicMock(),
            log_ctx={"tenant_id": "t", "tour_id": "tour-uuid"},
        )

        assert result == "in_progress"
        # No debe consultar ARNs ni intentar claim
        mock_backend.get_clip_status.assert_not_called()
        mock_supabase.table.return_value.update.assert_not_called()

    def test_finalizing_tour_timeout_calls_handle_failure(self):
        """Tour en 'finalizing' con timeout → _handle_failure es llamado."""
        from poller import _poll_tour

        # timeout_minutes_ahead negativo → ya venció
        tour = _make_tour(status="finalizing", timeout_minutes_ahead=-5)
        now = datetime.now(tz=timezone.utc)

        mock_supabase = MagicMock()

        with patch("poller._handle_failure") as mock_failure:
            result = _poll_tour(
                tour=tour,
                now=now,
                supabase=mock_supabase,
                s3=MagicMock(),
                backend=MagicMock(),
                webhook_svc=MagicMock(),
                metrics=MagicMock(),
                settings=MagicMock(),
                log_ctx={"tenant_id": "t", "tour_id": "tour-uuid"},
            )

        assert result == "failed"
        mock_failure.assert_called_once()
        call_kwargs = mock_failure.call_args.kwargs
        assert call_kwargs["reason"] == "timeout"
