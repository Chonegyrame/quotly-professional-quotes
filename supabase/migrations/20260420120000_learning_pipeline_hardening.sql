-- Learning pipeline hardening:
--   1. user_job_patterns.member_quote_ids — persist cluster membership so
--      generate-quote can look up the exact source rows for Layer 5 /
--      sub-aggregates without re-deriving by keyword score.
--   2. user_material_learnings.quote_id + partial unique index — dedupe on
--      quote re-send by letting the recompute DELETE by quote_id and upsert
--      with ignoreDuplicates.
--   3. ai_idempotency_cache — short-TTL cache keyed by (user_id, request_id)
--      with a hashed input payload so retries within 60s return the same
--      response and don't re-spend the daily limit.
--   4. claim_ai_usage_slot RPC — atomic per-user daily-limit claim using a
--      transaction-scoped advisory lock; replaces the racy SELECT count +
--      INSERT pair in generate-quote.

-- ============================================================
-- 1. user_job_patterns.member_quote_ids
-- ============================================================

ALTER TABLE public.user_job_patterns
  ADD COLUMN IF NOT EXISTS member_quote_ids uuid[];

-- ============================================================
-- 2. user_material_learnings.quote_id + partial unique index
-- ============================================================

ALTER TABLE public.user_material_learnings
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_material_learnings_quote_material_type
  ON public.user_material_learnings (quote_id, material_name, learning_type)
  WHERE quote_id IS NOT NULL;

-- ============================================================
-- 3. ai_idempotency_cache
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_idempotency_cache (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_idempotency_cache_created_at
  ON public.ai_idempotency_cache (created_at);

ALTER TABLE public.ai_idempotency_cache ENABLE ROW LEVEL SECURITY;

-- Users can read their own cached responses.
DROP POLICY IF EXISTS ai_idempotency_cache_select_own ON public.ai_idempotency_cache;
CREATE POLICY ai_idempotency_cache_select_own
  ON public.ai_idempotency_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role writes (edge function uses adminClient).
DROP POLICY IF EXISTS ai_idempotency_cache_service_all ON public.ai_idempotency_cache;
CREATE POLICY ai_idempotency_cache_service_all
  ON public.ai_idempotency_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. claim_ai_usage_slot(p_user_id, p_daily_limit) RPC
--    Acquires a per-user advisory lock for the transaction, counts today's
--    ai_usage rows, inserts one row if under the limit. Returns true on
--    claim, false when the daily limit is already reached. The advisory
--    lock is released automatically at transaction commit, so rapid
--    parallel calls serialize per user.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_ai_usage_slot(
  p_user_id uuid,
  p_daily_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_day_start timestamptz := date_trunc('day', now());
BEGIN
  -- Serialize per user for the duration of this transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT COUNT(*) INTO v_count
  FROM public.ai_usage
  WHERE user_id = p_user_id
    AND used_at >= v_day_start;

  IF v_count >= p_daily_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage (user_id) VALUES (p_user_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_usage_slot(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_ai_usage_slot(uuid, integer) TO service_role;
