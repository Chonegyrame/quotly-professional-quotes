-- IP-based rate limiting table for edge functions.
-- Tracks every successful (authenticated) call per IP + function so we can
-- (a) reject when a single IP exceeds the per-function hourly limit
-- (b) compute a global 24h ceiling across expensive AI calls

CREATE TABLE IF NOT EXISTS public.ai_ip_usage (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  function_name TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_ip_usage_ip_fn_time
  ON public.ai_ip_usage (ip, function_name, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_ip_usage_fn_time
  ON public.ai_ip_usage (function_name, used_at DESC);

-- Service-role-only. No client access.
ALTER TABLE public.ai_ip_usage ENABLE ROW LEVEL SECURITY;
