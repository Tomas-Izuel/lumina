"""
Router de tours: POST /tours, GET /tours/{id}, POST /tours/upload-urls.
Satisface: AC-1, AC-2, AC-4, AC-7, AC-8, AC-9, AC-11.

B-3: POST /tours — acepta el tour, valida, encola en SQS FIFO.
B-4: GET /tours/{id} — consulta estado con regeneración de presigned URL.
B-5: POST /tours/upload-urls — genera presigned S3 PUT URLs.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.auth.middleware import AuthenticatedTenant, validate_tenant_api_key
from src.config.settings import get_settings
from src.schemas.tours import (
    TourAcceptedResponse,
    TourCreateRequest,
    TourStatusResponse,
    UploadUrlsRequest,
    UploadUrlsResponse,
)
from src.services.s3_service import S3Service
from src.services.tour_service import TourService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tours", tags=["Tours"])


@router.post(
    "/upload-urls",
    response_model=UploadUrlsResponse,
    summary="Genera presigned URLs para subir imágenes a S3",
)
def generate_upload_urls(
    body: UploadUrlsRequest,
    tenant: AuthenticatedTenant = Depends(validate_tenant_api_key),
) -> UploadUrlsResponse:
    """
    Genera N presigned PUT URLs para que el tenant suba imágenes directamente a S3.
    Solo acepta image/jpeg e image/png (AC-3 primera capa: content-type enforced en S3).
    Los tenants deben subir las imágenes antes de llamar POST /tours.
    """
    if len(body.content_types) != body.file_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"content_types debe tener exactamente {body.file_count} elementos",
        )

    settings = get_settings()
    s3 = S3Service()
    urls = s3.generate_upload_presigned_urls(
        tenant_id=tenant.id,
        content_types=body.content_types,
        expiry_seconds=settings.presigned_url_expiry_seconds,
    )

    return UploadUrlsResponse(upload_urls=urls)


@router.post(
    "",
    response_model=TourAcceptedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Solicita la generación de un virtual tour",
)
def create_tour(
    body: TourCreateRequest,
    tenant: AuthenticatedTenant = Depends(validate_tenant_api_key),
) -> TourAcceptedResponse:
    """
    Acepta una solicitud de tour y encola el trabajo asíncronamente.

    - AC-1: retorna tour_id + status:accepted en < 1s.
    - AC-2: rechaza si len(image_s3_keys) < 5 (Pydantic valida).
    - AC-4: rechaza si account_id presente y sin créditos.
    - AC-7: retorna tour existente si idempotency_key ya fue usada.
    - AC-8: account_id=None → on-demand, sin lógica de crédito.
    - AC-11: account resuelto solo si pertenece al tenant.
    """
    settings = get_settings()

    # Validar número de clip_prompts si se proveyeron
    if body.clip_prompts is not None:
        expected = len(body.image_s3_keys) - 1
        if len(body.clip_prompts) != expected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"clip_prompts debe tener {expected} elementos "
                    f"(N-1 pares para {len(body.image_s3_keys)} imágenes)"
                ),
            )

    service = TourService()
    result = service.create_tour(
        tenant_id=tenant.id,
        idempotency_key=body.idempotency_key,
        image_s3_keys=body.image_s3_keys,
        account_id=body.account_id,
        clip_prompts=body.clip_prompts,
        metadata=body.metadata,
    )

    tour = result["tour"]
    is_duplicate = result["is_duplicate"]

    logger.info(
        "Tour aceptado",
        extra={
            "service": "lumina",
            "component": "api",
            "action": "tour_accepted",
            "tenant_id": tenant.id,
            "tour_id": tour["id"],
            "is_duplicate": is_duplicate,
        },
    )

    # Si es duplicado, retornar 200 con el estado actual
    from fastapi.responses import JSONResponse

    response = TourAcceptedResponse(
        tour_id=tour["id"],
        status=tour["status"],
        estimated_completion_minutes=settings.tour_generation_timeout_minutes,
    )

    if is_duplicate:
        return JSONResponse(content=response.model_dump(mode="json"), status_code=200)

    return response


@router.get(
    "/{tour_id}",
    response_model=TourStatusResponse,
    summary="Consulta el estado de un tour",
)
def get_tour(
    tour_id: UUID,
    tenant: AuthenticatedTenant = Depends(validate_tenant_api_key),
) -> TourStatusResponse:
    """
    Retorna el estado actual del tour.
    - AC-9: estado coherente + video_url (regenerada si vencida).
    - AC-11: 404 si el tour no pertenece al tenant.
    """
    service = TourService()
    tour = service.get_tour(str(tour_id), tenant.id)

    if not tour:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tour '{tour_id}' no encontrado",
        )

    return TourStatusResponse(
        tour_id=tour["id"],
        status=tour["status"],
        account_id=tour.get("account_id"),
        accepted_at=tour["accepted_at"],
        started_at=tour.get("started_at"),
        completed_at=tour.get("completed_at"),
        timeout_at=tour.get("timeout_at"),
        video_url=tour.get("video_url"),
        video_expires_at=tour.get("video_expires_at"),
        failure_reason=tour.get("failure_reason"),
        bedrock_cost_usd=tour.get("bedrock_cost_usd"),
        credit_consumed=tour.get("credit_consumed", False),
    )
