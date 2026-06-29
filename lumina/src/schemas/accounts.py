"""
Schemas Pydantic v2 para endpoints de accounts y créditos.
Satisface: AC-12 (asignación de créditos), AC-9 (consulta de saldo).
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AccountCreateRequest(BaseModel):
    """Body de POST /accounts."""

    external_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="ID externo (p.ej. ID del cliente en la app consumidora)",
    )
    name: str | None = Field(default=None, max_length=255)


class AccountResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    external_id: str
    name: str | None
    created_at: datetime


class CreditAssignRequest(BaseModel):
    """Body de POST /accounts/{external_id}/credits (AC-12)."""

    delta: int = Field(..., gt=0, description="Créditos a agregar (debe ser > 0)")
    reason: str = Field(default="assigned", max_length=64)


class CreditBalanceResponse(BaseModel):
    """Respuesta de GET /accounts/{external_id}/credits."""

    account_id: UUID
    external_id: str
    available: int
    reserved: int
    total_consumed: int
    new_available: int | None = None  # presente solo en la respuesta de asignación
