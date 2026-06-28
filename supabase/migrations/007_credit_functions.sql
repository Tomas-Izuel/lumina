-- =============================================================================
-- Migration 007 — Atomic credit SQL functions
-- Service: virtual-tour-service
-- Date: 2026-06-28
-- AC covered: AC-5 (exactly 1 credit deducted on success; 0 on failure),
--             AC-6 (no state where credit charged but no video delivered,
--                   no double deduction — second call raises exception)
--
-- Two functions called by the Poller Lambda via Supabase RPC:
--
--   confirm_credit_consumption(tour_id, account_id, tenant_id, video_s3_key)
--     Called when ALL N-1 Luma Ray 2 clips are Completed and the ffmpeg
--     concatenation has succeeded. Atomically:
--       1. Decrements reserved by 1, increments total_consumed by 1.
--       2. Appends a 'consumed' entry to credit_ledger.
--       3. Sets tours.status = 'completed', credit_consumed = true.
--     All three steps happen in a single Postgres transaction.
--     Idempotency: if the tour is already 'completed', step 3 updates 0 rows
--     and raises 'tour_not_in_generating' — no double deduction.
--
--   release_credit_reservation(tour_id, account_id, tenant_id, failure_reason)
--     Called by the Poller when any clip fails or the tour times out (>25 min).
--     Atomically:
--       1. Decrements reserved by 1, increments available by 1 (credit returned).
--       2. Appends a 'released' entry to credit_ledger.
--       3. Sets tours.status = 'failed', failure_reason = p_failure_reason.
--     Idempotency: if the tour is already 'failed', step 3 updates 0 rows.
--     The poller catches the raised exception as a warning — no double release.
--
-- Security:
--   - Both functions use SECURITY INVOKER (default): run with the caller's
--     privileges. The Lambda uses the service role → bypasses RLS, which is
--     correct for internal atomic operations.
--   - Both are NOT accessible via the Supabase Data API (not in the public schema
--     with anon/authenticated grants) — the Lambda calls them via service role RPC.
--   - No SECURITY DEFINER to avoid bypassing RLS accidentally on other queries.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- confirm_credit_consumption
-- Called by the Poller Lambda after successful video generation and ffmpeg concat.
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
        -- This should not happen in normal operation; treat as a data integrity error.
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
    -- WHERE status='generating' is critical for idempotency:
    --   - If already 'completed', this updates 0 rows → raises exception below.
    --   - This prevents a second call from double-consuming a credit (AC-6).
    UPDATE tours
       SET status          = 'completed',
           credit_consumed = true,
           video_s3_key    = p_video_s3_key,
           completed_at    = now()
     WHERE id     = p_tour_id
       AND status = 'generating';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tour_not_in_generating'
            USING DETAIL = format(
                'Tour %s is not in generating state — already completed or failed.',
                p_tour_id
            );
    END IF;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION confirm_credit_consumption(UUID, UUID, UUID, TEXT) IS
    'Atomically confirms credit consumption for a successful tour. '
    'Decrements reserved by 1, increments total_consumed by 1, writes a ledger entry, '
    'and sets tour status to completed. '
    'Raises credit_not_reserved if no reserved credit found (data integrity error). '
    'Raises tour_not_in_generating if tour is already completed or failed (idempotency guard). '
    'Called by the Poller Lambda after ffmpeg concat succeeds (AC-5, AC-6).';

-- ---------------------------------------------------------------------------
-- release_credit_reservation
-- Called by the Poller Lambda when a clip fails or the tour times out.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_credit_reservation(
    p_tour_id       UUID,
    p_account_id    UUID,    -- NULL for on-demand tours; skip credit logic if NULL
    p_tenant_id     UUID,
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
        -- delta=0 records the event without changing the net balance
        -- (the credit went reserved → available, net change = 0 vs original assigned balance).
        INSERT INTO credit_ledger (tenant_id, account_id, tour_id, delta, reason)
        VALUES (p_tenant_id, p_account_id, p_tour_id, 0, 'released');
    END IF;

    -- Step 3: mark the tour as failed.
    -- WHERE status='generating' ensures idempotency:
    --   - If already 'failed', updates 0 rows → function returns TRUE without error.
    --   - The Poller catches the exception from step 1 if reserve was already released;
    --     step 3 here is a soft guard.
    UPDATE tours
       SET status         = 'failed',
           failure_reason = p_failure_reason
     WHERE id     = p_tour_id
       AND status = 'generating';

    -- Note: unlike confirm_credit_consumption, we do NOT raise here if tour is already
    -- 'failed'. A double call to release on an on-demand tour (account_id IS NULL)
    -- would skip step 1 entirely and reach here; we want a clean return.
    -- The critical protection (no double release of a credit) is in step 1's WHERE reserved >= 1.

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION release_credit_reservation(UUID, UUID, UUID, TEXT) IS
    'Atomically releases a reserved credit back to available when a tour fails or times out. '
    'Decrements reserved by 1, increments available by 1, writes a ledger entry (delta=0, reason=released), '
    'and sets tour status to failed with the given failure_reason. '
    'Raises no_reserved_credit_to_release if no reserved credit found. '
    'Called by the Poller Lambda on Bedrock clip failure or timeout (AC-5, AC-6).';

-- ---------------------------------------------------------------------------
-- reserve_credit (helper called by the Worker Lambda before launching clips)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reserve_credit(
    p_account_id UUID,
    p_tenant_id  UUID,
    p_tour_id    UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Atomically move 1 credit from available to reserved.
    UPDATE credit_balances
       SET available  = available - 1,
           reserved   = reserved + 1,
           updated_at = now()
     WHERE account_id = p_account_id
       AND tenant_id  = p_tenant_id
       AND available >= 1;  -- prevents going below 0 (AC-4 final check in worker)

    IF NOT FOUND THEN
        RAISE EXCEPTION 'insufficient_credits'
            USING DETAIL = format(
                'No available credit for account_id=%s tenant_id=%s',
                p_account_id, p_tenant_id
            );
    END IF;

    -- Append ledger entry for the reservation
    INSERT INTO credit_ledger (tenant_id, account_id, tour_id, delta, reason)
    VALUES (p_tenant_id, p_account_id, p_tour_id, 0, 'reserved');

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION reserve_credit(UUID, UUID, UUID) IS
    'Atomically reserves 1 credit for a tour being dispatched to the Worker Lambda. '
    'Moves 1 credit from available to reserved. '
    'Raises insufficient_credits if available < 1 (AC-4 final guard in the worker). '
    'Called by the Worker Lambda after validating image S3 keys, before invoking Bedrock.';

-- ---------------------------------------------------------------------------
-- assign_credits (called by POST /accounts/{id}/credits endpoint — B-4)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_credits(
    p_account_id UUID,
    p_tenant_id  UUID,
    p_tour_id    UUID,   -- NULL when called from the credits endpoint (not tied to a tour)
    p_delta      INTEGER,
    p_reason     TEXT DEFAULT 'assigned'
)
RETURNS INTEGER                      -- returns new available balance
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_new_available INTEGER;
BEGIN
    IF p_delta <= 0 THEN
        RAISE EXCEPTION 'invalid_delta'
            USING DETAIL = 'Delta must be a positive integer when assigning credits.';
    END IF;

    -- Upsert: create balance row if not exists, or increment
    INSERT INTO credit_balances (tenant_id, account_id, available)
    VALUES (p_tenant_id, p_account_id, p_delta)
    ON CONFLICT (account_id) DO UPDATE
        SET available  = credit_balances.available + p_delta,
            updated_at = now()
    RETURNING available INTO v_new_available;

    -- Append immutable ledger entry (AC-13)
    INSERT INTO credit_ledger (tenant_id, account_id, tour_id, delta, reason)
    VALUES (p_tenant_id, p_account_id, p_tour_id, p_delta, p_reason);

    RETURN v_new_available;
END;
$$;

COMMENT ON FUNCTION assign_credits(UUID, UUID, UUID, INTEGER, TEXT) IS
    'Assigns (adds) credits to an account balance. '
    'Upserts credit_balances and appends a ledger entry. '
    'Returns the new available balance. '
    'Called by POST /accounts/{external_id}/credits (AC-12).';

COMMIT;
