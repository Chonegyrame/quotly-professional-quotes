-- Lead Filter System — Phase 0, Part 2
-- Adds `company_business_profile` — the "business brain" that the lead
-- scoring AI will use to filter incoming requests per firm.
-- One row per company. Captured during onboarding and editable in Settings.

-- =========================================================================
-- 1. Table
-- =========================================================================

CREATE TABLE public.company_business_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Trade identity
  primary_trade text NOT NULL CHECK (primary_trade IN ('el', 'bygg', 'vvs', 'general')),
  secondary_trades text[] NOT NULL DEFAULT '{}',

  -- Geography
  service_areas text[] NOT NULL DEFAULT '{}',
  max_travel_km integer,

  -- Commercial filters
  min_ticket_sek integer,

  -- Free-form positioning tags (e.g. "laddbox", "äldre fastigheter")
  specialties text[] NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_profile_company ON public.company_business_profile (company_id);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_business_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_profile_update
  BEFORE UPDATE ON public.company_business_profile
  FOR EACH ROW EXECUTE FUNCTION public.touch_business_profile_updated_at();

-- =========================================================================
-- 2. RLS — member-scoped like other firm tables
-- =========================================================================

ALTER TABLE public.company_business_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_profile_select ON public.company_business_profile
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY business_profile_insert ON public.company_business_profile
  FOR INSERT TO authenticated
  WITH CHECK (is_company_member(company_id));

CREATE POLICY business_profile_update ON public.company_business_profile
  FOR UPDATE TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY business_profile_delete ON public.company_business_profile
  FOR DELETE TO authenticated
  USING (
    is_company_member(company_id)
    AND company_role(company_id) IN ('owner', 'admin')
  );
