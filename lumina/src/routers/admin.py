"""
Router de administración.
Satisface: AC-1 (prerequisito: creación de tenants), AC-10 (configuración webhook).

B-9: POST /admin/tenants, POST /admin/tenants/{id}/webhooks, POST /admin/tenants/{id}/quotas.
Protegidos por X-Admin-Key (env var ADMIN_API_KEY).
"""

import logging
import secrets
import string
from datetime import datetime, timezone
from uuid import UUID

import bcrypt
from fastapi import APIRouter, Header, HTTPException, status

from src.auth.middleware import validate_admin_key
from src.db.supabase_client import get_supabase
from src.schemas.admin import (
    QuotaUpdateRequest,
    QuotaUpdateResponse,
    TenantCreateRequest,
    TenantCreateResponse,
    WebhookConfigRequest,
    WebhookConfigResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


def _generate_api_key() -> tuple[str, str, str]:
    """
    Genera key_id (legible, prefijado con 'lumina_') y secret (random 40 chars).
    Retorna (key_id, secret, bcrypt_hash_of_secret).
    El secret NO se almacena — solo el hash.
    """
    # key_id: legible, prefijado para identificar el servicio
    key_id = "lumina_" + secrets.token_urlsafe(16)

    # secret: 40 chars alfanuméricos + símbolos
    alphabet = string.ascii_letters + string.digits
    secret = "".join(secrets.choice(alphabet) for _ in range(40))

    # Hash con bcrypt (costo 12)
    key_hash = bcrypt.hashpw(secret.encode(), bcrypt.gensalt(rounds=12)).decode()

    return key_id, secret, key_hash


@router.post(
    "/tenants",
    response_model=TenantCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crea un nuevo tenant y su primera API key",
)
def create_tenant(
    body: TenantCreateRequest,
    x_admin_key: str | None = Header(default=None),
) -> TenantCreateResponse:
    """
    Crea tenant + API key. El secret se retorna SOLO en este response.
    Almacena únicamente el bcrypt hash del secret — nunca el plaintext.
    AC-1 prerequisito: sin tenant activo no hay autenticación posible.
    """
    validate_admin_key(x_admin_key)

    supabase = get_supabase()

    # Crear tenant
    tenant_result = (
        supabase.table("tenants")
        .insert({"slug": body.slug, "name": body.name, "is_active": True})
        .execute()
    )
    tenant = tenant_result.data[0]
    tenant_id = tenant["id"]

    # Generar y persistir API key
    key_id, secret, key_hash = _generate_api_key()

    supabase.table("tenant_api_keys").insert(
        {
            "tenant_id": tenant_id,
            "key_id": key_id,
            "key_hash": key_hash,
            "is_active": True,
        }
    ).execute()

    logger.info(
        "Tenant creado",
        extra={
            "service": "lumina",
            "component": "api",
            "action": "tenant_created",
            "tenant_id": tenant_id,
            "slug": body.slug,
        },
    )

    return TenantCreateResponse(
        tenant_id=tenant_id,
        slug=tenant["slug"],
        name=tenant["name"],
        key_id=key_id,
        secret=secret,  # Solo aquí — no recuperable después
        created_at=tenant["created_at"],
    )


@router.post(
    "/tenants/{tenant_id}/webhooks",
    response_model=WebhookConfigResponse,
    summary="Configura el webhook de un tenant (AC-10)",
)
def configure_webhook(
    tenant_id: UUID,
    body: WebhookConfigRequest,
    x_admin_key: str | None = Header(default=None),
) -> WebhookConfigResponse:
    """
    Upsert del webhook del tenant. La URL y el secret se almacenan en
    tenant_webhooks. El dispatcher usa el secret para firmar HMAC-SHA256.
    AC-10: configuración necesaria para la notificación confiable.
    """
    validate_admin_key(x_admin_key)

    supabase = get_supabase()

    result = (
        supabase.table("tenant_webhooks")
        .upsert(
            {
                "tenant_id": str(tenant_id),
                "webhook_url": str(body.webhook_url),
                "webhook_secret": body.webhook_secret,
                "is_active": True,
            },
            on_conflict="tenant_id",
        )
        .execute()
    )

    row = result.data[0]
    logger.info(
        "Webhook configurado",
        extra={"tenant_id": str(tenant_id)},
    )

    return WebhookConfigResponse(
        tenant_id=tenant_id,
        webhook_url=row["webhook_url"],
        is_active=row["is_active"],
    )


@router.post(
    "/tenants/{tenant_id}/quotas",
    response_model=QuotaUpdateResponse,
    summary="Actualiza cuotas de un tenant",
)
def update_quotas(
    tenant_id: UUID,
    body: QuotaUpdateRequest,
    x_admin_key: str | None = Header(default=None),
) -> QuotaUpdateResponse:
    """
    Upsert de cuotas (max_tours_per_day / max_tours_per_month).
    Extensión para billing v2: controla el uso on-demand por tenant (AC-13).
    """
    validate_admin_key(x_admin_key)

    supabase = get_supabase()

    upsert_data: dict = {"tenant_id": str(tenant_id)}
    if body.max_tours_per_day is not None:
        upsert_data["max_tours_per_day"] = body.max_tours_per_day
    if body.max_tours_per_month is not None:
        upsert_data["max_tours_per_month"] = body.max_tours_per_month

    result = (
        supabase.table("tenant_quotas")
        .upsert(upsert_data, on_conflict="tenant_id")
        .execute()
    )

    row = result.data[0]
    return QuotaUpdateResponse(
        tenant_id=tenant_id,
        max_tours_per_day=row.get("max_tours_per_day"),
        max_tours_per_month=row.get("max_tours_per_month"),
    )
