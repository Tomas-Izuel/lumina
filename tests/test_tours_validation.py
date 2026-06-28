"""
Tests de validación del endpoint POST /tours.
Cubre: AC-2 (mín imágenes), AC-7 (idempotencia schema), AC-8 (on-demand).
"""

import pytest
from src.schemas.tours import TourCreateRequest


def test_rejects_fewer_than_5_images():
    """AC-2: menos de 5 imágenes → ValidationError."""
    import pydantic
    with pytest.raises(pydantic.ValidationError) as exc_info:
        TourCreateRequest(
            idempotency_key="test",
            image_s3_keys=["img1.jpg", "img2.jpg", "img3.jpg"],
        )
    errors = exc_info.value.errors()
    assert any("image_s3_keys" in str(e["loc"]) for e in errors)


def test_accepts_5_images():
    """AC-2: exactamente 5 imágenes → válido."""
    req = TourCreateRequest(
        idempotency_key="test",
        image_s3_keys=["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"],
    )
    assert len(req.image_s3_keys) == 5


def test_rejects_more_than_11_images():
    """Límite de 11 imágenes (10 clips × 9s = 90s máx)."""
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        TourCreateRequest(
            idempotency_key="test",
            image_s3_keys=[f"img{i}.jpg" for i in range(12)],
        )


def test_account_id_optional_on_demand():
    """AC-8: account_id=None → request válida (on-demand)."""
    req = TourCreateRequest(
        idempotency_key="test",
        image_s3_keys=["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"],
        account_id=None,
    )
    assert req.account_id is None


def test_idempotency_key_max_length():
    """AC-7: idempotency_key > 128 chars → error."""
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        TourCreateRequest(
            idempotency_key="x" * 129,
            image_s3_keys=["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"],
        )


def test_upload_urls_request_validates_content_types():
    """AC-3 (primera capa): solo JPEG y PNG en presigned URLs."""
    import pydantic
    from src.schemas.tours import UploadUrlsRequest
    with pytest.raises(pydantic.ValidationError):
        UploadUrlsRequest(
            file_count=5,
            content_types=["image/gif", "image/jpeg", "image/jpeg", "image/png", "image/jpeg"],
        )


def test_upload_urls_request_accepts_valid_content_types():
    """AC-3: JPEG y PNG son content-types válidos (file_count mínimo = 5)."""
    from src.schemas.tours import UploadUrlsRequest
    req = UploadUrlsRequest(
        file_count=5,
        content_types=["image/jpeg", "image/png", "image/jpeg", "image/jpeg", "image/png"],
    )
    assert len(req.content_types) == 5
