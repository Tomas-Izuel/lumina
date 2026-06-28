"""
Fixtures compartidos para tests de lumina.

Patrón crítico para get_supabase (lru_cache):
  get_supabase() usa @lru_cache. Para mockear la BD en tests locales:
  1. El fixture 'mock_supabase' limpia el cache ANTES del test.
  2. Parchea 'create_client' para que devuelva un MagicMock.
  3. Limpia el cache de nuevo al terminar.

  Cada test puede obtener el mock del cliente via `mock_supabase.return_value`
  o parchear directamente `create_client` con su propio mock_supa.
"""

import os
from unittest.mock import MagicMock, patch

import pytest

# Setear env vars mínimas ANTES de importar cualquier módulo del servicio
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key")
os.environ.setdefault("AWS_REGION", "us-west-2")
os.environ.setdefault("S3_UPLOAD_BUCKET", "lumina-inputs-test")
os.environ.setdefault("S3_OUTPUT_BUCKET", "lumina-outputs-test")
os.environ.setdefault("TOUR_JOBS_QUEUE_URL", "https://sqs.us-west-2.amazonaws.com/123456789/test.fifo")
os.environ.setdefault("WEBHOOK_QUEUE_URL", "https://sqs.us-west-2.amazonaws.com/123456789/test-webhooks")
os.environ.setdefault("BEDROCK_REGION", "us-west-2")
os.environ.setdefault("BEDROCK_MODEL_ID", "luma.ray-v2:0")
os.environ.setdefault("ENVIRONMENT", "test")


@pytest.fixture(autouse=True)
def mock_supabase():
    """
    Fixture autouse que parchea create_client para que ningún test intente
    conectarse a Supabase real. El lru_cache se limpia antes y después.

    Tests que necesiten un mock_supa específico deben parchear
    'src.db.supabase_client.create_client' con su propio MagicMock dentro
    del bloque patch, asegurando que el cache esté vacío cuando se llame.

    Uso en tests:
        with patch("src.db.supabase_client.create_client", return_value=mi_mock_supa):
            from src.db.supabase_client import get_supabase
            get_supabase.cache_clear()
            # ... instanciar servicios / hacer requests
    """
    from src.db import supabase_client

    supabase_client.get_supabase.cache_clear()

    generic_mock = MagicMock()
    with patch("src.db.supabase_client.create_client", return_value=generic_mock):
        yield generic_mock

    supabase_client.get_supabase.cache_clear()


@pytest.fixture(autouse=True)
def mock_boto3():
    """Parchea boto3.client globalmente para evitar conexiones a AWS real."""
    with patch("boto3.client") as mock_client:
        yield mock_client


@pytest.fixture
def settings():
    from src.config.settings import get_settings
    get_settings.cache_clear()
    return get_settings()
