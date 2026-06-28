"""
Tests del endpoint POST /tours.
Cubre: AC-1 (auth + respuesta inicial), AC-2 (rechazos tempranos),
       AC-4 (sin crédito), AC-7 (idempotencia), AC-8 (on-demand), AC-11.

Patrón de mock:
  Se parchea create_client (no get_supabase) y se limpia el lru_cache
  dentro del bloque patch para que cada test controle el mock de Supabase.
  Los fixtures autouse del conftest (mock_supabase, mock_boto3) garantizan
  que nunca se intentan conexiones reales.
"""

import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


TENANT_ID = str(uuid.uuid4())
TOUR_ID = str(uuid.uuid4())
ACCOUNT_ID = str(uuid.uuid4())
IDEMPOTENCY_KEY = "test-idempotency-key-001"
FIVE_IMAGES = [f"uploads/{TENANT_ID}/{TOUR_ID}/img_{i}.jpg" for i in range(5)]


def _make_tour_row(status="accepted", account_id=None, credit_consumed=False):
    now = datetime.now(tz=timezone.utc).isoformat()
    return {
        "id": TOUR_ID,
        "tenant_id": TENANT_ID,
        "account_id": account_id,
        "status": status,
        "idempotency_key": IDEMPOTENCY_KEY,
        "image_s3_keys": FIVE_IMAGES,
        "clip_prompts": None,
        "bedrock_invocation_arns": None,
        "clip_s3_keys": None,
        "video_s3_key": None,
        "video_url": None,
        "video_expires_at": None,
        "failure_reason": None,
        "credit_consumed": credit_consumed,
        "accepted_at": now,
        "started_at": None,
        "completed_at": None,
        "timeout_at": (datetime.now(tz=timezone.utc) + timedelta(minutes=25)).isoformat(),
        "bedrock_cost_usd": None,
    }


@contextmanager
def _supabase_context(mock_supa):
    """
    Context manager que parchea create_client con mock_supa y limpia el
    lru_cache de get_supabase antes de la invocación para que el mock sea
    usado en lugar de la instancia cacheada.
    """
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
# AC-1: autenticación y respuesta inicial
# ---------------------------------------------------------------------------

def test_post_tours_returns_201_with_tour_id_and_accepted_status():
    """AC-1: tour aceptado → 201 con tour_id y status='accepted'."""
    app = _make_app_with_tenant()
    tour_row = _make_tour_row(status="accepted")
    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)
    mock_supa.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[tour_row])

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/tours",
            json={"idempotency_key": IDEMPOTENCY_KEY, "image_s3_keys": FIVE_IMAGES},
        )

    assert response.status_code == 201
    body = response.json()
    assert "tour_id" in body
    assert body["status"] == "accepted"


def test_post_tours_without_api_key_returns_401():
    """AC-1: sin header X-API-Key → 401."""
    from src.main import create_app
    app = create_app()
    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/tours",
        json={"idempotency_key": "k", "image_s3_keys": FIVE_IMAGES},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# AC-2: rechazo temprano por imágenes insuficientes
# ---------------------------------------------------------------------------

def test_post_tours_endpoint_rejects_fewer_than_5_images():
    """AC-2: 4 imágenes → 422 (validación Pydantic, sin consultar BD)."""
    app = _make_app_with_tenant()
    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/tours",
        json={"idempotency_key": "key", "image_s3_keys": ["a", "b", "c", "d"]},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# AC-4: sin crédito → rechazo sin iniciar generación
# ---------------------------------------------------------------------------

def test_post_tours_rejects_when_no_credits_available():
    """AC-4: cuenta sin créditos → 402."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()

    def _table(name):
        chain = MagicMock()
        if name == "tours":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)
        elif name == "accounts":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={"id": ACCOUNT_ID})
        elif name == "credit_balances":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={"available": 0})
        return chain

    mock_supa.table.side_effect = _table

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/tours",
            json={
                "idempotency_key": IDEMPOTENCY_KEY,
                "image_s3_keys": FIVE_IMAGES,
                "account_id": "external-account-001",
            },
        )

    assert response.status_code == 402
    detail = response.json()["detail"].lower()
    assert "crédito" in detail or "credit" in detail


# ---------------------------------------------------------------------------
# AC-7: idempotencia
# ---------------------------------------------------------------------------

def test_post_tours_returns_existing_tour_on_duplicate_key():
    """AC-7: segunda solicitud con misma idempotency_key → 200 con tour existente."""
    app = _make_app_with_tenant()
    existing_tour = _make_tour_row(status="accepted")
    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=existing_tour)

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/tours",
            json={"idempotency_key": IDEMPOTENCY_KEY, "image_s3_keys": FIVE_IMAGES},
        )

    assert response.status_code == 200
    assert response.json()["tour_id"] == TOUR_ID


def test_idempotent_request_does_not_deduct_credit():
    """AC-7: solicitud idempotente no descuenta crédito (rpc no llamado)."""
    from src.services.tour_service import TourService

    mock_supa = MagicMock()
    existing_tour = _make_tour_row(status="accepted", account_id=ACCOUNT_ID)
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=existing_tour)

    with _supabase_context(mock_supa):
        svc = TourService()
        result = svc.create_tour(
            tenant_id=TENANT_ID,
            idempotency_key=IDEMPOTENCY_KEY,
            image_s3_keys=FIVE_IMAGES,
            account_id="external-account",
            clip_prompts=None,
            metadata=None,
        )

    assert result["is_duplicate"] is True
    assert mock_supa.rpc.call_count == 0


# ---------------------------------------------------------------------------
# AC-8: tour on-demand sin crédito
# ---------------------------------------------------------------------------

def test_post_tours_on_demand_creates_tour_without_credit_check():
    """AC-8: account_id=None → tour creado sin consultar credit_balances."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()
    tour_row = _make_tour_row(status="accepted")

    def _table(name):
        chain = MagicMock()
        if name == "tours":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)
            chain.insert.return_value.execute.return_value = MagicMock(data=[tour_row])
        return chain

    mock_supa.table.side_effect = _table

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/tours",
            json={"idempotency_key": "on-demand-key", "image_s3_keys": FIVE_IMAGES},
        )

    assert response.status_code == 201
    credit_calls = [c for c in mock_supa.table.call_args_list if c.args and c.args[0] == "credit_balances"]
    assert len(credit_calls) == 0


# ---------------------------------------------------------------------------
# AC-11: aislamiento multi-tenant
# ---------------------------------------------------------------------------

def test_account_from_other_tenant_raises_404():
    """AC-11: account_id de otro tenant → HTTPException 404."""
    from src.services.tour_service import TourService
    from fastapi import HTTPException

    mock_supa = MagicMock()

    def _table(name):
        chain = MagicMock()
        if name == "tours":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)
        elif name == "accounts":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)
        return chain

    mock_supa.table.side_effect = _table

    with _supabase_context(mock_supa):
        svc = TourService()
        with pytest.raises(HTTPException) as exc_info:
            svc.create_tour(
                tenant_id=TENANT_ID,
                idempotency_key="key",
                image_s3_keys=FIVE_IMAGES,
                account_id="cuenta-de-otro-tenant",
                clip_prompts=None,
                metadata=None,
            )

    assert exc_info.value.status_code == 404
