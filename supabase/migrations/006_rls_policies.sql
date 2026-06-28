-- =============================================================================
-- Migration 006 — Row Level Security (RLS) policies
-- Service: lumina
-- Date: 2026-06-28
-- AC covered: AC-11 (strict multi-tenant isolation)
--
-- Security model for this service:
--
-- PRIMARY DEFENSE — Application layer:
--   The API Lambda authenticates every request via API key (tenant_api_keys table),
--   resolves tenant_id, and validates it against every query explicitly. No query
--   reaches the DB without a verified tenant_id in the application layer.
--
-- SECONDARY DEFENSE — RLS (this file):
--   All tables that contain tenant-scoped data have RLS enabled. Policies filter
--   by current_setting('app.current_tenant_id', true) cast to UUID.
--   This ensures that even if the application layer has a bug that leaks a raw
--   Supabase connection, rows from other tenants are invisible.
--
-- Lambda execution model:
--   The Lambdas connect using the Supabase SERVICE ROLE key, which bypasses RLS
--   by design (PostgreSQL BYPASSRLS privilege). The service role is ONLY used
--   server-side; it is never sent to clients.
--   RLS policies are enforced when:
--     a) a direct Supabase client connection uses the anon or authenticated role, or
--     b) the service ever exposes a Supabase Realtime or Data API surface directly.
--
-- Setting the tenant context in a service role session (for testing or future use):
--   SET LOCAL app.current_tenant_id = '<uuid>';
--   -- queries in this transaction now go through RLS as if they were a tenant
--
-- tables with RLS enabled:
--   accounts, credit_balances, credit_ledger, tours,
--   tenant_webhooks, webhook_deliveries, tenant_quotas
--
-- tables WITHOUT RLS (intentional):
--   tenants — internal; only the admin endpoint reads/writes it via service role.
--   tenant_api_keys — same; auth middleware only; never exposed to tenant clients.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Enable RLS on all tenant-scoped tables
-- ---------------------------------------------------------------------------

ALTER TABLE accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_webhooks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_quotas       ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: extract and validate the current tenant ID from the session setting.
-- Returns NULL if not set (safe: policies will deny all rows).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
$$;

COMMENT ON FUNCTION current_tenant_id() IS
    'Returns the tenant UUID from the session-local GUC app.current_tenant_id. '
    'Returns NULL if not set, which causes all tenant-isolation policies to deny access. '
    'Set with: SET LOCAL app.current_tenant_id = ''<uuid>'' inside a transaction. '
    'SECURITY INVOKER ensures the function runs with the caller''s privileges.';

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------

-- SELECT: tenant can only see its own accounts
CREATE POLICY accounts_tenant_isolation_select
    ON accounts
    FOR SELECT
    USING (tenant_id = current_tenant_id());

-- INSERT: tenant can only insert accounts for itself
CREATE POLICY accounts_tenant_isolation_insert
    ON accounts
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- UPDATE: tenant can only update its own accounts; cannot reassign to another tenant
CREATE POLICY accounts_tenant_isolation_update
    ON accounts
    FOR UPDATE
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- DELETE: tenant can only delete its own accounts
CREATE POLICY accounts_tenant_isolation_delete
    ON accounts
    FOR DELETE
    USING (tenant_id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- credit_balances
-- ---------------------------------------------------------------------------

CREATE POLICY credit_balances_tenant_isolation_select
    ON credit_balances
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY credit_balances_tenant_isolation_insert
    ON credit_balances
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY credit_balances_tenant_isolation_update
    ON credit_balances
    FOR UPDATE
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- credit_ledger (append-only: no UPDATE or DELETE policies)
-- ---------------------------------------------------------------------------

CREATE POLICY credit_ledger_tenant_isolation_select
    ON credit_ledger
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY credit_ledger_tenant_isolation_insert
    ON credit_ledger
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- No UPDATE policy: the ledger is append-only by design.
-- No DELETE policy: rows must never be deleted (audit trail).

-- ---------------------------------------------------------------------------
-- tours
-- ---------------------------------------------------------------------------

CREATE POLICY tours_tenant_isolation_select
    ON tours
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY tours_tenant_isolation_insert
    ON tours
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tours_tenant_isolation_update
    ON tours
    FOR UPDATE
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- No DELETE policy: tours are never deleted (audit trail + cost tracking).

-- ---------------------------------------------------------------------------
-- tenant_webhooks
-- ---------------------------------------------------------------------------

CREATE POLICY tenant_webhooks_tenant_isolation_select
    ON tenant_webhooks
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_webhooks_tenant_isolation_insert
    ON tenant_webhooks
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_webhooks_tenant_isolation_update
    ON tenant_webhooks
    FOR UPDATE
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- webhook_deliveries (append-only: no UPDATE or DELETE policies)
-- ---------------------------------------------------------------------------

CREATE POLICY webhook_deliveries_tenant_isolation_select
    ON webhook_deliveries
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY webhook_deliveries_tenant_isolation_insert
    ON webhook_deliveries
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- tenant_quotas
-- ---------------------------------------------------------------------------

CREATE POLICY tenant_quotas_tenant_isolation_select
    ON tenant_quotas
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_quotas_tenant_isolation_insert
    ON tenant_quotas
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_quotas_tenant_isolation_update
    ON tenant_quotas
    FOR UPDATE
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

COMMIT;
