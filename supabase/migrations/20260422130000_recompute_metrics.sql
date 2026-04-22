-- Observability: persist one row per recompute-user-profile invocation so
-- duration / quote-count / status can be queried historically. Complements
-- the structured console.log output (which is subject to Supabase log
-- retention) with permanent, SQL-queryable history.
--
-- Service-role-only — this is operator/admin data, not user-facing.

CREATE TABLE IF NOT EXISTS public.recompute_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  trade text,
  quote_count integer NOT NULL DEFAULT 0,
  patterns_found integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recompute_metrics_created_at
  ON public.recompute_metrics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recompute_metrics_user_id
  ON public.recompute_metrics (user_id);

ALTER TABLE public.recompute_metrics ENABLE ROW LEVEL SECURITY;

-- No authenticated policies — deny by default. Only service_role writes/reads.
DROP POLICY IF EXISTS recompute_metrics_service_all ON public.recompute_metrics;
CREATE POLICY recompute_metrics_service_all
  ON public.recompute_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
