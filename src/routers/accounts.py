"""
Router de cuentas y créditos.
Satisface: AC-12 (asignación de créditos), AC-11 (aislamiento por tenant).

B-4: POST /accounts, POST /accounts/{id}/credits, GET /accounts/{id}/credits.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from src.auth.middleware import AuthenticatedTenant, validate_tenant_api_key
from src.schemas.accounts import (
    AccountCreateRequest,
    AccountResponse,
    CreditAssignRequest,
    CreditBalanceResponse,
)
from src.services.credit_service import CreditService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post(
    "",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crea o recupera una cuenta dentro del tenant",
)
def create_account(
    body: AccountCreateRequest,
    tenant: AuthenticatedTenant = Depends(validate_tenant_api_key),
) -> AccountResponse:
    """
    Crea o retorna la cuenta identificada por external_id dentro del tenant.
    UNIQUE(tenant_id, external_id) garantiza idempotencia.
    AC-11: cuentas aisladas por tenant.
    """
    service = CreditService()
    account = service.get_or_create_account(
        tenant_id=tenant.id,
        external_id=body.external_id,
        name=body.name,
    )
    return AccountResponse(**account)


@router.post(
    "/{external_id}/credits",
    response_model=CreditBalanceResponse,
    summary="Asigna créditos a una cuenta (AC-12)",
)
def assign_credits(
    external_id: str,
    body: CreditAssignRequest,
    tenant: AuthenticatedTenant = Depends(validate_tenant_api_key),
) -> CreditBalanceResponse:
    """
    Agrega créditos a la cuenta indicada por external_id.
    - AC-12: saldo se refleja inmediatamente en solicitudes posteriores.
    - AC-11: la cuenta debe pertenecer al tenant autenticado.
    - AC-13: registra entrada en credit_ledger.
    """
    service = CreditService()

    # Verificar que la cuenta existe y pertenece al tenant (AC-11)
    account = service.get_account(tenant_id=tenant.id, external_id=external_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta '{external_id}' no encontrada para este tenant",
        )

    new_available = service.assign_credits(
        account_id=account["id"],
        tenant_id=tenant.id,
        delta=body.delta,
        reason=body.reason,
    )

    logger.info(
        "Créditos asignados",
        extra={
            "service": "virtual-tour-service",
            "component": "api",
            "action": "credits_assigned",
            "tenant_id": tenant.id,
            "account_id": account["id"],
            "delta": body.delta,
            "new_available": new_available,
        },
    )

    # Obtener balance completo para la respuesta
    balance = service.get_balance(account_id=account["id"], tenant_id=tenant.id)

    return CreditBalanceResponse(
        account_id=account["id"],
        external_id=external_id,
        available=balance["available"],
        reserved=balance.get("reserved", 0),
        total_consumed=balance.get("total_consumed", 0),
        new_available=new_available,
    )


@router.get(
    "/{external_id}/credits",
    response_model=CreditBalanceResponse,
    summary="Consulta el saldo de créditos de una cuenta",
)
def get_credits(
    external_id: str,
    tenant: AuthenticatedTenant = Depends(validate_tenant_api_key),
) -> CreditBalanceResponse:
    """
    Retorna el saldo de créditos (available, reserved, total_consumed).
    AC-11: solo accesible si la cuenta pertenece al tenant autenticado.
    """
    service = CreditService()

    account = service.get_account(tenant_id=tenant.id, external_id=external_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta '{external_id}' no encontrada para este tenant",
        )

    balance = service.get_balance(account_id=account["id"], tenant_id=tenant.id)

    return CreditBalanceResponse(
        account_id=account["id"],
        external_id=external_id,
        available=balance["available"],
        reserved=balance.get("reserved", 0),
        total_consumed=balance.get("total_consumed", 0),
    )
