-- =============================================================================
-- Migration 002 — Accounts and credit system
-- Service: virtual-tour-service
-- Date: 2026-06-28
-- AC covered: AC-4 (credit check before tour), AC-5 (atomic credit debit),
--             AC-6 (no double debit), AC-8 (on-demand nullable account),
--             AC-12 (tenant assigns credits to accounts), AC-13 (audit ledger)
--
-- accounts: entities within a tenant that hold credit balances.
-- credit_balances: current balance state per account (available, reserved, consumed).
-- credit_ledger: immutable append-only event log for all credit movements.
--
-- Design decisions:
-- - credit_balances.available >= 0 and reserved >= 0 are database-level guarantees.
-- - The atomic reserve/consume/release cycle is enforced by SQL functions in 007.
-- - credit_ledger is append-only; rows are never updated or deleted (audit trail).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- accounts
-- An entity within a tenant (e.g. an end-customer of Orkezto).
-- Identified by external_id (the tenant's own ID for the entity).
-- Unique per tenant: (tenant_id, external_id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id TEXT        NOT NULL,   -- tenant's own identifier for this account
    name        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT accounts_tenant_external_id_unique UNIQUE (tenant_id, external_id)
);

COMMENT ON TABLE accounts IS
    'Entities within a tenant that can hold tour credits. '
    'external_id is the tenant''s own primary key for this customer. '
    'Null account_id on a tour means on-demand (no credit deduction).';

COMMENT ON COLUMN accounts.external_id IS
    'Tenant-assigned identifier. Unique within a tenant. '
    'Example: customer UUID from Orkezto''s own database.';

-- Index for lookups by tenant + external_id (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_external
    ON accounts(tenant_id, external_id);

-- ---------------------------------------------------------------------------
-- credit_balances
-- One row per account. Tracks available, reserved, and total consumed credits.
--
-- State machine per credit:
--   assigned  → available += delta      (tenant adds credits)
--   reserved  → available -= 1, reserved += 1  (credit locked while tour runs)
--   consumed  → reserved -= 1, total_consumed += 1  (tour succeeded)
--   released  → reserved -= 1, available += 1  (tour failed, credit returned)
--
-- DB constraints prevent negative values — no code path can go below zero.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_balances (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES tenants(id),
    account_id     UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    available      INTEGER     NOT NULL DEFAULT 0 CHECK (available >= 0),
    reserved       INTEGER     NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    total_consumed INTEGER     NOT NULL DEFAULT 0 CHECK (total_consumed >= 0),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT credit_balances_account_unique UNIQUE (account_id)
);

COMMENT ON TABLE credit_balances IS
    'Current credit balance state per account. '
    'available: credits that can be used for new tours. '
    'reserved: credits locked while a tour is in the "generating" state. '
    'total_consumed: cumulative count of credits consumed by successful tours. '
    'All three columns have CHECK constraints to prevent negative values at the DB level.';

COMMENT ON COLUMN credit_balances.available IS
    'Credits available for new tour requests. '
    'Decremented atomically by the SQL function reserve_credit (in 007_credit_functions.sql).';

COMMENT ON COLUMN credit_balances.reserved IS
    'Credits held while a tour is processing. '
    'Released back to available on failure; moved to total_consumed on success.';

-- Index for atomic reserve/consume operations
CREATE INDEX IF NOT EXISTS idx_credit_balances_account
    ON credit_balances(account_id);

CREATE INDEX IF NOT EXISTS idx_credit_balances_tenant
    ON credit_balances(tenant_id);

-- ---------------------------------------------------------------------------
-- credit_ledger
-- Immutable append-only log of every credit movement.
-- Used for auditing, cost attribution, and billing in v2.
-- reason ∈ { 'assigned', 'reserved', 'consumed', 'released' }
-- delta: positive for additions (assigned), negative for consumption,
--        zero for released events (credit returned, net delta = 0).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_ledger (
    id         BIGSERIAL   PRIMARY KEY,
    tenant_id  UUID        NOT NULL REFERENCES tenants(id),
    account_id UUID        REFERENCES accounts(id),  -- NULL allowed for on-demand records
    tour_id    UUID,                                  -- FK enforced by app; added in 003
    delta      INTEGER     NOT NULL,
    reason     TEXT        NOT NULL
                           CHECK (reason IN ('assigned', 'reserved', 'consumed', 'released')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE credit_ledger IS
    'Immutable event log of all credit movements (AC-13). '
    'Never update or delete rows — this is the audit trail. '
    'delta: >0 = credits added (assigned); <0 = credits consumed; 0 = released (returned after failure). '
    'reason: one of assigned | reserved | consumed | released.';

COMMENT ON COLUMN credit_ledger.tour_id IS
    'References tours.id. Not a FK here to avoid circular dependency with migration 003. '
    'Referential integrity is maintained by the SQL functions in 007_credit_functions.sql.';

-- Index for per-tenant audit queries and cost reporting (AC-13)
CREATE INDEX IF NOT EXISTS idx_credit_ledger_tenant_created
    ON credit_ledger(tenant_id, created_at);

-- Index for per-account credit history
CREATE INDEX IF NOT EXISTS idx_credit_ledger_account
    ON credit_ledger(account_id, created_at)
    WHERE account_id IS NOT NULL;

COMMIT;
