"""
Middleware de autenticación por API key de tenant.
Satisface: AC-1 (auth requerida), AC-11 (aislamiento multi-tenant).

Formato del header: X-API-Key: <key_id>:<secret>
La verificación es timing-safe: siempre ejecuta bcrypt.checkpw,
incluso si el key_id no existe, para evitar timing oracle attacks.
"""

import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone

import bcrypt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from src.config.settings import get_settings
from src.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# Header esperado
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Hash dummy para timing-safe comparison cuando el key_id no existe
_DUMMY_HASH = bcrypt.hashpw(b"dummy-secret-for-timing-safety", bcrypt.gensalt())


@dataclass(frozen=True)
class AuthenticatedTenant:
    """Contexto de tenant inyectado por la dependency."""

    id: str
    slug: str
    name: str


async def validate_tenant_api_key(
    raw_key: str | None = Security(_api_key_header),
) -> AuthenticatedTenant:
    """
    FastAPI Dependency que valida la API key del tenant.

    Flujo:
    1. Extrae key_id y secret del header X-API-Key: <key_id>:<secret>
    2. Busca en tenant_api_keys por key_id (is_active=true)
    3. Verifica bcrypt timing-safe (corre checkpw incluso si key_id no existe)
    4. Verifica tenant.is_active
    5. Actualiza last_used_at en background (no bloquea respuesta)
    6. Retorna AuthenticatedTenant
    """
    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-API-Key requerido. Formato: <key_id>:<secret>",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Parsear key_id:secret
    parts = raw_key.split(":", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de API key inválido. Esperado: <key_id>:<secret>",
        )

    key_id, secret = parts[0], parts[1]

    supabase = get_supabase()

    # Buscar la key en tenant_api_keys — tabla nombrada así (NO tenant_credentials)
    try:
        result = (
            supabase.table("tenant_api_keys")
            .select("id, key_hash, is_active, tenant_id, last_used_at, tenants(id, slug, name, is_active)")
            .eq("key_id", key_id)
            .eq("is_active", True)
            .single()
            .execute()
        )
        row = result.data
    except Exception:
        # key_id no encontrado — ejecutar checkpw igualmente (timing-safe)
        row = None

    if row is None:
        # Timing-safe: ejecutar checkpw con hash dummy para evitar timing oracle
        bcrypt.checkpw(secret.encode(), _DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Credenciales inválidas",
        )

    # Verificar el secret contra el hash almacenado (timing-safe)
    stored_hash: str = row["key_hash"]
    try:
        valid = bcrypt.checkpw(secret.encode(), stored_hash.encode())
    except Exception:
        valid = False

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Credenciales inválidas",
        )

    # Verificar que el tenant está activo
    tenant_data = row.get("tenants") or {}
    if not tenant_data.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant inactivo",
        )

    # Actualizar last_used_at con throttle para reducir writes a Supabase.
    # NOTA SOBRE MANGUM/LAMBDA: FastAPI BackgroundTasks ejecuta ANTES de enviar
    # la response HTTP bajo Mangum (modo síncrono), por lo que no hay ganancia
    # real en usar BackgroundTasks — el cliente igual espera. El throttle es la
    # solución correcta: escribimos solo si last_used_at es NULL o si pasaron
    # más de LAST_USED_AT_THROTTLE_MINUTES minutos desde la última escritura.
    _maybe_update_last_used_at(
        supabase=supabase,
        row_id=row["id"],
        current_last_used_at=row.get("last_used_at"),
        key_id=key_id,
    )

    logger.info(
        "Autenticación exitosa",
        extra={
            "tenant_id": tenant_data.get("id"),
            "tenant_slug": tenant_data.get("slug"),
        },
    )

    return AuthenticatedTenant(
        id=tenant_data["id"],
        slug=tenant_data["slug"],
        name=tenant_data["name"],
    )


def _maybe_update_last_used_at(
    *, supabase, row_id: str, current_last_used_at: str | None, key_id: str
) -> None:
    """
    Escribe last_used_at solo si es NULL o si pasaron más de
    LAST_USED_AT_THROTTLE_MINUTES desde la última escritura.

    Motivación: bajo Mangum+Lambda, FastAPI BackgroundTasks ejecuta en el mismo
    hilo síncrono antes de retornar la response — no hay concurrencia real. El
    throttle reduce los round-trips a Supabase sin perder información relevante.
    """
    settings = get_settings()
    throttle_minutes = settings.last_used_at_throttle_minutes

    should_update = False
    if current_last_used_at is None:
        should_update = True
    else:
        try:
            last_used = datetime.fromisoformat(current_last_used_at)
            if last_used.tzinfo is None:
                last_used = last_used.replace(tzinfo=timezone.utc)
            now = datetime.now(tz=timezone.utc)
            elapsed_minutes = (now - last_used).total_seconds() / 60
            should_update = elapsed_minutes >= throttle_minutes
        except (ValueError, TypeError):
            # Si el valor es inválido, escribir para corregirlo
            should_update = True

    if not should_update:
        return

    try:
        supabase.table("tenant_api_keys").update(
            {"last_used_at": datetime.now(tz=timezone.utc).isoformat()}
        ).eq("id", row_id).execute()
    except Exception as exc:
        # No crítico — no falla la request
        logger.warning(
            "No se pudo actualizar last_used_at",
            extra={"key_id": key_id, "error": str(exc)},
        )


def validate_admin_key(x_admin_key: str | None = None) -> None:
    """
    Dependency para endpoints /admin/*.
    Compara con ADMIN_API_KEY usando secrets.compare_digest (timing-safe).
    """
    settings = get_settings()
    if not x_admin_key or not secrets.compare_digest(x_admin_key, settings.admin_api_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="X-Admin-Key inválida o ausente",
        )
