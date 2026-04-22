-- Firm Model Migration — Chunk B: Learning system firm-scoping
-- Drops the three user-scoped learning tables (all three are sparse on prod:
-- 3 rows in user_trade_profiles, 0 in the others) and recreates them keyed
-- by company_id. Replaces replace_user_job_patterns RPC with
-- replace_company_job_patterns. Adds company_id column to recompute_metrics.

-- =========================================================================
-- 1. Drop old user-scoped learning tables + old RPC
--    CASCADE drops the associated RLS policies.
-- =========================================================================

DROP FUNCTION IF EXISTS public.replace_user_job_patterns(uuid, text, jsonb);
DROP TABLE IF EXISTS public.user_trade_profiles CASCADE;
DROP TABLE IF EXISTS public.user_job_patterns CASCADE;
DROP TABLE IF EXISTS public.user_material_learnings CASCADE;

-- =========================================================================
-- 2. company_trade_profiles (Layer 1)
-- =========================================================================

CREATE TABLE public.company_trade_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade text NOT NULL,
  total_quotes integer NOT NULL DEFAULT 0,
  common_materials jsonb NOT NULL DEFAULT '[]',
  typical_labor_min numeric NOT NULL DEFAULT 0,
  typical_labor_max numeric NOT NULL DEFAULT 0,
  typical_labor_avg numeric NOT NULL DEFAULT 0,
  typical_labor_p10 numeric NOT NULL DEFAULT 0,
  typical_labor_p90 numeric NOT NULL DEFAULT 0,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, trade)
);

CREATE INDEX idx_company_trade_profiles_company
  ON public.company_trade_profiles (company_id);

ALTER TABLE public.company_trade_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_trade_profiles_select ON public.company_trade_profiles
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY company_trade_profiles_service ON public.company_trade_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================================
-- 3. company_job_patterns (Layer 2)
-- =========================================================================

CREATE TABLE public.company_job_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade text NOT NULL,
  pattern_keywords text[] NOT NULL DEFAULT '{}',
  occurrence_count integer NOT NULL DEFAULT 0,
  common_materials jsonb NOT NULL DEFAULT '[]',
  typical_line_items jsonb NOT NULL DEFAULT '[]',
  avg_total_labor numeric NOT NULL DEFAULT 0,
  member_quote_ids uuid[],
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_job_patterns_company_trade
  ON public.company_job_patterns (company_id, trade);

ALTER TABLE public.company_job_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_job_patterns_select ON public.company_job_patterns
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY company_job_patterns_service ON public.company_job_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================================
-- 4. company_material_learnings (Layer 4)
-- =========================================================================

CREATE TABLE public.company_material_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade text NOT NULL,
  job_keywords text[] NOT NULL DEFAULT '{}',
  material_name text NOT NULL,
  learning_type text NOT NULL CHECK (learning_type IN ('addition', 'removal')),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_material_learnings_company_trade
  ON public.company_material_learnings (company_id, trade);

CREATE UNIQUE INDEX uq_company_material_learnings_quote_material_type
  ON public.company_material_learnings (quote_id, material_name, learning_type)
  WHERE quote_id IS NOT NULL;

ALTER TABLE public.company_material_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_material_learnings_select ON public.company_material_learnings
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY company_material_learnings_service ON public.company_material_learnings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================================
-- 5. Atomic replace RPC for company_job_patterns
--    Same pattern as replace_user_job_patterns from Chunk A — DELETE+INSERT
--    in one transaction so a mid-call timeout can't leave a firm with zero
--    patterns.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.replace_company_job_patterns(
  p_company_id uuid,
  p_trade text,
  p_patterns jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.company_job_patterns
  WHERE company_id = p_company_id AND trade = p_trade;

  IF p_patterns IS NOT NULL AND jsonb_array_length(p_patterns) > 0 THEN
    INSERT INTO public.company_job_patterns (
      company_id, trade, pattern_keywords, occurrence_count,
      common_materials, typical_line_items, avg_total_labor,
      member_quote_ids, last_updated_at
    )
    SELECT
      p_company_id,
      p_trade,
      ARRAY(SELECT jsonb_array_elements_text(elem->'pattern_keywords')),
      (elem->>'occurrence_count')::int,
      COALESCE(elem->'common_materials', '[]'::jsonb),
      COALESCE(elem->'typical_line_items', '[]'::jsonb),
      (elem->>'avg_total_labor')::numeric,
      ARRAY(SELECT jsonb_array_elements_text(elem->'member_quote_ids'))::uuid[],
      now()
    FROM jsonb_array_elements(p_patterns) elem;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_company_job_patterns(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_company_job_patterns(uuid, text, jsonb) TO service_role;

-- =========================================================================
-- 6. Add company_id to recompute_metrics for firm-scoped observability.
--    user_id remains as the invoker; company_id is what the recompute ran against.
-- =========================================================================

ALTER TABLE public.recompute_metrics
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recompute_metrics_company
  ON public.recompute_metrics (company_id);
