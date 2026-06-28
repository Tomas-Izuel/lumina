-- =============================================================================
-- Migration 008 — Add 'finalizing' intermediate status to tours
-- Service: lumina
-- Date: 2026-06-28
-- AC covered: AC-5, AC-6 (atomic claim prevents duplicate processing)
--
-- Problem solved:
--   Two concurrent Poller Lambda invocations could both see a tour in
--   'generating' state, both download the clips, both run ffmpeg, and both
--   call confirm_credit_consumption. Although the SQL function's WHERE
--   status='generating' prevents double credit deduction, the duplicate
--   compute waste (download + ffmpeg + upload done twice) is costly.
--
-- Solution:
--   Add an intermediate 'finalizing' status. Before doing any heavy work,
--   the Poller atomically updates status 'generating' → 'finalizing' with
--   a single UPDATE WHERE status='generating'. If 0 rows are updated, another
--   Poller instance already claimed the tour — skip it.
--
-- Changes in this migration:
--   1. Drop the existing CHECK constraint on tours.status.
--   2. Add a new CHECK constraint that includes 'finalizing'.
--   3. Update confirm_credit_consumption to accept 'finalizing' as the valid
--      source state (since after the claim, status is 'finalizing', not 'generating').
--   4. Update release_credit_reservation similarly.
--
-- NOTE: Do NOT edit migration 007 — this is a forward-only change per convention.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 1: Extend the CHECK constraint on tours.status to include 'finalizing'
-- ---------------------------------------------------------------------------

-- Drop the existing constraint (named by Postgres convention based on the
-- table name and column). In Postgres, unnamed CHECK constraints get a
-- system-generated name; we use DROP CONSTRAINT IF EXISTS with the known name
-- from migration 003. If the name differs in prod, the DBA can adjust.
ALTER TABLE tours
    DROP CONSTRAINT IF EXISTS tours_status_check;

ALTER TABLE tours
    ADD CONSTRAINT tours_status_check
    CHECK (status IN ('accepted', 'generating', 'finalizing', 'completed', 'failed'));

-- ---------------------------------------------------------------------------
-- Step 2: Update confirm_credit_consumption to accept 'finalizing' source state
-- The Poller claims a tour by moving it to 'finalizing' BEFORE heavy work.
-- When ffmpeg succeeds, status is 'finalizing' (not 'generating'), so the
-- WHERE clause must be updated accordingly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_credit_consumption(
    p_tour_id      UUID,
    p_account_id   UUID,    -- NULL for on-demand tours; skip credit logic if NULL
    p_tenant_id    UUID,
    p_video_s3_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Step 1 & 2: credit deduction (only for tours with an account)
    IF p_account_id IS NOT NULL THEN
        -- Atomically move 1 credit from reserved to total_consumed.
        -- The CHECK (reserved >= 0) constraint provides an additional safety net.
        UPDATE credit_balances
           SET reserved       = reserved - 1,
               total_consumed = total_consumed + 1,
               updated_at     = now()
         WHERE account_id = p_account_id
           AND tenant_id  = p_tenant_id
           AND reserved  >= 1;

        -- If no row was updated, the credit was never reserved or already consumed.
        IF NOT FOUND THEN
            RAISE EXCEPTION 'credit_not_reserved'
                USING DETAIL = format(
                    'No reserved credit found for account_id=%s tenant_id=%s',
                    p_account_id, p_tenant_id
                );
        END IF;

        -- Append an immutable ledger entry for the consumption (AC-13 audit)
        INSERT INTO credit_ledger (tenant_id, account_id, tour_id, delta, reason)
        VALUES (p_tenant_id, p_account_id, p_tour_id, -1, 'consumed');
    END IF;

    -- Step 3: mark the tour as completed.
    -- Acepta 'finalizing' como estado fuente (migración 008):
    --   - El Poller hace claim atómico 'generating' → 'finalizing' antes del
    --     trabajo pesado. Al finalizar ffmpeg, el tour está en 'finalizing'.
    --   - Si el tour ya está 'completed', actualiza 0 filas → excepción (AC-6).
    UPDATE tours
       SET status          = 'completed',
           credit_consumed = true,
           video_s3_key    = p_video_s3_key,
           completed_at    = now()
     WHERE id     = p_tour_id
       AND status = 'finalizing';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tour_not_in_finalizing'
            USING DETAIL = format(
                'Tour %s is not in finalizing state — already completed, failed, or not yet claimed.',
                p_tour_id
            );
    END IF;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION confirm_credit_consumption(UUID, UUID, UUID, TEXT) IS
    'Atomically confirms credit consumption for a successful tour. '
    'Decrements reserved by 1, increments total_consumed by 1, writes a ledger entry, '
    'and sets tour status from finalizing to completed. '
    'Raises credit_not_reserved if no reserved credit found (data integrity error). '
    'Raises tour_not_in_finalizing if tour is not in finalizing state (idempotency guard). '
    'Called by the Poller Lambda after ffmpeg concat succeeds (AC-5, AC-6). '
    'Updated in migration 008: accepts finalizing (not generating) as source state.';

-- ---------------------------------------------------------------------------
-- Step 3: Update release_credit_reservation to accept both 'generating' and
-- 'finalizing' as valid source states.
-- A timeout check may fire while the tour is in 'finalizing' (Poller claimed
-- it but timed out before confirming). We must still be able to fail it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_credit_reservation(
    p_tour_id        UUID,
    p_account_id     UUID,    -- NULL for on-demand tours; skip credit logic if NULL
    p_tenant_id      UUID,
    p_failure_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Step 1 & 2: return the reserved credit to available (only for tours with an account)
    IF p_account_id IS NOT NULL THEN
        -- Atomically move 1 credit from reserved back to available.
        UPDATE credit_balances
           SET reserved   = reserved - 1,
               available  = available + 1,
               updated_at = now()
         WHERE account_id = p_account_id
           AND tenant_id  = p_tenant_id
           AND reserved  >= 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'no_reserved_credit_to_release'
                USING DETAIL = format(
                    'No reserved credit to release for account_id=%s tenant_id=%s',
                    p_account_id, p_tenant_id
                );
        END IF;

        -- Append an immutable ledger entry for the release (AC-13 audit).
        INSERT INTO credit_ledger (tenant_id, account_id, tour_id, delta, reason)
        VALUES (p_tenant_id, p_account_id, p_tour_id, 0, 'released');
    END IF;

    -- Step 3: mark the tour as failed.
    -- Acepta 'generating' o 'finalizing' como estado fuente (migración 008):
    --   - 'generating': timeout antes de que el Poller hiciera claim.
    --   - 'finalizing': timeout o fallo después del claim pero antes de confirmar.
    UPDATE tours
       SET status         = 'failed',
           failure_reason = p_failure_reason
     WHERE id     = p_tour_id
       AND status IN ('generating', 'finalizing');

    -- Note: no exception if already 'failed' — same idempotency behavior as migration 007.
    -- The critical guard (no double release of a credit) is in step 1's WHERE reserved >= 1.

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION release_credit_reservation(UUID, UUID, UUID, TEXT) IS
    'Atomically releases a reserved credit back to available when a tour fails or times out. '
    'Decrements reserved by 1, increments available by 1, writes a ledger entry (delta=0, reason=released), '
    'and sets tour status to failed. '
    'Accepts generating or finalizing as source state (updated in migration 008). '
    'Raises no_reserved_credit_to_release if no reserved credit found. '
    'Called by the Poller Lambda on Bedrock clip failure or timeout (AC-5, AC-6).';

COMMIT;
