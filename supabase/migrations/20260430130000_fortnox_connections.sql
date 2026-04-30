-- Fortnox OAuth2 connection store, one row per company.
--
-- The access_token + refresh_token pair lets the create-fortnox-invoice
-- edge function call Fortnox's API on the firm's behalf. Tokens are
-- secrets, so RLS denies all client-side reads and writes; only the
-- service_role key (used by edge functions) can touch this table.
-- Frontend reads connection state via the fortnox-status edge function,
-- never directly.
--
-- expires_at is the access_token's expiry (Fortnox issues 1-hour
-- access tokens). The refresh token rotates each refresh, so both
-- columns are updated together by the token-refresh path.

CREATE TABLE IF NOT EXISTS public.fortnox_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE
    REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fortnox_connections ENABLE ROW LEVEL SECURITY;

-- No SELECT / INSERT / UPDATE / DELETE policies for any role except
-- service_role. RLS with no policies means: deny everything. Edge
-- functions using the service-role key bypass RLS and are the only
-- code path that touches this table.

COMMENT ON TABLE public.fortnox_connections IS
  'Per-company OAuth2 tokens for Fortnox. Service-role-only; clients use fortnox-status edge function for safe state.';
COMMENT ON COLUMN public.fortnox_connections.expires_at IS
  'access_token expiry. Fortnox issues 1-hour access tokens.';
COMMENT ON COLUMN public.fortnox_connections.scope IS
  'Space-delimited list of scopes granted (e.g. "invoice customer companyinformation").';
