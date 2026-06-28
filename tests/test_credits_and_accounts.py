"""
Tests de créditos, cuentas y aislamiento multi-tenant.
Cubre: AC-12 (asignación), AC-11 (aislamiento), AC-13 (ledger append-only).

Patrón de mock: _supabase_context parchea create_client + cache_clear.
"""

import uuid
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


TENANT_ID = str(uuid.uuid4())
ACCOUNT_ID = str(uuid.uuid4())
EXTERNAL_ID = "cliente-orkezto-001"


@contextmanager
def _supabase_context(mock_supa):
    from src.db import supabase_client
    with patch("src.db.supabase_client.create_client", return_value=mock_supa):
        supabase_client.get_supabase.cache_clear()
        yield mock_supa
    supabase_client.get_supabase.cache_clear()


def _make_app_with_tenant(tenant_id=None):
    from src.main import create_app
    from src.auth.middleware import validate_tenant_api_key, AuthenticatedTenant
    app = create_app()
    tid = tenant_id or TENANT_ID
    tenant = AuthenticatedTenant(id=tid, slug="propital", name="Test")
    app.dependency_overrides[validate_tenant_api_key] = lambda: tenant
    return app


def _account_row():
    return {
        "id": ACCOUNT_ID, "tenant_id": TENANT_ID,
        "external_id": EXTERNAL_ID, "name": "Test Account",
        "created_at": "2026-01-01T00:00:00+00:00",
    }


# ---------------------------------------------------------------------------
# AC-12: asignación de créditos vía servicio
# ---------------------------------------------------------------------------

def test_post_credits_calls_assign_credits_rpc():
    """AC-12: assign_credits llama al RPC con los parámetros correctos."""
    from src.services.credit_service import CreditService

    mock_supa = MagicMock()
    mock_supa.rpc.return_value.execute.return_value = MagicMock(data=5)
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"available": 5, "reserved": 0, "total_consumed": 2}
    )

    with _supabase_context(mock_supa):
        svc = CreditService()
        new_available = svc.assign_credits(
            account_id=ACCOUNT_ID,
            tenant_id=TENANT_ID,
            delta=3,
            reason="assigned",
        )

    assert new_available == 5
    mock_supa.rpc.assert_called_once_with(
        "assign_credits",
        {
            "p_account_id": ACCOUNT_ID,
            "p_tenant_id": TENANT_ID,
            "p_tour_id": None,
            "p_delta": 3,
            "p_reason": "assigned",
        },
    )


def test_assign_credits_endpoint_returns_updated_balance():
    """AC-12: POST /accounts/{id}/credits → 200 con saldo actualizado."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()

    def _table(name):
        chain = MagicMock()
        if name == "accounts":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=_account_row())
        elif name == "credit_balances":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
                data={"available": 4, "reserved": 0, "total_consumed": 1}
            )
        return chain

    mock_supa.table.side_effect = _table
    mock_supa.rpc.return_value.execute.return_value = MagicMock(data=4)

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            f"/accounts/{EXTERNAL_ID}/credits",
            json={"delta": 3, "reason": "test-assignment"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["available"] == 4
    assert "account_id" in body


def test_get_credits_endpoint_returns_balance():
    """AC-12: GET /accounts/{id}/credits → saldo disponible."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()

    def _table(name):
        chain = MagicMock()
        if name == "accounts":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=_account_row())
        elif name == "credit_balances":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
                data={"available": 7, "reserved": 0, "total_consumed": 0}
            )
        return chain

    mock_supa.table.side_effect = _table

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get(f"/accounts/{EXTERNAL_ID}/credits")

    assert response.status_code == 200
    assert response.json()["available"] == 7


# ---------------------------------------------------------------------------
# AC-11: aislamiento en cuentas
# ---------------------------------------------------------------------------

def test_get_credits_for_account_of_other_tenant_returns_404():
    """AC-11: GET créditos de cuenta de otro tenant → 404."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()

    def _table(name):
        chain = MagicMock()
        if name == "accounts":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)
        return chain

    mock_supa.table.side_effect = _table

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/accounts/cuenta-ajena/credits")

    assert response.status_code == 404


def test_post_credits_for_account_of_other_tenant_returns_404():
    """AC-11: POST créditos a cuenta de otro tenant → 404."""
    app = _make_app_with_tenant()
    mock_supa = MagicMock()

    def _table(name):
        chain = MagicMock()
        if name == "accounts":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)
        return chain

    mock_supa.table.side_effect = _table

    with _supabase_context(mock_supa):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/accounts/cuenta-ajena/credits",
            json={"delta": 5, "reason": "hack"},
        )

    assert response.status_code == 404


def test_get_account_filters_by_tenant_id():
    """AC-11: get_account filtra por tenant_id (aislamiento)."""
    from src.services.credit_service import CreditService

    mock_supa = MagicMock()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=_account_row())

    with _supabase_context(mock_supa):
        svc = CreditService()
        account = svc.get_account(tenant_id=TENANT_ID, external_id=EXTERNAL_ID)

    assert account is not None
    # Verificar que se usaron dos filtros .eq()
    first_eq = mock_supa.table.return_value.select.return_value.eq
    first_eq.assert_called_once()
    first_eq.return_value.eq.assert_called_once()


# ---------------------------------------------------------------------------
# AC-13: ledger append-only (webhook_deliveries)
# ---------------------------------------------------------------------------

def test_webhook_log_delivery_inserts_into_webhook_deliveries():
    """AC-13: log_delivery hace INSERT append-only en webhook_deliveries."""
    from src.services.webhook_service import WebhookService

    mock_supa = MagicMock()
    mock_supa.table.return_value.insert.return_value.execute.return_value = MagicMock()

    with _supabase_context(mock_supa):
        svc = WebhookService()
        svc.log_delivery(
            tenant_id=TENANT_ID,
            tour_id=str(uuid.uuid4()),
            attempt=1,
            status="success",
            http_status=200,
            response_body='{"ok": true}',
        )

    mock_supa.table.assert_called_with("webhook_deliveries")
    mock_supa.table.return_value.insert.assert_called_once()
    mock_supa.table.return_value.update.assert_not_called()


def test_webhook_log_delivery_truncates_long_response_body():
    """AC-13: response_body > 2000 chars se trunca a 2000."""
    from src.services.webhook_service import WebhookService

    mock_supa = MagicMock()
    mock_supa.table.return_value.insert.return_value.execute.return_value = MagicMock()

    with _supabase_context(mock_supa):
        svc = WebhookService()
        svc.log_delivery(
            tenant_id=TENANT_ID,
            tour_id=str(uuid.uuid4()),
            attempt=1,
            status="failed",
            http_status=500,
            response_body="x" * 3000,
        )

    inserted_data = mock_supa.table.return_value.insert.call_args.args[0]
    assert len(inserted_data["response_body"]) <= 2000
