"""
Entry point Lambda — Webhook Dispatcher.
Handler: webhook.handler
Runtime: Python 3.12, SQS Standard consumer.
Memory: 256MB, Timeout: 30s.

Satisface: AC-10 (notificación confiable HMAC-SHA256 + reintentos),
           AC-13 (log en webhook_deliveries).

Flujo por mensaje:
  1. Parsear payload SQS
  2. Cargar webhook_url + webhook_secret del tenant
  3. Firmar payload con HMAC-SHA256
  4. HTTP POST al webhook_url (timeout 10s)
  5. 2xx → log success → ACK
  6. non-2xx / timeout → log failed → RAISE → SQS reencola (backoff)
  7. DLQ tras maxReceiveCount=5
"""

import json
import logging
from typing import Any

import httpx

from src.observability import configure_logging

configure_logging("webhook")

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 10


def handler(event: dict[str, Any], context: Any) -> None:
    """
    Procesa mensajes de la cola SQS webhook-dispatch.
    Re-raise en error → SQS reencola con backoff exponencial → DLQ a los 5 intentos.
    """
    from src.db.supabase_client import get_supabase
    from src.services.webhook_service import WebhookService
    from src.observability import CloudWatchMetrics

    supabase = get_supabase()
    webhook_svc = WebhookService()
    metrics = CloudWatchMetrics()

    records = event.get("Records", [])
    logger.info("Webhook dispatcher invocado", extra={"record_count": len(records)})

    for record in records:
        payload = json.loads(record["body"])
        tour_id: str = payload.get("tour_id", "unknown")
        tenant_id: str = payload.get("tenant_id", "unknown")
        # SQS approximate receive count (para el log de intento)
        receive_count: int = int(
            record.get("attributes", {}).get("ApproximateReceiveCount", 1)
        )

        log_ctx = {
            "tenant_id": tenant_id,
            "tour_id": tour_id,
            "component": "webhook",
            "attempt": receive_count,
        }

        try:
            _dispatch_webhook(
                supabase=supabase,
                webhook_svc=webhook_svc,
                metrics=metrics,
                payload=payload,
                receive_count=receive_count,
                log_ctx=log_ctx,
            )
        except Exception as exc:
            logger.error(
                "Webhook fallido — SQS reencola",
                extra=log_ctx | {"error": str(exc)},
            )
            raise  # Re-raise para activar reintentos SQS


def _dispatch_webhook(
    *,
    supabase,
    webhook_svc,
    metrics,
    payload: dict,
    receive_count: int,
    log_ctx: dict,
) -> None:
    """Firma y entrega el webhook al tenant."""
    tenant_id = payload["tenant_id"]
    tour_id = payload["tour_id"]

    # 1. Cargar webhook del tenant
    try:
        result = (
            supabase.table("tenant_webhooks")
            .select("webhook_url, webhook_secret, is_active")
            .eq("tenant_id", tenant_id)
            .eq("is_active", True)
            .single()
            .execute()
        )
        webhook_config = result.data
    except Exception:
        webhook_config = None

    if not webhook_config:
        # No hay webhook configurado — ACK limpiamente (AC-10: no se pierde silenciosamente)
        logger.info(
            "Tenant sin webhook configurado — descartando",
            extra=log_ctx,
        )
        return

    webhook_url: str = webhook_config["webhook_url"]
    webhook_secret: str = webhook_config["webhook_secret"]

    # 2. Serializar payload para firma
    payload_body = json.dumps(payload, sort_keys=True)

    # 3. Firmar con HMAC-SHA256
    signature = webhook_svc.compute_signature(payload_body, webhook_secret)

    headers = {
        "Content-Type": "application/json",
        "X-LUMINA-Signature": signature,
        "X-LUMINA-Tour-Id": tour_id,
    }

    # 4. HTTP POST con timeout 10s
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.post(
                webhook_url,
                content=payload_body,
                headers=headers,
            )
    except httpx.TimeoutException:
        # Timeout → log + raise para reencolar
        webhook_svc.log_delivery(
            tenant_id=tenant_id,
            tour_id=tour_id,
            attempt=receive_count,
            status="failed",
            http_status=None,
            response_body="timeout",
        )
        metrics.webhook_failed(tenant_id)
        raise RuntimeError(f"Webhook timeout ({HTTP_TIMEOUT_SECONDS}s) para {webhook_url}")
    except Exception as exc:
        webhook_svc.log_delivery(
            tenant_id=tenant_id,
            tour_id=tour_id,
            attempt=receive_count,
            status="failed",
            http_status=None,
            response_body=str(exc),
        )
        metrics.webhook_failed(tenant_id)
        raise

    # 5. Evaluar respuesta
    if response.is_success:
        webhook_svc.log_delivery(
            tenant_id=tenant_id,
            tour_id=tour_id,
            attempt=receive_count,
            status="success",
            http_status=response.status_code,
            response_body=response.text,
        )
        metrics.webhook_success(tenant_id)
        logger.info(
            "Webhook entregado exitosamente",
            extra=log_ctx | {
                "action": "webhook_sent",
                "http_status": response.status_code,
                "webhook_url": webhook_url,
            },
        )
    else:
        # non-2xx → log + raise para reencolar (AC-10: reintentos)
        webhook_svc.log_delivery(
            tenant_id=tenant_id,
            tour_id=tour_id,
            attempt=receive_count,
            status="failed",
            http_status=response.status_code,
            response_body=response.text,
        )
        metrics.webhook_failed(tenant_id)
        raise RuntimeError(
            f"Webhook retornó HTTP {response.status_code} para {webhook_url}"
        )
