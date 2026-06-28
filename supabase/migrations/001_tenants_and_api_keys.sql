-- =============================================================================
-- Migration 001 — Tenants and tenant API key pairs
-- Service: virtual-tour-service
-- Date: 2026-06-28
-- AC covered: prerequisite for all AC (auth backbone: AC-1, AC-11)
--
-- Creates the two root tables that identify and authenticate API consumers.
-- API key secrets are NEVER stored in plaintext: only the bcrypt hash lives here.
-- Lambdas use the Supabase service role (bypasses RLS); RLS is a second line of
-- defense in case Supabase is ever exposed directly (see 006_rls_policies.sql).
-- =============================================================================

BEGIN;

-- Enable pgcrypto for gen_random_uuid() / bcrypt utilities
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- tenants
-- One row per API consumer (Propital, Propirent, Orkezto, future externals).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT        NOT NULL,
    name        TEXT        NOT NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT tenants_slug_unique UNIQUE (slug)
);

COMMENT ON TABLE tenants IS
    'Top-level API consumers (Propital, Propirent, Orkezto, future externals). '
    'Each tenant is isolated: its tours, accounts, and credits cannot be accessed by other tenants.';

COMMENT ON COLUMN tenants.slug IS
    'Short, URL-safe identifier (e.g. "propital", "propirent"). Unique.';

COMMENT ON COLUMN tenants.is_active IS
    'Set to false to revoke all access without deleting data. '
    'Auth middleware checks this before granting access.';

-- ---------------------------------------------------------------------------
-- tenant_api_keys
-- API key pairs: key_id is public (sent in header), key_hash is the bcrypt
-- hash of the secret (never stored in plaintext).
-- A tenant can have multiple active key pairs for key rotation.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_id       TEXT        NOT NULL,
    key_hash     TEXT        NOT NULL,   -- bcrypt hash of the secret, NEVER the secret itself
    is_active    BOOLEAN     NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,

    CONSTRAINT tenant_api_keys_key_id_unique UNIQUE (key_id)
);

COMMENT ON TABLE tenant_api_keys IS
    'API key pairs for server-to-server authentication. '
    'key_id is the public identifier (sent as the first part of X-API-Key header). '
    'key_hash stores the bcrypt hash of the secret — the plaintext secret is returned '
    'only at creation time and never persisted. '
    'Designed for rotation: a tenant can have multiple active key pairs.';

COMMENT ON COLUMN tenant_api_keys.key_id IS
    'Public identifier, readable prefix. Example: "vts_propital_abc123". '
    'Used to look up the row before bcrypt verification.';

COMMENT ON COLUMN tenant_api_keys.key_hash IS
    'bcrypt hash (cost factor >= 10) of the secret. NEVER store the plaintext secret.';

COMMENT ON COLUMN tenant_api_keys.last_used_at IS
    'Updated asynchronously by the API Lambda (background task) to avoid blocking the request.';

-- Index to speed up auth middleware lookups by key_id (active keys only)
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_key_id
    ON tenant_api_keys(key_id)
    WHERE is_active = true;

-- Index to support listing and revoking key pairs by tenant
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant_id
    ON tenant_api_keys(tenant_id);

COMMIT;
