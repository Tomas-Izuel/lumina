"""
Servicio de tours: lógica de creación, consulta e idempotencia.
Satisface: AC-1, AC-2, AC-4, AC-7, AC-8, AC-9, AC-11.

Capa de negocio entre los routers y Supabase.
No hace llamadas HTTP directas — solo accede a BD y SQS.
"""

import json
import logging
from datetime import datetime, timezone
from uuid import UUID

import boto3
from botocore.exceptions import ClientError
from postgrest.exceptions import APIError

from src.config.settings import get_settings
from src.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class TourService:
    def __init__(self) -> None:
        settings = get_settings()
        self._settings = settings
        self._supabase = get_supabase()
        self._sqs = boto3.client("sqs", region_name=settings.aws_region)

    # -------------------------------------------------------------------------
    # Creación de tour (B-3)
    # -------------------------------------------------------------------------

    def create_tour(
        self,
        tenant_id: str,
        idempotency_key: str,
        image_s3_keys: list[str],
        account_id: str | None,
        clip_prompts: list[str] | None,
        metadata: dict | None,
    ) -> dict:
        """
        Crea un tour o retorna el existente si la clave de idempotencia ya fue usada.
        Flujo:
          1. Verificar idempotencia (UNIQUE tenant_id + idempotency_key)
          2. Verificar cuenta del tenant (AC-11)
          3. Verificar crédito disponible si account_id presente (AC-4)
          4. INSERT tour status='accepted'
          5. Encolar en SQS FIFO
          6. Retornar tour_id + status

        AC-7: segunda solicitud con misma idempotency_key retorna el tour existente.
        AC-8: account_id=None → on-demand, sin lógica de crédito.
        """
        # 1. Idempotencia: buscar tour existente
        existing = self._get_tour_by_idempotency(tenant_id, idempotency_key)
        if existing:
            logger.info(
                "Tour idempotente retornado",
                extra={"tenant_id": tenant_id, "tour_id": existing["id"]},
            )
            return {"tour": existing, "is_duplicate": True}

        # 2. Si account_id presente → verificar que pertenece al tenant (AC-11)
        resolved_account_id: str | None = None
        if account_id:
            resolved_account_id = self._resolve_account(tenant_id, account_id)

        # 3. Verificar crédito disponible (early check, AC-4)
        if resolved_account_id:
            self._assert_credit_available(resolved_account_id, tenant_id)

        # 4. INSERT tour
        timeout_at = self._compute_timeout()
        tour_data = {
            "tenant_id": tenant_id,
            "account_id": resolved_account_id,
            "idempotency_key": idempotency_key,
            "status": "accepted",
            "image_s3_keys": image_s3_keys,
            "clip_prompts": clip_prompts,
            "timeout_at": timeout_at,
        }

        try:
            result = self._supabase.table("tours").insert(tour_data).execute()
            tour = result.data[0]
        except Exception as exc:
            # Puede ser violación UNIQUE si hay race condition — retornar existente
            existing = self._get_tour_by_idempotency(tenant_id, idempotency_key)
            if existing:
                return {"tour": existing, "is_duplicate": True}
            raise RuntimeError(f"Error al crear tour: {exc}") from exc

        tour_id = tour["id"]
        logger.info(
            "Tour creado",
            extra={"tenant_id": tenant_id, "tour_id": tour_id},
        )

        # 5. Encolar en SQS FIFO
        try:
            self._enqueue_tour_job(
                tour_id=tour_id,
                tenant_id=tenant_id,
                account_id=resolved_account_id,
                image_s3_keys=image_s3_keys,
                idempotency_key=idempotency_key,
            )
        except Exception as exc:
            # Si SQS falla después de persistir → marcar como failed (AC-1 consistency)
            logger.error(
                "Error encolando tour — marcando como failed",
                extra={"tour_id": tour_id, "error": str(exc)},
            )
            self._supabase.table("tours").update(
                {"status": "failed", "failure_reason": "sqs_enqueue_failed"}
            ).eq("id", tour_id).execute()
            raise RuntimeError("Error al encolar el trabajo de generación") from exc

        return {"tour": tour, "is_duplicate": False}

    # -------------------------------------------------------------------------
    # Consulta de tour (B-4, AC-9)
    # -------------------------------------------------------------------------

    def get_tour(self, tour_id: str, tenant_id: str) -> dict | None:
        """
        Retorna el tour si pertenece al tenant.
        Si video_url vencida y video_s3_key existe → regenera presigned URL.
        AC-11: retorna None si el tour no pertenece al tenant.
        """
        result = (
            self._supabase.table("tours")
            .select("*")
            .eq("id", tour_id)
            .eq("tenant_id", tenant_id)  # AC-11: filtro explícito por tenant
            .single()
            .execute()
        )

        tour = result.data
        if not tour:
            return None

        # Regenerar presigned URL si vencida y el tour está completed (AC-9)
        if (
            tour.get("status") == "completed"
            and tour.get("video_s3_key")
            and not self._is_video_url_valid(tour)
        ):
            tour = self._refresh_video_url(tour)

        return tour

    # -------------------------------------------------------------------------
    # Helpers internos
    # -------------------------------------------------------------------------

    def _get_tour_by_idempotency(
        self, tenant_id: str, idempotency_key: str
    ) -> dict | None:
        try:
            result = (
                self._supabase.table("tours")
                .select("*")
                .eq("tenant_id", tenant_id)
                .eq("idempotency_key", idempotency_key)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            return None

    def _resolve_account(self, tenant_id: str, external_id: str) -> str:
        """
        Resuelve el UUID interno de la cuenta a partir del external_id.
        Valida que la cuenta pertenece al tenant (AC-11).
        """
        try:
            result = (
                self._supabase.table("accounts")
                .select("id")
                .eq("tenant_id", tenant_id)
                .eq("external_id", external_id)
                .single()
                .execute()
            )
            account = result.data
        except Exception:
            account = None

        if not account:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cuenta '{external_id}' no encontrada para este tenant",
            )
        return account["id"]

    def _assert_credit_available(self, account_id: str, tenant_id: str) -> None:
        """Verifica que hay al menos 1 crédito disponible (AC-4)."""
        try:
            result = (
                self._supabase.table("credit_balances")
                .select("available")
                .eq("account_id", account_id)
                .eq("tenant_id", tenant_id)
                .single()
                .execute()
            )
            balance = result.data
        except Exception:
            balance = None

        available = balance.get("available", 0) if balance else 0
        if available < 1:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Saldo de créditos insuficiente. Asigna créditos a la cuenta.",
            )

    def _compute_timeout(self) -> str:
        """Computa timeout_at como ISO8601 para Supabase."""
        from datetime import timedelta
        now = datetime.now(tz=timezone.utc)
        delta = timedelta(minutes=self._settings.tour_generation_timeout_minutes)
        return (now + delta).isoformat()

    def _enqueue_tour_job(
        self,
        tour_id: str,
        tenant_id: str,
        account_id: str | None,
        image_s3_keys: list[str],
        idempotency_key: str,
    ) -> None:
        """Encola el job en SQS FIFO con MessageDeduplicationId = idempotency_key (AC-7)."""
        message_body = json.dumps(
            {
                "tour_id": tour_id,
                "tenant_id": tenant_id,
                "account_id": account_id,
                "image_s3_keys": image_s3_keys,
            }
        )
        self._sqs.send_message(
            QueueUrl=self._settings.tour_jobs_queue_url,
            MessageBody=message_body,
            MessageGroupId=tenant_id,
            MessageDeduplicationId=idempotency_key,
        )
        logger.info(
            "Tour encolado en SQS FIFO",
            extra={"tour_id": tour_id, "tenant_id": tenant_id},
        )

    def _is_video_url_valid(self, tour: dict) -> bool:
        """Verifica si la presigned URL aún es válida."""
        expires_at_str = tour.get("video_expires_at")
        if not expires_at_str:
            return False
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            return datetime.now(tz=timezone.utc) < expires_at
        except ValueError:
            return False

    def _refresh_video_url(self, tour: dict) -> dict:
        """Regenera presigned URL y actualiza el tour en BD."""
        from src.services.s3_service import S3Service
        from datetime import timedelta

        s3 = S3Service()
        expiry = self._settings.video_presigned_url_expiry_seconds
        new_url = s3.generate_video_presigned_url(tour["video_s3_key"], expiry)
        expires_at = (
            datetime.now(tz=timezone.utc) + timedelta(seconds=expiry)
        ).isoformat()

        self._supabase.table("tours").update(
            {"video_url": new_url, "video_expires_at": expires_at}
        ).eq("id", tour["id"]).execute()

        tour["video_url"] = new_url
        tour["video_expires_at"] = expires_at
        return tour
