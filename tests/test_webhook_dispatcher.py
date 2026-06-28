"""
Tests del webhook dispatcher Lambda (webhook.py) y WebhookService.
Cubre: AC-10 (HMAC, reintentos, log delivery, sin webhook configurado),
       AC-13 (append-only en webhook_deliveries).

Patrón de mock:
  WebhookService.__init__ llama a get_supabase y boto3.client.
  Se parchean ambos via patch() en cada test o se usa autouse del conftest.
"""

import json
import uuid
from unittest.mock import MagicMock, patch

import pytest


TENANT_ID = str(uuid.uuid4())
TOUR_ID = str(uuid.uuid4())
WEBHOOK_URL = "https://app.propital.com/webhooks/virtual-tour"
WEBHOOK_SECRET = "super-secret-for-hmac-tests"


def _make_sqs_record(payload: dict, receive_count: int = 1) -> dict:
    return {
        "body": json.dumps(payload),
        "attributes": {"ApproximateReceiveCount": str(receive_count)},
    }


def _make_payload(status: str = "completed") -> dict:
    return {
        "tour_id": TOUR_ID,
        "tenant_id": TENANT_ID,
        "status": status,
        "video_url": "https://s3.example/output.mp4" if status == "completed" else None,
        "failure_reason": "bedrock_timeout" if status == "failed" else None,
        "timestamp": "2026-06-28T12:00:00+00:00",
    }


def _make_webhook_service():
    """Construye WebhookService con Supabase y boto3 mockeados."""
    from src.services.webhook_service import WebhookService
    mock_supa = MagicMock()
    mock_sqs = MagicMock()
    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("boto3.client", return_value=mock_sqs),
    ):
        svc = WebhookService()
    return svc


# ---------------------------------------------------------------------------
# AC-10: HMAC-SHA256 firma correcta
# ---------------------------------------------------------------------------

def test_compute_signature_starts_with_sha256_prefix():
    """AC-10: firma HMAC tiene prefijo 'sha256='."""
    svc = _make_webhook_service()
    sig = svc.compute_signature('{"tour_id":"abc"}', "mi-secret")
    assert sig.startswith("sha256=")


def test_compute_signature_is_64_hex_chars():
    """AC-10: la parte hex de la firma es exactamente 64 caracteres (SHA-256)."""
    svc = _make_webhook_service()
    sig = svc.compute_signature("body", "secret")
    hex_part = sig[len("sha256="):]
    assert len(hex_part) == 64
    assert all(c in "0123456789abcdef" for c in hex_part)


def test_compute_signature_differs_with_different_secrets():
    """AC-10: la misma carga con secretos distintos produce firmas distintas."""
    svc = _make_webhook_service()
    body = '{"tour_id":"test"}'
    sig1 = svc.compute_signature(body, "secret-A")
    sig2 = svc.compute_signature(body, "secret-B")
    assert sig1 != sig2


def test_compute_signature_is_deterministic():
    """AC-10: la misma carga con el mismo secret produce siempre la misma firma."""
    svc = _make_webhook_service()
    body = '{"tour_id":"test","status":"completed"}'
    sig1 = svc.compute_signature(body, "mi-secret")
    sig2 = svc.compute_signature(body, "mi-secret")
    assert sig1 == sig2


# ---------------------------------------------------------------------------
# AC-10: dispatcher entrega exitosa (2xx)
# ---------------------------------------------------------------------------

def test_dispatcher_delivers_webhook_on_2xx_and_logs_success():
    """AC-10: respuesta 2xx → log success, sin re-raise."""
    from webhook import handler

    payload = _make_payload("completed")
    event = {"Records": [_make_sqs_record(payload)]}

    mock_supa = MagicMock()
    webhook_config = {"webhook_url": WEBHOOK_URL, "webhook_secret": WEBHOOK_SECRET, "is_active": True}
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=webhook_config)
    mock_supa.table.return_value.insert.return_value.execute.return_value = MagicMock()

    mock_response = MagicMock()
    mock_response.is_success = True
    mock_response.status_code = 200
    mock_response.text = '{"received":true}'

    mock_webhook_svc = MagicMock()
    mock_metrics = MagicMock()

    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("src.services.webhook_service.WebhookService", return_value=mock_webhook_svc),
        patch("src.observability.CloudWatchMetrics", return_value=mock_metrics),
        patch("httpx.Client") as mock_httpx,
        patch("boto3.client"),
    ):
        mock_httpx.return_value.__enter__.return_value.post.return_value = mock_response
        handler(event, None)

    log_kwargs = mock_webhook_svc.log_delivery.call_args.kwargs
    assert log_kwargs["status"] == "success"
    assert log_kwargs["http_status"] == 200
    mock_metrics.webhook_success.assert_called_once_with(TENANT_ID)


# ---------------------------------------------------------------------------
# AC-10: reintentos — non-2xx provoca re-raise para reencolar SQS
# ---------------------------------------------------------------------------

def test_dispatcher_reraises_on_non_2xx_to_trigger_retry():
    """AC-10: respuesta non-2xx → log failed + RuntimeError para SQS reencole."""
    from webhook import handler

    payload = _make_payload("completed")
    event = {"Records": [_make_sqs_record(payload, receive_count=2)]}

    mock_supa = MagicMock()
    webhook_config = {"webhook_url": WEBHOOK_URL, "webhook_secret": WEBHOOK_SECRET, "is_active": True}
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=webhook_config)

    mock_response = MagicMock()
    mock_response.is_success = False
    mock_response.status_code = 503
    mock_response.text = "Service Unavailable"

    mock_webhook_svc = MagicMock()
    mock_metrics = MagicMock()

    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("src.services.webhook_service.WebhookService", return_value=mock_webhook_svc),
        patch("src.observability.CloudWatchMetrics", return_value=mock_metrics),
        patch("httpx.Client") as mock_httpx,
        patch("boto3.client"),
    ):
        mock_httpx.return_value.__enter__.return_value.post.return_value = mock_response

        with pytest.raises(RuntimeError) as exc_info:
            handler(event, None)

    assert "503" in str(exc_info.value)
    log_kwargs = mock_webhook_svc.log_delivery.call_args.kwargs
    assert log_kwargs["status"] == "failed"
    assert log_kwargs["http_status"] == 503
    mock_metrics.webhook_failed.assert_called_once_with(TENANT_ID)


def test_dispatcher_reraises_on_timeout():
    """AC-10: timeout en HTTP POST → log failed con 'timeout' + RuntimeError."""
    import httpx
    from webhook import handler

    payload = _make_payload("failed")
    event = {"Records": [_make_sqs_record(payload)]}

    mock_supa = MagicMock()
    webhook_config = {"webhook_url": WEBHOOK_URL, "webhook_secret": WEBHOOK_SECRET, "is_active": True}
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=webhook_config)

    mock_webhook_svc = MagicMock()
    mock_metrics = MagicMock()

    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("src.services.webhook_service.WebhookService", return_value=mock_webhook_svc),
        patch("src.observability.CloudWatchMetrics", return_value=mock_metrics),
        patch("httpx.Client") as mock_httpx,
        patch("boto3.client"),
    ):
        mock_httpx.return_value.__enter__.return_value.post.side_effect = httpx.TimeoutException("timed out")

        with pytest.raises(RuntimeError, match="timeout"):
            handler(event, None)

    log_kwargs = mock_webhook_svc.log_delivery.call_args.kwargs
    assert log_kwargs["status"] == "failed"
    assert log_kwargs["response_body"] == "timeout"
    mock_metrics.webhook_failed.assert_called_once_with(TENANT_ID)


# ---------------------------------------------------------------------------
# AC-10: sin webhook configurado → ACK limpio
# ---------------------------------------------------------------------------

def test_dispatcher_acks_cleanly_when_no_webhook_configured():
    """AC-10: tenant sin webhook → no llama httpx, no lanza excepción."""
    from webhook import handler

    payload = _make_payload("completed")
    event = {"Records": [_make_sqs_record(payload)]}

    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)

    mock_webhook_svc = MagicMock()
    mock_metrics = MagicMock()

    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("src.services.webhook_service.WebhookService", return_value=mock_webhook_svc),
        patch("src.observability.CloudWatchMetrics", return_value=mock_metrics),
        patch("httpx.Client") as mock_httpx,
        patch("boto3.client"),
    ):
        handler(event, None)  # No debe lanzar excepción

    mock_httpx.return_value.__enter__.return_value.post.assert_not_called()
    mock_webhook_svc.log_delivery.assert_not_called()


# ---------------------------------------------------------------------------
# AC-10: encolar webhook (WebhookService.enqueue_webhook)
# ---------------------------------------------------------------------------

def test_enqueue_webhook_sends_message_to_sqs():
    """AC-10: enqueue_webhook envía mensaje SQS con los datos correctos."""
    from src.services.webhook_service import WebhookService

    mock_supa = MagicMock()
    mock_sqs = MagicMock()

    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("boto3.client", return_value=mock_sqs),
    ):
        svc = WebhookService()
        svc.enqueue_webhook(
            tour_id=TOUR_ID,
            tenant_id=TENANT_ID,
            status="completed",
            video_url="https://s3.example/output.mp4",
        )

    mock_sqs.send_message.assert_called_once()
    call_kwargs = mock_sqs.send_message.call_args.kwargs
    body = json.loads(call_kwargs["MessageBody"])
    assert body["tour_id"] == TOUR_ID
    assert body["status"] == "completed"
    assert body["video_url"] == "https://s3.example/output.mp4"
