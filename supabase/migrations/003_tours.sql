-- =============================================================================
-- Migration 003 — Tours table
-- Service: virtual-tour-service
-- Date: 2026-06-28
-- AC covered: AC-1 (accepted status), AC-4 (credit_consumed flag),
--             AC-5 (credit_consumed / status state machine),
--             AC-6 (UNIQUE idempotency_key enforces no double creation),
--             AC-7 (UNIQUE(tenant_id, idempotency_key)),
--             AC-8 (account_id nullable for on-demand tours),
--             AC-9 (status + video_url for GET /tours/{id}),
--             AC-13 (bedrock_cost_usd for cost attribution)
--
-- Design decisions:
-- - image_s3_keys TEXT[]: ordered array, index 0 = first room, last = last room.
-- - clip_prompts TEXT[]: N-1 camera prompts, one per consecutive image pair.
--   Worker generates defaults if not provided by tenant; persisted for audit.
-- - bedrock_invocation_arns TEXT[]: N-1 ARNs from Luma Ray 2 async invocations.
--   Poller polls all ARNs; tour completes when ALL are in Completed state.
-- - clip_s3_keys TEXT[]: N-1 S3 keys of individual clips before ffmpeg concat.
-- - timeout_at: worker sets this to started_at + TOUR_GENERATION_TIMEOUT_MINUTES.
--   Poller marks tour failed (without consuming credit) when now() >= timeout_at.
-- - UNIQUE(tenant_id, idempotency_key): database-level idempotency guarantee (AC-7).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tours (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership and isolation (AC-11)
    tenant_id               UUID        NOT NULL REFERENCES tenants(id),

    -- NULL for on-demand tours (AC-8); non-null triggers credit deduction logic
    account_id              UUID        REFERENCES accounts(id),

    -- Idempotency: unique per tenant (AC-7)
    idempotency_key         TEXT        NOT NULL,

    -- State machine: accepted → generating → completed | failed
    status                  TEXT        NOT NULL DEFAULT 'accepted'
                            CHECK (status IN ('accepted', 'generating', 'completed', 'failed')),

    -- Input: ordered array of S3 keys uploaded by the tenant (AC-2: min 5, max ~11)
    image_s3_keys           TEXT[]      NOT NULL,

    -- N-1 camera prompts (worker generates defaults if tenant omits them).
    -- Persisted for reproducibility and audit.
    clip_prompts            TEXT[],

    -- N-1 Bedrock invocation ARNs from Luma Ray 2 start_async_invoke calls.
    -- NULL until the worker populates them. Poller uses these to poll completion.
    bedrock_invocation_arns TEXT[],

    -- N-1 S3 keys of individual clips downloaded before ffmpeg concatenation.
    -- Populated by the poller after all ARNs complete.
    clip_s3_keys            TEXT[],

    -- Output video (set when status = 'completed')
    video_s3_key            TEXT,
    video_url               TEXT,           -- presigned URL, regenerated on expiry
    video_expires_at        TIMESTAMPTZ,    -- when the presigned URL expires

    -- Credit accounting (AC-5, AC-6)
    credit_consumed         BOOLEAN     NOT NULL DEFAULT false,

    -- Failure info (set when status = 'failed')
    failure_reason          TEXT,

    -- Cost attribution per tour for billing and CloudWatch metrics (AC-13)
    bedrock_cost_usd        NUMERIC(10, 4),

    -- Timestamps
    accepted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at              TIMESTAMPTZ,    -- set when worker transitions to 'generating'
    completed_at            TIMESTAMPTZ,    -- set by confirm_credit_consumption()
    timeout_at              TIMESTAMPTZ,    -- deadline: worker sets to started_at + TIMEOUT

    CONSTRAINT tours_tenant_idempotency_unique UNIQUE (tenant_id, idempotency_key)
);

COMMENT ON TABLE tours IS
    'Core entity representing a virtual tour generation request. '
    'One row is created per accepted request; it tracks the full lifecycle. '
    'State machine: accepted → generating → completed | failed. '
    'account_id is nullable: NULL means on-demand (no credit deduction). '
    'UNIQUE(tenant_id, idempotency_key) enforces no duplicate tours per tenant (AC-7).';

COMMENT ON COLUMN tours.image_s3_keys IS
    'Ordered list of S3 keys for the property images. '
    'Order matters: the virtual tour walks through rooms in this sequence. '
    'Min 5, max ~11 images (10 clips × 9s = 90s max video duration).';

COMMENT ON COLUMN tours.clip_prompts IS
    'N-1 camera motion prompts, one per consecutive image pair. '
    'Example for pair 0: "camera dolly forward entering the property, natural light". '
    'If not provided by tenant in the request, the worker auto-generates defaults '
    'and persists them here for reproducibility.';

COMMENT ON COLUMN tours.bedrock_invocation_arns IS
    'N-1 ARNs returned by bedrock-runtime.start_async_invoke() for Luma Ray 2. '
    'NULL until the worker populates them after launching all clips. '
    'The poller calls get_async_invoke() for each ARN every 60 seconds. '
    'Tour transitions to completed only when ALL ARNs reach Completed state.';

COMMENT ON COLUMN tours.clip_s3_keys IS
    'N-1 S3 keys for individual video clips (5s or 9s each). '
    'Populated by the poller after all Bedrock invocations complete. '
    'ffmpeg concatenates these in order with 0.3s cross-fades to produce the final video.';

COMMENT ON COLUMN tours.credit_consumed IS
    'true only after confirm_credit_consumption() executes successfully. '
    'A failed tour MUST have credit_consumed = false — this is a DB-level invariant '
    'reinforced by the atomic SQL function (AC-5, AC-6).';

COMMENT ON COLUMN tours.timeout_at IS
    'Deadline set by the worker: started_at + TOUR_GENERATION_TIMEOUT_MINUTES (default 25 min). '
    'If the poller sees now() >= timeout_at, it calls release_credit_reservation() '
    'and marks the tour failed — no credit is consumed (AC-5).';

COMMENT ON COLUMN tours.bedrock_cost_usd IS
    'Estimated cost: (N-1) * clip_duration_secs * price_per_second. '
    'Set by the poller after concatenation. Used for per-tenant cost reporting (AC-13).';

COMMIT;
