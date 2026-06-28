"""
Entry point Lambda — Worker SQS (generación de clips).
Handler: worker.handler
Runtime: Python 3.12, SQS FIFO consumer (batch_size=1).

Satisface: AC-3 (validación anti-alucinación HeadObject),
           AC-4 (reserva de crédito final), AC-5 (reserva atómica),
           AC-8 (on-demand sin crédito).

Flujo por mensaje:
  1. Deserializar evento SQS → job
  2. Recuperar tour; verificar status='accepted'
  3. Validar imágenes en S3 (HeadObject: tamaño > 10KB, JPEG/PNG)
  4. Si account_id: reservar crédito via reserve_credit() RPC
  5. Actualizar status='generating', started_at, timeout_at
  6. Generar N-1 prompts de cámara
  7. Lanzar N-1 invocaciones Luma Ray 2 (first+last frame)
  8. Persistir bedrock_invocation_arns[] en el tour

Idempotencia: si el tour ya tiene bedrock_invocation_arns → retornar sin reinvocar.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from src.observability import configure_logging

configure_logging("worker")

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Prompts de cámara generados automáticamente (N-1 elementos)
# ---------------------------------------------------------------------------

def _build_default_prompts(num_images: int) -> list[str]:
    """
    Genera N-1 prompts de cámara para N imágenes.
    Primer par: entrada al inmueble (dolly forward).
    Pares intermedios: transición entre habitaciones.
    Último par: revelación del espacio final.
    """
    n = num_images
    prompts = []
    for i in range(n - 1):
        if i == 0:
            prompts.append(
                "camera dolly forward entering the property, natural light, smooth motion"
            )
        elif i == n - 2:
            prompts.append(
                "camera gently reveals the final space, wide steady shot, warm light"
            )
        else:
            prompts.append(
                "camera moves forward through the space into the next room, "
                "warm interior light, smooth dolly"
            )
    return prompts


# ---------------------------------------------------------------------------
# Handler principal
# ---------------------------------------------------------------------------

def handler(event: dict[str, Any], context: Any) -> None:
    """
    Procesa mensajes SQS FIFO (batch_size=1).
    Re-raise en error → SQS reencola → DLQ tras maxReceiveCount=3.
    """
    from src.config.settings import get_settings
    from src.db.supabase_client import get_supabase
    from src.services.s3_service import S3Service
    from src.services.video_backend import get_video_backend
    from src.services.webhook_service import WebhookService
    from src.observability import CloudWatchMetrics

    settings = get_settings()
    supabase = get_supabase()
    s3 = S3Service()
    backend = get_video_backend()
    webhook_svc = WebhookService()
    metrics = CloudWatchMetrics()

    records = event.get("Records", [])
    logger.info("Worker invocado", extra={"record_count": len(records)})

    for record in records:
        body = json.loads(record["body"])
        tour_id: str = body["tour_id"]
        tenant_id: str = body["tenant_id"]
        account_id: str | None = body.get("account_id")
        image_s3_keys: list[str] = body["image_s3_keys"]

        log_ctx = {"tenant_id": tenant_id, "tour_id": tour_id, "component": "worker"}

        try:
            _process_tour_job(
                supabase=supabase,
                s3=s3,
                backend=backend,
                webhook_svc=webhook_svc,
                metrics=metrics,
                settings=settings,
                tour_id=tour_id,
                tenant_id=tenant_id,
                account_id=account_id,
                image_s3_keys=image_s3_keys,
                log_ctx=log_ctx,
            )
        except Exception as exc:
            logger.exception(
                "Error fatal en worker — SQS reencola",
                extra=log_ctx | {"error": str(exc)},
            )
            raise  # Re-raise para que SQS reencole


def _process_tour_job(
    *,
    supabase,
    s3,
    backend,
    webhook_svc,
    metrics,
    settings,
    tour_id: str,
    tenant_id: str,
    account_id: str | None,
    image_s3_keys: list[str],
    log_ctx: dict,
) -> None:
    """Lógica de procesamiento de un job de tour."""
    from src.services.s3_service import MIN_IMAGE_SIZE_BYTES

    # 1. Recuperar tour — verificar status='accepted'
    result = supabase.table("tours").select("*").eq("id", tour_id).single().execute()
    tour = result.data

    if not tour:
        logger.warning("Tour no encontrado", extra=log_ctx)
        return

    if tour["status"] != "accepted":
        logger.warning(
            "Tour ya procesado — idempotencia",
            extra=log_ctx | {"current_status": tour["status"]},
        )
        return

    # Idempotencia: si ya tiene ARNs → no reinvocar Bedrock
    if tour.get("bedrock_invocation_arns"):
        logger.warning(
            "Tour ya tiene ARNs — skipping Bedrock invocations",
            extra=log_ctx,
        )
        return

    # 2. Validación anti-alucinación (AC-3): HeadObject en cada imagen
    for s3_key in image_s3_keys:
        valid, reason = s3.validate_image_key(s3_key)
        if not valid:
            logger.error(
                "Imagen inválida en S3 — marcando tour como failed",
                extra=log_ctx | {"s3_key": s3_key, "reason": reason},
            )
            _fail_tour(supabase, webhook_svc, tour_id, tenant_id, account_id, reason)
            metrics.tour_failed(tenant_id)
            return

    # 3. Reservar crédito si hay account_id (AC-4 final check, AC-5)
    if account_id:
        try:
            supabase.rpc(
                "reserve_credit",
                {
                    "p_account_id": account_id,
                    "p_tenant_id": tenant_id,
                    "p_tour_id": tour_id,
                },
            ).execute()
        except Exception as exc:
            reason = f"insufficient_credits: {exc}"
            logger.warning(
                "Sin créditos — marcando tour como failed",
                extra=log_ctx | {"error": str(exc)},
            )
            _fail_tour(supabase, webhook_svc, tour_id, tenant_id, account_id=None, reason=reason)
            metrics.tour_failed(tenant_id)
            return

    # 4. Actualizar status → generating
    timeout_minutes = settings.tour_generation_timeout_minutes
    now = datetime.now(tz=timezone.utc)
    timeout_at = (now + timedelta(minutes=timeout_minutes)).isoformat()

    supabase.table("tours").update(
        {"status": "generating", "started_at": now.isoformat(), "timeout_at": timeout_at}
    ).eq("id", tour_id).execute()

    logger.info(
        "Generación iniciada",
        extra=log_ctx | {"action": "generation_started"},
    )

    # 5. Generar prompts de cámara (N-1)
    clip_prompts: list[str] = tour.get("clip_prompts") or _build_default_prompts(
        len(image_s3_keys)
    )
    # Persistir prompts para auditoría (AC-13)
    supabase.table("tours").update({"clip_prompts": clip_prompts}).eq(
        "id", tour_id
    ).execute()

    # 6. Lanzar N-1 invocaciones Luma Ray 2 (first+last frame)
    invocation_arns: list[str] = []

    for i in range(len(image_s3_keys) - 1):
        frame_start_b64 = s3.download_image_as_base64(image_s3_keys[i])
        frame_end_b64 = s3.download_image_as_base64(image_s3_keys[i + 1])

        output_prefix = f"tours/{tenant_id}/{tour_id}/clip_{i:03d}"
        prompt = clip_prompts[i]

        ref = backend.start_clip(
            frame_start_base64=frame_start_b64,
            frame_end_base64=frame_end_b64,
            prompt=prompt,
            output_s3_prefix=output_prefix,
            clip_index=i,
        )

        invocation_arns.append(ref.invocation_arn)
        logger.info(
            "Clip invocado",
            extra=log_ctx | {
                "clip_index": i,
                "invocation_arn": ref.invocation_arn,
                "action": "clip_invoked",
            },
        )

    # 7. Persistir N-1 ARNs en el tour
    supabase.table("tours").update(
        {"bedrock_invocation_arns": invocation_arns}
    ).eq("id", tour_id).execute()

    logger.info(
        "ARNs persistidos",
        extra=log_ctx | {"arn_count": len(invocation_arns), "action": "arns_persisted"},
    )


def _fail_tour(
    supabase,
    webhook_svc,
    tour_id: str,
    tenant_id: str,
    account_id: str | None,
    reason: str,
) -> None:
    """Marca el tour como failed y encola la notificación."""
    supabase.table("tours").update(
        {"status": "failed", "failure_reason": reason}
    ).eq("id", tour_id).execute()

    webhook_svc.enqueue_webhook(
        tour_id=tour_id,
        tenant_id=tenant_id,
        status="failed",
        failure_reason=reason,
    )
