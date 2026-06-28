"""
Servicio de webhook: firma HMAC-SHA256 y encolado.
Satisface: AC-10 (notificación confiable), AC-13 (log en webhook_deliveries).

El payload se encola en SQS Standard; el dispatcher (webhook.py) lo procesa
con reintentos y DLQ.
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

import boto3

from src.config.settings import get_settings
from src.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class WebhookService:
    def __init__(self) -> None:
        settings = get_settings()
        self._settings = settings
        self._supabase = get_supabase()
        self._sqs = boto3.client("sqs", region_name=settings.aws_region)

    def enqueue_webhook(
        self,
        tour_id: str,
        tenant_id: str,
        status: str,
        video_url: str | None = None,
        failure_reason: str | None = None,
    ) -> None:
        """
        Encola el payload de notificación en SQS Standard.
        El dispatcher lo leerá, firmará con HMAC y hará POST al tenant.
        """
        payload = {
            "tour_id": tour_id,
            "tenant_id": tenant_id,
            "status": status,
            "video_url": video_url,
            "failure_reason": failure_reason,
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        }

        self._sqs.send_message(
            QueueUrl=self._settings.webhook_queue_url,
            MessageBody=json.dumps(payload),
        )

        logger.info(
            "Webhook encolado",
            extra={"tour_id": tour_id, "tenant_id": tenant_id, "status": status},
        )

    def compute_signature(self, payload_body: str, secret: str) -> str:
        """
        Genera la firma HMAC-SHA256.
        Header que el dispatcher adjuntará: X-LUMINA-Signature: sha256=<hex>
        """
        mac = hmac.new(
            secret.encode("utf-8"),
            payload_body.encode("utf-8"),
            hashlib.sha256,
        )
        return f"sha256={mac.hexdigest()}"

    def log_delivery(
        self,
        tenant_id: str,
        tour_id: str,
        attempt: int,
        status: str,
        http_status: int | None,
        response_body: str | None,
    ) -> None:
        """
        Registra el intento de entrega en webhook_deliveries (append-only, AC-13).
        """
        self._supabase.table("webhook_deliveries").insert(
            {
                "tenant_id": tenant_id,
                "tour_id": tour_id,
                "attempt": attempt,
                "status": status,
                "http_status": http_status,
                "response_body": response_body[:2000] if response_body else None,
            }
        ).execute()
