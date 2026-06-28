-- =============================================================================
-- Migration 004 — Webhooks and tenant quotas
-- Service: virtual-tour-service
-- Date: 2026-06-28
-- AC covered: AC-10 (reliable webhook delivery with retries and audit log),
--             AC-13 (webhook_deliveries for observability),
--             extension point for billing v2 (tenant_quotas)
--
-- tenant_webhooks: one callback URL + signing secret per tenant.
-- webhook_deliveries: immutable log of every delivery attempt (success or failure).
-- tenant_quotas: per-tenant rate limits for on-demand usage control (AC-13 / Q2).
--   Also serves as the billing v2 extension point (max_tours_per_day/month).
--
-- Design decisions:
-- - UNIQUE(tenant_id) on tenant_webhooks: one active endpoint per tenant in v1.
--   v2 can remove the UNIQUE and support multiple endpoints per tenant.
-- - webhook_deliveries is append-only. Rows are never updated.
-- - tenant_quotas.tours_today and tours_this_month are reset by a scheduled Lambda
--   (not by a DB trigger) to keep the DB logic simple.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- tenant_webhooks
-- Callback URL and HMAC signing secret for each tenant.
-- The Lambda webhook dispatcher reads this to deliver notifications (AC-10).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_webhooks (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_url    TEXT        NOT NULL,
    webhook_secret TEXT        NOT NULL,   -- HMAC-SHA256 signing secret, stored as-is
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT tenant_webhooks_tenant_unique UNIQUE (tenant_id)
);

COMMENT ON TABLE tenant_webhooks IS
    'One webhook endpoint per tenant (v1). '
    'The webhook dispatcher Lambda signs each delivery with HMAC-SHA256 using webhook_secret. '
    'Header sent: X-VTS-Signature: sha256=<hex_digest>. '
    'UNIQUE(tenant_id): in v2 this constraint can be relaxed to support multiple endpoints.';

COMMENT ON COLUMN tenant_webhooks.webhook_secret IS
    'Signing secret for HMAC-SHA256. Tenant must verify the signature on their end. '
    'Should be treated like a password: do not log, do not expose in API responses. '
    'Returned only at creation time via the admin endpoint.';

-- Index for dispatcher lookups by tenant_id
CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_tenant
    ON tenant_webhooks(tenant_id)
    WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- webhook_deliveries
-- Immutable log of every webhook dispatch attempt (AC-10, AC-13).
-- One row per attempt. Multiple rows exist for the same tour when SQS retries.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id            BIGSERIAL   PRIMARY KEY,
    tenant_id     UUID        NOT NULL REFERENCES tenants(id),
    tour_id       UUID        NOT NULL REFERENCES tours(id),
    attempt       INTEGER     NOT NULL DEFAULT 1,
    status        TEXT        NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    http_status   INTEGER,       -- HTTP response code from the tenant's webhook endpoint
    response_body TEXT,          -- first 1024 chars of the response body (for debugging)
    delivered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE webhook_deliveries IS
    'Append-only log of webhook delivery attempts (AC-10, AC-13). '
    'Never update or delete rows. '
    'attempt: incremented by SQS on each retry (up to maxReceiveCount = 5). '
    'After 5 failures the message lands in the DLQ; a CloudWatch alarm fires.';

COMMENT ON COLUMN webhook_deliveries.response_body IS
    'First 1024 characters of the HTTP response body. Truncated for storage efficiency. '
    'Useful for debugging 4xx/5xx errors from the tenant webhook endpoint.';

-- Index for per-tour delivery audit queries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tour
    ON webhook_deliveries(tour_id);

-- Index for per-tenant delivery reports (AC-13)
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_delivered
    ON webhook_deliveries(tenant_id, delivered_at);

-- ---------------------------------------------------------------------------
-- tenant_quotas
-- Per-tenant usage limits for on-demand requests (Q2 resolution: usage tracked
-- at tenant level). Also the extension point for billing v2.
-- Counters (tours_today, tours_this_month) are reset by a scheduled Lambda,
-- not by a DB trigger, to keep logic outside the database.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_quotas (
    tenant_id             UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    max_tours_per_day     INTEGER DEFAULT 100,
    max_tours_per_month   INTEGER DEFAULT 1000,
    tours_today           INTEGER NOT NULL DEFAULT 0 CHECK (tours_today >= 0),
    tours_this_month      INTEGER NOT NULL DEFAULT 0 CHECK (tours_this_month >= 0),
    quota_reset_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT tenant_quotas_tenant_unique PRIMARY KEY (tenant_id)
);

COMMENT ON TABLE tenant_quotas IS
    'Per-tenant usage limits. '
    'max_tours_per_day / max_tours_per_month: configurable by the admin endpoint. '
    'tours_today / tours_this_month: incremented by the API Lambda on each accepted tour. '
    'quota_reset_date: the Lambda compares CURRENT_DATE to this field to decide '
    'whether to reset daily counters. '
    'Extension point: in billing v2, add payment_method_id and billing_cycle here.';

COMMIT;
