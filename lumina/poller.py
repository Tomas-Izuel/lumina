"""
Entry point Lambda — Poller de finalización.
Handler: poller.handler
Runtime: Python 3.12, invocado por EventBridge Scheduler cada 60s.
Requiere Lambda layer ffmpeg (adjunto SOLO a esta Lambda).
Memory: 1024MB, Timeout: 300s.

Satisface: AC-5 (confirm/release atómica), AC-6 (idempotencia poller),
           AC-9 (presigned URL resultado), AC-13 (costo, métricas CW).

Claim atómico (M-2, migración 008):
  Antes del trabajo pesado (descarga + ffmpeg + subida), el Poller toma un
  claim atómico haciendo UPDATE tours SET status='finalizing' WHERE
  status='generating'. Si 0 filas son actualizadas, otra instancia ya tomó
  el claim y se omite el tour. Esto evita el doble procesamiento costoso.
"""

import json
import logging
import os
import tempfile
from datetime import datetime, timedelta, timezone
from typing import Any

from src.observability import configure_logging

configure_logging("poller")

logger = logging.getLogger(__name__)


def handler(event: dict[str, Any], context: Any) -> dict:
    """
    Invocado cada 60s por EventBridge Scheduler.
    Procesa hasta 50 tours en estado 'generating'.
    """
    from src.config.settings import get_settings
    from src.db.supabase_client import get_supabase
    from src.services.s3_service import S3Service
    from src.services.video_backend import ClipInvocationRef, get_video_backend
    from src.services.webhook_service import WebhookService
    from src.observability import CloudWatchMetrics

    settings = get_settings()
    supabase = get_supabase()
    s3 = S3Service()
    backend = get_video_backend()
    webhook_svc = WebhookService()
    metrics = CloudWatchMetrics()

    now = datetime.now(tz=timezone.utc)

    # Incluir 'finalizing': tours que otro Poller reclamó pero aún no confirmó.
    # Sirve para el timeout check — si llevan demasiado tiempo en 'finalizing',
    # los fallamos y liberamos el crédito.
    result = (
        supabase.table("tours")
        .select("*")
        .in_("status", ["generating", "finalizing"])
        .limit(50)
        .execute()
    )
    tours = result.data or []
    logger.info("Poller ejecutado", extra={"tours_in_flight": len(tours)})

    processed: dict[str, int] = {"completed": 0, "failed": 0, "in_progress": 0}

    for tour in tours:
        tour_id: str = tour["id"]
        tenant_id: str = tour["tenant_id"]
        log_ctx = {"tenant_id": tenant_id, "tour_id": tour_id, "component": "poller"}

        try:
            outcome = _poll_tour(
                tour=tour, now=now, supabase=supabase, s3=s3, backend=backend,
                webhook_svc=webhook_svc, metrics=metrics, settings=settings, log_ctx=log_ctx,
            )
            processed[outcome] = processed.get(outcome, 0) + 1
        except Exception as exc:
            logger.exception("Error en poller para tour", extra=log_ctx | {"error": str(exc)})

    logger.info("Poller completado", extra={"results": processed})
    return {"processed": processed}


def _poll_tour(
    *, tour: dict, now: datetime, supabase, s3, backend,
    webhook_svc, metrics, settings, log_ctx: dict,
) -> str:
    """Evalúa el estado de un tour. Retorna 'completed', 'failed' o 'in_progress'."""
    from src.services.video_backend import ClipInvocationRef

    tour_id = tour["id"]
    tenant_id = tour["tenant_id"]
    account_id = tour.get("account_id")
    invocation_arns: list[str] = tour.get("bedrock_invocation_arns") or []
    current_status: str = tour.get("status", "generating")

    # Timeout check — aplica a 'generating' y 'finalizing' (migración 008)
    timeout_str = tour.get("timeout_at")
    if timeout_str:
        timeout_at = datetime.fromisoformat(timeout_str)
        if timeout_at.tzinfo is None:
            timeout_at = timeout_at.replace(tzinfo=timezone.utc)
        if now >= timeout_at:
            logger.warning("Tour timeout", extra=log_ctx | {"status": current_status})
            _handle_failure(
                supabase=supabase, webhook_svc=webhook_svc, metrics=metrics,
                tour_id=tour_id, tenant_id=tenant_id, account_id=account_id,
                reason="timeout", log_ctx=log_ctx,
            )
            return "failed"

    if not invocation_arns:
        logger.warning("Tour sin ARNs — estado inconsistente", extra=log_ctx)
        return "in_progress"

    # Tours en 'finalizing': otra instancia del Poller ya hizo el claim y está
    # procesando. No intentar re-reclamar — solo reportar in_progress.
    if current_status == "finalizing":
        logger.info("Tour en finalizing — claim tomado por otra instancia", extra=log_ctx)
        return "in_progress"

    # Consultar estado de cada ARN (solo para tours en 'generating')
    clip_statuses = []
    for arn in invocation_arns:
        ref = ClipInvocationRef(invocation_arn=arn, backend="luma_ray2")
        clip_statuses.append(backend.get_clip_status(ref))

    # Algún clip fallido
    failed = [cs for cs in clip_statuses if cs.state == "Failed"]
    if failed:
        reason = f"bedrock_clip_failure: {failed[0].failure_message}"
        logger.error("Clip fallido", extra=log_ctx | {"reason": reason})
        _handle_failure(
            supabase=supabase, webhook_svc=webhook_svc, metrics=metrics,
            tour_id=tour_id, tenant_id=tenant_id, account_id=account_id,
            reason=reason, log_ctx=log_ctx,
        )
        return "failed"

    # Clips aún en progreso
    if any(cs.state == "InProgress" for cs in clip_statuses):
        logger.info("Clips en progreso — próximo check 60s", extra=log_ctx)
        return "in_progress"

    # Todos completados — tomar claim atómico ANTES del trabajo pesado (M-2).
    # UPDATE WHERE status='generating' → si 0 filas actualizadas, otra instancia
    # del Poller reclamó el tour entre el SELECT y este punto. Saltear.
    claim_result = (
        supabase.table("tours")
        .update({"status": "finalizing"})
        .eq("id", tour_id)
        .eq("status", "generating")
        .execute()
    )
    claimed_rows = claim_result.data or []
    if not claimed_rows:
        logger.info(
            "Claim fallido — tour reclamado por otra instancia del Poller",
            extra=log_ctx,
        )
        return "in_progress"

    logger.info("Claim atómico exitoso — procesando tour", extra=log_ctx)
    _handle_completion(
        tour=tour, clip_statuses=clip_statuses, supabase=supabase,
        s3=s3, webhook_svc=webhook_svc, metrics=metrics, settings=settings, log_ctx=log_ctx,
    )
    return "completed"


def _handle_completion(
    *, tour: dict, clip_statuses: list, supabase, s3, webhook_svc, metrics, settings, log_ctx: dict,
) -> None:
    """
    Descarga clips, concatena con ffmpeg, sube video final,
    confirma crédito atómicamente y encola webhook de éxito.
    AC-5, AC-6, AC-9, AC-13.
    """
    from src.services.ffmpeg_service import concat_clips

    tour_id = tour["id"]
    tenant_id = tour["tenant_id"]
    account_id = tour.get("account_id")
    clip_s3_keys = [cs.output_s3_key for cs in clip_statuses if cs.output_s3_key]
    num_clips = len(clip_s3_keys)

    with tempfile.TemporaryDirectory(dir="/tmp") as tmpdir:
        local_paths = []
        for i, s3_key in enumerate(clip_s3_keys):
            local = os.path.join(tmpdir, f"clip_{i:03d}.mp4")
            s3.download_clip_to_tmp(s3_key, local)
            local_paths.append(local)

        output_path = os.path.join(tmpdir, "output.mp4")
        concat_clips(local_paths, output_path, settings.clip_duration_secs)

        video_s3_key = f"tours/{tenant_id}/{tour_id}/output.mp4"
        s3.upload_final_video(output_path, video_s3_key)

    cost_usd = num_clips * settings.clip_duration_secs * settings.bedrock_price_per_second

    # confirm_credit_consumption — atómica, idempotente (AC-5, AC-6)
    try:
        supabase.rpc(
            "confirm_credit_consumption",
            {"p_tour_id": tour_id, "p_account_id": account_id,
             "p_tenant_id": tenant_id, "p_video_s3_key": video_s3_key},
        ).execute()
    except Exception as exc:
        # Tolera ambos strings: 'tour_not_in_finalizing' (post-migración 008, estado normal)
        # y 'tour_not_in_generating' (pre-migración 008, despliegue mixto).
        # En ambos casos el tour ya fue confirmado por otra instancia → warning, no error.
        _IDEMPOTENCY_MARKERS = ("tour_not_in_finalizing", "tour_not_in_generating")
        if any(marker in str(exc) for marker in _IDEMPOTENCY_MARKERS):
            logger.warning("Tour ya confirmado — idempotencia", extra=log_ctx | {"error": str(exc)})
            return
        raise

    # Campos no críticos fuera de TX
    supabase.table("tours").update(
        {"bedrock_cost_usd": cost_usd, "clip_s3_keys": clip_s3_keys}
    ).eq("id", tour_id).execute()

    # Presigned URL 24h
    expiry = settings.video_presigned_url_expiry_seconds
    video_url = s3.generate_video_presigned_url(video_s3_key, expiry)
    expires_at = (datetime.now(tz=timezone.utc) + timedelta(seconds=expiry)).isoformat()
    supabase.table("tours").update(
        {"video_url": video_url, "video_expires_at": expires_at}
    ).eq("id", tour_id).execute()

    webhook_svc.enqueue_webhook(
        tour_id=tour_id, tenant_id=tenant_id, status="completed", video_url=video_url,
    )
    metrics.tour_completed(tenant_id, cost_usd)
    logger.info(
        "Tour completado",
        extra=log_ctx | {"action": "generation_completed", "bedrock_cost_usd": cost_usd},
    )


def _handle_failure(
    *, supabase, webhook_svc, metrics, tour_id: str, tenant_id: str,
    account_id: str | None, reason: str, log_ctx: dict,
) -> None:
    """Libera crédito atómicamente y encola webhook de fallo. AC-5, AC-6."""
    try:
        supabase.rpc(
            "release_credit_reservation",
            {"p_tour_id": tour_id, "p_account_id": account_id,
             "p_tenant_id": tenant_id, "p_failure_reason": reason},
        ).execute()
    except Exception as exc:
        exc_str = str(exc)
        if "no_reserved_credit_to_release" in exc_str:
            logger.warning("Sin crédito reservado para liberar", extra=log_ctx | {"error": exc_str})
        else:
            logger.error("Error liberando crédito", extra=log_ctx | {"error": exc_str})
            raise

    webhook_svc.enqueue_webhook(
        tour_id=tour_id, tenant_id=tenant_id, status="failed", failure_reason=reason,
    )
    metrics.tour_failed(tenant_id)
