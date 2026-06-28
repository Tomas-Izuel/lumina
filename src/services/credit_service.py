"""
Servicio de créditos: asignación y consulta de saldo.
Satisface: AC-12 (asignación), AC-9 (consulta), AC-13 (ledger).

Llama a las funciones SQL atómicas vía Supabase RPC.
NO hace lógica de reserva/liberación directamente — eso es
responsabilidad de las funciones reserve_credit y release_credit_reservation.
"""

import logging

from src.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class CreditService:
    def __init__(self) -> None:
        self._supabase = get_supabase()

    def get_or_create_account(self, tenant_id: str, external_id: str, name: str | None) -> dict:
        """
        Crea o retorna la cuenta con el external_id dado dentro del tenant.
        UNIQUE(tenant_id, external_id) garantiza idempotencia.
        """
        # Intentar obtener existente
        try:
            result = (
                self._supabase.table("accounts")
                .select("*")
                .eq("tenant_id", tenant_id)
                .eq("external_id", external_id)
                .single()
                .execute()
            )
            if result.data:
                return result.data
        except Exception:
            pass

        # Crear si no existe
        result = (
            self._supabase.table("accounts")
            .insert({"tenant_id": tenant_id, "external_id": external_id, "name": name})
            .execute()
        )
        account = result.data[0]
        logger.info(
            "Cuenta creada",
            extra={"tenant_id": tenant_id, "account_id": account["id"]},
        )
        return account

    def get_account(self, tenant_id: str, external_id: str) -> dict | None:
        """Retorna la cuenta por external_id dentro del tenant (AC-11)."""
        try:
            result = (
                self._supabase.table("accounts")
                .select("*")
                .eq("tenant_id", tenant_id)
                .eq("external_id", external_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            return None

    def assign_credits(
        self,
        account_id: str,
        tenant_id: str,
        delta: int,
        reason: str = "assigned",
    ) -> int:
        """
        Asigna créditos a una cuenta vía la función SQL assign_credits (AC-12).
        Retorna el nuevo saldo disponible.
        """
        result = self._supabase.rpc(
            "assign_credits",
            {
                "p_account_id": account_id,
                "p_tenant_id": tenant_id,
                "p_tour_id": None,  # No asociado a un tour en la asignación
                "p_delta": delta,
                "p_reason": reason,
            },
        ).execute()

        new_available: int = result.data
        logger.info(
            "Créditos asignados",
            extra={
                "account_id": account_id,
                "tenant_id": tenant_id,
                "delta": delta,
                "new_available": new_available,
            },
        )
        return new_available

    def get_balance(self, account_id: str, tenant_id: str) -> dict:
        """Retorna el saldo de créditos de una cuenta."""
        try:
            result = (
                self._supabase.table("credit_balances")
                .select("available, reserved, total_consumed")
                .eq("account_id", account_id)
                .eq("tenant_id", tenant_id)
                .single()
                .execute()
            )
            return result.data or {"available": 0, "reserved": 0, "total_consumed": 0}
        except Exception:
            return {"available": 0, "reserved": 0, "total_consumed": 0}
