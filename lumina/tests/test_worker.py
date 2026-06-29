"""
Tests del worker Lambda.
Cubre: AC-3 (validación HeadObject), AC-8 (on-demand sin crédito),
       idempotencia del worker.

Nota de corrección (tdd-test-generator):
  Los tests originales usaban `patch("worker.get_supabase", ...)` pero el worker
  importa get_supabase dentro del body del handler (lazy import). El parche correcto
  es en el módulo de origen: `src.db.supabase_client.get_supabase`.
  Este es el patrón correcto para lazy imports en handlers Lambda.
"""

import json
from unittest.mock import MagicMock, patch

import pytest


def _make_sqs_event(tour_id: str, tenant_id: str, account_id=None, image_s3_keys=None):
    return {
        "Records": [
            {
                "body": json.dumps({
                    "tour_id": tour_id,
                    "tenant_id": tenant_id,
                    "account_id": account_id,
                    "image_s3_keys": image_s3_keys or ["k1", "k2", "k3", "k4", "k5"],
                })
            }
        ]
    }


def _make_mock_supabase(tour_status="accepted", has_arns=False):
    """Construye un mock Supabase con datos mínimos para el worker."""
    mock_supa = MagicMock()
    tour_data = {
        "id": "tour-uuid",
        "tenant_id": "tenant-uuid",
        "account_id": None,
        "status": tour_status,
        "clip_prompts": None,
        "bedrock_invocation_arns": ["arn:existing"] if has_arns else None,
    }

    # Cadena: .table().select().eq().single().execute()
    select_chain = MagicMock()
    select_chain.execute.return_value = MagicMock(data=tour_data)
    mock_supa.table.return_value.select.return_value.eq.return_value.single.return_value = select_chain

    # update()
    mock_supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    return mock_supa


def test_worker_skips_if_already_has_arns():
    """Idempotencia: tour con ARNs ya persistidos → worker retorna sin reinvocar Bedrock.
    El tour tiene status='generating' Y bedrock_invocation_arns existentes.
    """
    from worker import handler

    # Tour en status 'generating' (no 'accepted') para activar el skip rápido de idempotencia
    mock_supa = _make_mock_supabase(tour_status="generating", has_arns=True)

    event = _make_sqs_event("tour-uuid", "tenant-uuid")

    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("src.config.settings.get_settings"),
        patch("src.services.s3_service.S3Service"),
        patch("src.services.video_backend.get_video_backend") as mock_backend_factory,
        patch("src.services.webhook_service.WebhookService"),
        patch("src.observability.CloudWatchMetrics"),
        patch("boto3.client"),
    ):
        mock_backend = MagicMock()
        mock_backend_factory.return_value = mock_backend

        handler(event, None)

        # No debe llamar start_clip
        mock_backend.start_clip.assert_not_called()


def test_worker_fails_tour_on_invalid_image():
    """AC-3: imagen inválida en S3 → tour=failed, webhook encolado."""
    from worker import handler

    event = _make_sqs_event("tour-uuid", "tenant-uuid")
    mock_supa = _make_mock_supabase(tour_status="accepted", has_arns=False)

    mock_s3 = MagicMock()
    mock_s3.validate_image_key.return_value = (False, "Imagen demasiado pequeña")

    mock_webhook = MagicMock()

    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("src.config.settings.get_settings"),
        patch("src.services.s3_service.S3Service", return_value=mock_s3),
        patch("src.services.video_backend.get_video_backend"),
        patch("src.services.webhook_service.WebhookService", return_value=mock_webhook),
        patch("src.observability.CloudWatchMetrics"),
        patch("boto3.client"),
    ):
        handler(event, None)

    # Debe encolar webhook de fallo
    mock_webhook.enqueue_webhook.assert_called_once()
    call_kwargs = mock_webhook.enqueue_webhook.call_args.kwargs
    assert call_kwargs["status"] == "failed"


def test_worker_on_demand_skips_credit_reservation():
    """AC-8: account_id=None → no llama reserve_credit RPC."""
    from worker import handler

    event = _make_sqs_event("tour-uuid", "tenant-uuid", account_id=None)
    mock_supa = _make_mock_supabase(tour_status="accepted", has_arns=False)

    # Todas las imágenes válidas
    mock_s3 = MagicMock()
    mock_s3.validate_image_key.return_value = (True, "")
    mock_s3.download_image_as_base64.return_value = "base64data"

    mock_backend = MagicMock()
    mock_backend.start_clip.return_value = MagicMock(invocation_arn="arn:new:clip")

    mock_settings = MagicMock()
    mock_settings.tour_generation_timeout_minutes = 25

    with (
        patch("src.db.supabase_client.get_supabase", return_value=mock_supa),
        patch("src.config.settings.get_settings", return_value=mock_settings),
        patch("src.services.s3_service.S3Service", return_value=mock_s3),
        patch("src.services.video_backend.get_video_backend", return_value=mock_backend),
        patch("src.services.webhook_service.WebhookService"),
        patch("src.observability.CloudWatchMetrics"),
        patch("boto3.client"),
    ):
        handler(event, None)

    # rpc('reserve_credit') NO debe haberse llamado
    mock_supa.rpc.assert_not_called()
