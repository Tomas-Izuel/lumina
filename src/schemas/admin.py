"""
Schemas Pydantic v2 para endpoints de administración.
Satisface: AC-1 (prerequisito: creación de tenants), AC-10 (configuración webhook).
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class TenantCreateRequest(BaseModel):
    """Body de POST /admin/tenants."""

    slug: str = Field(
        ...,
        min_length=2,
        max_length=64,
        pattern=r"^[a-z0-9\-]+$",
        description="Identificador único legible (ej: propital, propirent)",
    )
    name: str = Field(..., min_length=1, max_length=255)


class TenantCreateResponse(BaseModel):
    """Retorna el secret solo en la creación — no se puede recuperar después."""

    tenant_id: UUID
    slug: str
    name: str
    key_id: str
    secret: str  # solo presente en este response; no se almacena en plaintext
    created_at: datetime


class WebhookConfigRequest(BaseModel):
    """Body de POST /admin/tenants/{id}/webhooks."""

    webhook_url: HttpUrl
    webhook_secret: str = Field(
        ...,
        min_length=16,
        description="Secret para firmar los payloads HMAC-SHA256",
    )


class WebhookConfigResponse(BaseModel):
    tenant_id: UUID
    webhook_url: str
    is_active: bool


class QuotaUpdateRequest(BaseModel):
    """Body de POST /admin/tenants/{id}/quotas."""

    max_tours_per_day: int | None = Field(default=None, ge=1, le=10_000)
    max_tours_per_month: int | None = Field(default=None, ge=1, le=100_000)


class QuotaUpdateResponse(BaseModel):
    tenant_id: UUID
    max_tours_per_day: int | None
    max_tours_per_month: int | None
