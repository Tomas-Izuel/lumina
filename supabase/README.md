# Supabase — virtual-tour-service

Database for the `virtual-tour-service`. A dedicated Supabase project, isolated from the
Propital PROD instance (`aitogfkoufbdriomrbxe`).

## Project details (to fill in after provisioning)

| Field | Value |
|-------|-------|
| Organization | `yysgimjexxlzgsqczwyk` |
| Project name | `virtual-tour-service` |
| Region | `us-west-2` |
| Project ref | _set after creation_ |
| Extensions | `pgcrypto`, `uuid-ossp` |

## Migration files

```
supabase/migrations/
├── 001_tenants_and_api_keys.sql      — tenants + tenant_api_keys (auth backbone)
├── 002_accounts_and_credits.sql      — accounts, credit_balances, credit_ledger
├── 003_tours.sql                     — tours (core entity, full lifecycle)
├── 004_webhooks_and_quotas.sql       — tenant_webhooks, webhook_deliveries, tenant_quotas
├── 005_indexes.sql                   — all performance indexes
├── 006_rls_policies.sql              — Row Level Security on all tenant-scoped tables
└── 007_credit_functions.sql          — atomic SQL functions for credit operations
```

## How to apply migrations (deploy steps)

### Step 1 — Create the Supabase project

1. Go to https://supabase.com/dashboard/organizations/yysgimjexxlzgsqczwyk
2. Click **New project**
3. Name: `virtual-tour-service` | Region: `us-west-2` | DB password: generate a strong one
4. Wait for provisioning (~2 min)

### Step 2 — Get the project credentials

From **Project Settings → API**:
- `SUPABASE_URL` → `https://<ref>.supabase.co`
- `SUPABASE_SERVICE_KEY` → service role key (secret; used only by Lambdas)
- `SUPABASE_ANON_KEY` → anon key

Add these to the GitHub repository secrets and to `.env` for local dev (never commit `.env`).

### Step 3 — Install the Supabase CLI

```bash
brew install supabase/tap/supabase
supabase --version   # must be >= 2.79.0
```

### Step 4 — Link to the remote project

```bash
supabase login
supabase link --project-ref <project-ref>
```

### Step 5 — Apply migrations

```bash
# Apply all migrations in order
supabase db push

# Verify migrations were applied
supabase migration list

# Check for security advisors (run after every schema change)
supabase db advisors
```

### Step 6 — Verify extensions

```sql
-- Run in the Supabase SQL editor or via psql
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp');
-- Expected: 2 rows
```

### Step 7 — Verify RLS

```sql
-- All tenant-scoped tables should show RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Local development with Supabase CLI

```bash
# Start local Supabase stack (requires Docker)
supabase start

# This gives you a local SUPABASE_URL and SUPABASE_SERVICE_KEY
# Apply migrations locally
supabase db push

# Reset local DB and re-apply all migrations from scratch
supabase db reset
```

## Security model

- **Lambdas use the service role key** — this bypasses RLS (PostgreSQL `BYPASSRLS` privilege).
  The service role key is stored in AWS Secrets Manager and only loaded at Lambda startup.
- **RLS is a second line of defense** — it protects against bugs in the application layer
  and any future direct exposure of the Supabase Data API or Realtime.
- **Tables `tenants` and `tenant_api_keys` do NOT have RLS** — they are internal tables
  only accessed by the admin Lambda (service role). They are not exposed to tenant clients.
- **Tenant isolation** is enforced via `current_tenant_id()` helper function (006_rls_policies.sql),
  which reads the session-local GUC `app.current_tenant_id`.

## Credit atomicity (AC-5, AC-6)

The credit lifecycle is handled by three SQL functions (007_credit_functions.sql):

| Function | Called by | When |
|----------|-----------|------|
| `reserve_credit(account_id, tenant_id, tour_id)` | Worker Lambda | Before invoking Bedrock clips |
| `confirm_credit_consumption(tour_id, account_id, tenant_id, video_s3_key)` | Poller Lambda | After all clips complete + ffmpeg concat |
| `release_credit_reservation(tour_id, account_id, tenant_id, failure_reason)` | Poller Lambda | On clip failure or timeout |

All three functions are idempotent: a second call raises a named exception that the Lambda
catches as a warning, preventing double deduction or double release.

## Rollback

Each migration is wrapped in a `BEGIN; ... COMMIT;` transaction. To roll back a migration:

```sql
-- Example rollback for 007_credit_functions.sql
DROP FUNCTION IF EXISTS confirm_credit_consumption(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS release_credit_reservation(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reserve_credit(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS assign_credits(UUID, UUID, UUID, INTEGER, TEXT);
```

For table drops, always check for dependent objects first (`\d+ tablename` in psql).
