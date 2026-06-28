"""
Schemas Pydantic v2 para los endpoints de tours.
Satisface: AC-1 (request/response), AC-2 (validación min imágenes),
           AC-7 (idempotency_key), AC-8 (account_id optional), AC-9 (GET response).
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class TourCreateRequest(BaseModel):
    """Body de POST /tours. Validado antes de cualquier operación de BD."""

    idempotency_key: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Clave única por tenant para evitar tours duplicados (AC-7)",
    )
    image_s3_keys: list[str] = Field(
        ...,
        min_length=5,  # AC-2: mínimo 5 imágenes
        max_length=11,  # máximo 11: 10 clips × 9s = 90s
        description="S3 keys en orden de recorrido (de 5 a 11 imágenes)",
    )
    account_id: str | None = Field(
        default=None,
        description="ID externo de cuenta. None = on-demand sin crédito (AC-8)",
    )
    clip_prompts: list[str] | None = Field(
        default=None,
        description="N-1 prompts de cámara. El worker los genera si no se proveen.",
    )
    metadata: dict[str, Any] | None = None

    @field_validator("image_s3_keys")
    @classmethod
    def validate_s3_keys(cls, v: list[str]) -> list[str]:
        for key in v:
            if not key or key.isspace():
                raise ValueError("Los s3_keys no pueden estar vacíos")
        return v

    @field_validator("clip_prompts")
    @classmethod
    def validate_clip_prompts_length(
        cls, v: list[str] | None, info: Any
    ) -> list[str] | None:
        if v is None:
            return v
        # Si se proveen prompts, deben ser N-1 (uno por par consecutivo)
        # La validación exacta se hace en el endpoint ya que depende de image_s3_keys
        return v


class UploadUrlsRequest(BaseModel):
    """Body de POST /tours/upload-urls."""

    file_count: int = Field(..., ge=5, le=11)
    content_types: list[str] = Field(..., min_length=1, max_length=11)

    @field_validator("content_types")
    @classmethod
    def validate_content_types(cls, v: list[str]) -> list[str]:
        allowed = {"image/jpeg", "image/png"}
        for ct in v:
            if ct not in allowed:
                raise ValueError(
                    f"Content-type '{ct}' no válido. Solo se aceptan: {allowed}"
                )
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class TourAcceptedResponse(BaseModel):
    """Respuesta de POST /tours (AC-1)."""

    tour_id: UUID
    status: str  # "accepted"
    estimated_completion_minutes: int = 20
    message: str = "Tour aceptado. Recibirás una notificación al completarse."


class TourStatusResponse(BaseModel):
    """Respuesta de GET /tours/{tour_id} (AC-9)."""

    tour_id: UUID
    status: str
    account_id: str | None
    accepted_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    timeout_at: datetime | None
    video_url: str | None
    video_expires_at: datetime | None
    failure_reason: str | None
    bedrock_cost_usd: float | None
    credit_consumed: bool


class UploadUrl(BaseModel):
    url: str
    s3_key: str
    expires_in_seconds: int


class UploadUrlsResponse(BaseModel):
    """Respuesta de POST /tours/upload-urls."""

    upload_urls: list[UploadUrl]
