"""
Tests del endpoint GET /tours/{id} y TourService.get_tour.
Cubre: AC-9 (estado coherente + regeneración URL), AC-11 (aislamiento tenant).

Patrón de mock: parchea create_client + cache_clear via _supabase_context.
"""

import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


TENANT_ID = str(uuid.uuid4())
TOUR_ID = str(uuid.uuid4())
FIVE_IMAGES = [f"img_{i}.jpg" for i in range(5)]


def _make_tour_row(status="accepted", video_s3_key=None, video_url=None,
                   video_expires_at=None, failure_reason=None, credit_consumed=False):
    now = datetime.now(tz=timezone.utc).isoformat()
    return {
        "id": TOUR_ID,
        "tenant_id": TENANT_ID,
        "account_id": None,
        "status": status,
        "idempotency_key": "key-001",
        "image_s3_keys": FIVE_IMAGES,
        "clip_prompts": None,
        "bedrock_invocation_arns": None,
        "clip_s3_keys": None,
        "video_s3_key": video_s3_key,
        "video_url": video_url,
        "video_expires_at": video_expires_at,
        "failure_reason": failure_reason,
        "credit_consumed": credit_consumed,
        "accepted_at": now,
        "started_at": None,
        "completed_at": None,
        "timeout_at": (datetime.now(tz=timezone.utc) + timedelta(minutes=25)).isoformat(),
        "bedrock_cost_usd": None,
    }


@contextmanager
def _supabase_context(mock_supa):
    from src.db import supabase_client
    with patch("src.db.supabase_client.create_client", return_value=mock_supa):
        supabase_client.get_supabase.cache_clear()
        yield mock_supa
    supabase_client.get_supabase.cache_clear()


def _make_app_with_tenant():
    from src.main import create_app
    from src.auth.middleware import validate_tenant_api_key, AuthenticatedTenant
    app = create_app()
    tenant = AuthenticatedTenant(id=TENANT_ID, slug="propital", name="Propital Test")
    app.dependency_overrides[validate_tenant_api_key] = lambda: tenant
    return app


# ---------------------------------------------------------------------------
# AC-9: estado coherente en cada transición
# ---------------------------------------------------------------------------

def test_get_tour_returns_accepted_status():
    """AC-9: tour en 'accepted' → body con status='accepted' y sin video_url."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()
    tour_row = _make_tour_row(status="accepted")
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=tour_row)

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get(f"/tours/{TOUR_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["tour_id"] == TOUR_ID
    assert body["video_url"] is None


def test_get_tour_failed_has_failure_reason():
    """AC-9: tour fallido → status='failed' con failure_reason no nulo."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()
    tour_row = _make_tour_row(status="failed", failure_reason="bedrock_clip_failure: timeout")
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=tour_row)

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get(f"/tours/{TOUR_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "failed"
    assert body["failure_reason"] is not None


def test_get_tour_completed_with_valid_url_not_refreshed():
    """AC-9: URL vigente en tour completado → sin regenerar (sin update en BD)."""
    from src.services.tour_service import TourService

    future_expiry = (datetime.now(tz=timezone.utc) + timedelta(hours=23)).isoformat()
    tour_row = _make_tour_row(
        status="completed",
        video_s3_key="tours/tenant/tour/output.mp4",
        video_url="https://s3.presigned.example/output.mp4",
        video_expires_at=future_expiry,
        credit_consumed=True,
    )

    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=tour_row)

    with _supabase_context(mock_supa):
        svc = TourService()
        tour = svc.get_tour(TOUR_ID, TENANT_ID)

    assert tour is not None
    assert tour["video_url"] == "https://s3.presigned.example/output.mp4"
    mock_supa.table.return_value.update.assert_not_called()


def test_get_tour_completed_regenerates_expired_url():
    """AC-9: video_url vencida → se regenera la presigned URL."""
    from src.services.tour_service import TourService

    past_expiry = (datetime.now(tz=timezone.utc) - timedelta(hours=1)).isoformat()
    tour_row = _make_tour_row(
        status="completed",
        video_s3_key="tours/tenant/tour/output.mp4",
        video_url="https://s3.presigned.example/old-url",
        video_expires_at=past_expiry,
        credit_consumed=True,
    )

    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=tour_row)
    mock_supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    new_url = "https://s3.presigned.example/new-url"

    with _supabase_context(mock_supa):
        with patch("src.services.s3_service.S3Service") as mock_s3_cls:
            mock_s3 = MagicMock()
            mock_s3.generate_video_presigned_url.return_value = new_url
            mock_s3_cls.return_value = mock_s3

            svc = TourService()
            tour = svc.get_tour(TOUR_ID, TENANT_ID)

    assert tour["video_url"] == new_url
    mock_s3.generate_video_presigned_url.assert_called_once()


def test_get_tour_completed_with_no_expires_at_triggers_refresh():
    """AC-9: video_expires_at ausente en tour completed → regenera URL."""
    from src.services.tour_service import TourService

    tour_row = _make_tour_row(
        status="completed",
        video_s3_key="tours/tenant/tour/output.mp4",
        video_url=None,
        video_expires_at=None,
        credit_consumed=True,
    )

    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=tour_row)
    mock_supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    with _supabase_context(mock_supa):
        with patch("src.services.s3_service.S3Service") as mock_s3_cls:
            mock_s3 = MagicMock()
            mock_s3.generate_video_presigned_url.return_value = "https://s3.new"
            mock_s3_cls.return_value = mock_s3

            svc = TourService()
            tour = svc.get_tour(TOUR_ID, TENANT_ID)

    mock_s3.generate_video_presigned_url.assert_called_once()
    assert tour["video_url"] == "https://s3.new"


# ---------------------------------------------------------------------------
# AC-11: aislamiento multi-tenant en GET
# ---------------------------------------------------------------------------

def test_get_tour_returns_404_for_different_tenant():
    """AC-11: GET tour de otro tenant → 404."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get(f"/tours/{TOUR_ID}")

    assert response.status_code == 404


def test_get_tour_query_filters_by_both_id_and_tenant_id():
    """AC-11: la query siempre aplica filtros por id Y tenant_id (doble eq)."""
    from src.services.tour_service import TourService

    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)

    with _supabase_context(mock_supa):
        svc = TourService()
        svc.get_tour(TOUR_ID, TENANT_ID)

    first_eq = mock_supa.table.return_value.select.return_value.eq
    first_eq.assert_called_once()
    first_eq.return_value.eq.assert_called_once()
