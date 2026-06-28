"""
Tests del middleware de autenticación.
Cubre: AC-1 (auth requerida), AC-11 (403 con credenciales inválidas),
       throttle de last_used_at (M-1 fix).
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


@pytest.fixture
def client_with_mock_auth():
    """Cliente con Supabase mockeado para tests de auth."""
    from src.main import create_app
    app = create_app()
    return TestClient(app, raise_server_exceptions=False)


def test_missing_api_key_returns_401(client_with_mock_auth):
    """AC-1: sin credenciales → 401."""
    response = client_with_mock_auth.post("/tours", json={
        "idempotency_key": "test-key",
        "image_s3_keys": ["a", "b", "c", "d", "e"],
    })
    assert response.status_code == 401


def test_malformed_api_key_returns_401(client_with_mock_auth):
    """AC-1: formato incorrecto de API key → 401."""
    response = client_with_mock_auth.post(
        "/tours",
        headers={"X-API-Key": "malformed-no-colon"},
        json={
            "idempotency_key": "test-key",
            "image_s3_keys": ["a", "b", "c", "d", "e"],
        },
    )
    assert response.status_code == 401


def test_invalid_api_key_returns_403(client_with_mock_auth):
    """AC-11: credenciales inválidas → 403."""
    with patch("src.auth.middleware.get_supabase") as mock_get_supa:
        mock_supa = MagicMock()
        # Simular que key_id no existe
        mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.side_effect = Exception("not found")
        mock_get_supa.return_value = mock_supa

        response = client_with_mock_auth.post(
            "/tours",
            headers={"X-API-Key": "lumina_nonexistent:wrongsecret"},
            json={
                "idempotency_key": "test-key",
                "image_s3_keys": ["a", "b", "c", "d", "e"],
            },
        )
    assert response.status_code == 403


def test_health_endpoint_accessible_without_auth(client_with_mock_auth):
    """El health check no requiere API key."""
    with (
        patch("src.routers.health.get_supabase") as mock_supa,
        patch("boto3.client"),
    ):
        mock_supa.return_value.table.return_value.select.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
        response = client_with_mock_auth.get("/health")
    # 200 o 503 — cualquiera indica que el endpoint existe y no requiere auth
    assert response.status_code in (200, 503)


# ---------------------------------------------------------------------------
# Tests del throttle de last_used_at (M-1 fix)
# ---------------------------------------------------------------------------

class TestLastUsedAtThrottle:
    """
    Verifica la lógica de throttle en _maybe_update_last_used_at.
    Esta función evita un write a Supabase en cada request bajo Mangum/Lambda.
    """

    def test_updates_when_last_used_at_is_none(self):
        """Si last_used_at es NULL, siempre se escribe."""
        from src.auth.middleware import _maybe_update_last_used_at

        mock_supa = MagicMock()
        _maybe_update_last_used_at(
            supabase=mock_supa,
            row_id="key-id-123",
            current_last_used_at=None,
            key_id="lumina_test",
        )

        mock_supa.table.return_value.update.assert_called_once()

    def test_updates_when_last_used_is_older_than_throttle(self):
        """Si pasaron más de THROTTLE minutos, se escribe."""
        from src.auth.middleware import _maybe_update_last_used_at

        mock_supa = MagicMock()
        mock_settings = MagicMock()
        mock_settings.last_used_at_throttle_minutes = 5

        # last_used_at hace 10 minutos → debe actualizar
        old_ts = (datetime.now(tz=timezone.utc) - timedelta(minutes=10)).isoformat()

        with patch("src.auth.middleware.get_settings", return_value=mock_settings):
            _maybe_update_last_used_at(
                supabase=mock_supa,
                row_id="key-id-123",
                current_last_used_at=old_ts,
                key_id="lumina_test",
            )

        mock_supa.table.return_value.update.assert_called_once()

    def test_skips_update_when_last_used_is_recent(self):
        """Si el último write fue hace menos de THROTTLE minutos, no se escribe."""
        from src.auth.middleware import _maybe_update_last_used_at

        mock_supa = MagicMock()
        mock_settings = MagicMock()
        mock_settings.last_used_at_throttle_minutes = 5

        # last_used_at hace 1 minuto → debe saltar
        recent_ts = (datetime.now(tz=timezone.utc) - timedelta(minutes=1)).isoformat()

        with patch("src.auth.middleware.get_settings", return_value=mock_settings):
            _maybe_update_last_used_at(
                supabase=mock_supa,
                row_id="key-id-123",
                current_last_used_at=recent_ts,
                key_id="lumina_test",
            )

        mock_supa.table.return_value.update.assert_not_called()

    def test_updates_when_last_used_at_is_invalid_string(self):
        """Si el valor de last_used_at es inválido, se actualiza para corregirlo."""
        from src.auth.middleware import _maybe_update_last_used_at

        mock_supa = MagicMock()
        mock_settings = MagicMock()
        mock_settings.last_used_at_throttle_minutes = 5

        with patch("src.auth.middleware.get_settings", return_value=mock_settings):
            _maybe_update_last_used_at(
                supabase=mock_supa,
                row_id="key-id-123",
                current_last_used_at="not-a-valid-datetime",
                key_id="lumina_test",
            )

        mock_supa.table.return_value.update.assert_called_once()

    def test_supabase_error_does_not_raise(self):
        """Un error en el write de last_used_at no debe propagar la excepción."""
        from src.auth.middleware import _maybe_update_last_used_at

        mock_supa = MagicMock()
        mock_supa.table.return_value.update.return_value.eq.return_value.execute.side_effect = Exception(
            "Connection error"
        )

        # No debe lanzar excepción
        _maybe_update_last_used_at(
            supabase=mock_supa,
            row_id="key-id-123",
            current_last_used_at=None,  # → intentará escribir
            key_id="lumina_test",
        )
