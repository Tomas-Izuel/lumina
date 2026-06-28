"""
Cliente Supabase compartido por todos los módulos.
Usa el service role key (bypassa RLS) — el aislamiento multi-tenant
se garantiza en la capa de aplicación (tenant_id en cada query) y
como segunda línea en las RLS policies (AC-11).
"""

import logging
from functools import lru_cache

from supabase import Client, create_client

from src.config.settings import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """
    Retorna el cliente Supabase con service role.
    Cacheado a nivel de proceso para reutilizar la conexión
    y aprovechar PgBouncer de Supabase (sin VPC overhead).
    """
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    logger.info("Cliente Supabase inicializado", extra={"url": settings.supabase_url})
    return client
