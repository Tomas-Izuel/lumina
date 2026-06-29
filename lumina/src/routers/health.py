"""
Endpoint de health check.
Satisface: prerequisito AC-1 (operaciones del servicio).
Verifica conectividad Supabase y credenciales AWS.
"""

import logging

import boto3
from fastapi import APIRouter

from src.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check() -> dict:
    """
    Verifica el estado del servicio.
    - Supabase: ping básico
    - AWS: verifica cliente STS (credenciales válidas)
    Retorna 200 si todo está OK, 503 si algún check falla.
    """
    checks: dict[str, str] = {}
    healthy = True

    # Check Supabase
    try:
        supabase = get_supabase()
        supabase.table("tenants").select("id").limit(1).execute()
        checks["supabase"] = "ok"
    except Exception as exc:
        checks["supabase"] = f"error: {exc}"
        healthy = False

    # Check AWS credentials
    try:
        sts = boto3.client("sts")
        sts.get_caller_identity()
        checks["aws"] = "ok"
    except Exception as exc:
        checks["aws"] = f"error: {exc}"
        healthy = False

    from fastapi import HTTPException
    if not healthy:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "checks": checks})

    return {"status": "healthy", "checks": checks}
