-- =============================================================================
-- Migration 005 — Performance indexes
-- Service: virtual-tour-service
-- Date: 2026-06-28
-- AC covered: AC-9 (fast tour lookups), AC-11 (RLS policy column coverage),
--             AC-13 (audit queries), AC-7 (idempotency check performance)
--
-- All indexes from 02-architecture.md section 8, plus additional ones
-- identified from RLS policy columns and common access patterns.
--
-- Naming convention: idx_{table}_{column(s)}[_{suffix}]
-- Partial indexes (WHERE clause) reduce index size and improve selectivity.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- tours — primary access patterns
-- ---------------------------------------------------------------------------

-- Poller: SELECT * FROM tours WHERE status='generating' (every 60s)
-- Also covers RLS: tenant_id column used in USING clause
CREATE INDEX IF NOT EXISTS idx_tours_tenant_status
    ON tours(tenant_id, status);

-- API: idempotency check on POST /tours (AC-7)
-- Unique constraint already exists; this explicit index is kept for clarity and
-- covers the case where the planner benefits from an index-only scan.
CREATE INDEX IF NOT EXISTS idx_tours_tenant_idempotency
    ON tours(tenant_id, idempotency_key);

-- Poller: partial index for generating tours with a timeout deadline.
-- Most selective access pattern for the poller's timeout check.
CREATE INDEX IF NOT EXISTS idx_tours_generating_timeout
    ON tours(status, timeout_at)
    WHERE status = 'generating';

-- GET /tours/{id}: quick lookup by tenant and primary key (AC-9)
-- The PK index covers (id) but not (tenant_id, id).
CREATE INDEX IF NOT EXISTS idx_tours_tenant_id_pk
    ON tours(tenant_id, id);

-- ---------------------------------------------------------------------------
-- credit_ledger — audit and cost reporting
-- ---------------------------------------------------------------------------

-- AC-13: per-tenant audit queries, ordered by time
CREATE INDEX IF NOT EXISTS idx_credit_ledger_tenant_created
    ON credit_ledger(tenant_id, created_at);

-- Per-account credit history (most common query for GET /accounts/{id}/credits history)
CREATE INDEX IF NOT EXISTS idx_credit_ledger_account_created
    ON credit_ledger(account_id, created_at)
    WHERE account_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- webhook_deliveries — already created in 004, confirmed here
-- ---------------------------------------------------------------------------

-- These are created in 004_webhooks_and_quotas.sql; listed here as comments
-- to document the full index landscape in one place.
-- idx_webhook_deliveries_tour         ON webhook_deliveries(tour_id)
-- idx_webhook_deliveries_tenant_delivered ON webhook_deliveries(tenant_id, delivered_at)

-- ---------------------------------------------------------------------------
-- accounts — lookups by tenant
-- ---------------------------------------------------------------------------

-- Already created in 002; listed for completeness.
-- idx_accounts_tenant_external        ON accounts(tenant_id, external_id)

-- ---------------------------------------------------------------------------
-- credit_balances — atomic operations
-- ---------------------------------------------------------------------------

-- Already created in 002; listed for completeness.
-- idx_credit_balances_account         ON credit_balances(account_id)
-- idx_credit_balances_tenant          ON credit_balances(tenant_id)

COMMIT;
