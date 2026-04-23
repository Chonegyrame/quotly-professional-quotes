-- Lead Filter System — Phase 2, Part 1
-- Creates `incoming_requests` — rows written by the public intake form.
-- AI scoring fields (ai_score, ai_tier, ai_verdict, etc.) stay NULL at this
-- phase; Phase 3 populates them via score-incoming-request.
--
-- Writes come through an edge function running under service role, so anon
-- never touches this table directly. Reads are firm-scoped via RLS.

CREATE TABLE public.incoming_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  form_template_id uuid REFERENCES public.form_templates(id) ON DELETE SET NULL,

  -- What the customer submitted
  submitted_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  free_text text,
  submitter_name text,
  submitter_email text,
  submitter_phone text,
  submitter_address text,
  submitter_postal_code text,
  submitter_city text,
  submitter_lat numeric(10, 7),
  submitter_lng numeric(10, 7),
  photos text[] NOT NULL DEFAULT '{}',

  -- AI scoring output (populated in Phase 3)
  ai_score integer CHECK (ai_score BETWEEN 0 AND 100),
  ai_tier text CHECK (ai_tier IN ('Hett', 'Ljummet', 'Kallt')),
  ai_confidence text CHECK (ai_confidence IN ('hög', 'medel', 'låg')),
  ai_verdict jsonb,
  needs_human_review boolean NOT NULL DEFAULT false,

  -- Lifecycle
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'viewed', 'converted', 'dismissed')),
  converted_to_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  internal_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incoming_requests_company_status_created
  ON public.incoming_requests (company_id, status, created_at DESC);

CREATE INDEX idx_incoming_requests_company_score
  ON public.incoming_requests (company_id, ai_score DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.touch_incoming_request_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_incoming_requests_update
  BEFORE UPDATE ON public.incoming_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_incoming_request_updated_at();

-- =========================================================================
-- RLS — members read/update, admin+ delete, anon has no direct access
-- (anon writes go through submit-intake-request edge function w/ service role)
-- =========================================================================

ALTER TABLE public.incoming_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY incoming_requests_select ON public.incoming_requests
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY incoming_requests_update ON public.incoming_requests
  FOR UPDATE TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY incoming_requests_delete ON public.incoming_requests
  FOR DELETE TO authenticated
  USING (
    is_company_member(company_id)
    AND company_role(company_id) IN ('owner', 'admin')
  );

-- =========================================================================
-- Helper: safe public lookup of a company by slug.
-- Returns ONLY the fields the public intake form needs. Sensitive columns
-- (default_vat, email_template, etc.) are not exposed.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_company_by_slug(slug text)
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  form_slug text,
  primary_trade text,
  secondary_trades text[],
  base_lat numeric,
  base_lng numeric,
  service_radius_km integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.logo_url,
    c.form_slug,
    COALESCE(bp.primary_trade, 'general')::text AS primary_trade,
    COALESCE(bp.secondary_trades, '{}'::text[])  AS secondary_trades,
    bp.base_lat,
    bp.base_lng,
    bp.service_radius_km
  FROM companies c
  LEFT JOIN company_business_profile bp ON bp.company_id = c.id
  WHERE c.form_slug = slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_company_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_by_slug(text) TO anon, authenticated;
