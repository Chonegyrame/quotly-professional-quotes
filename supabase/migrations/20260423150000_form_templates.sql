-- Lead Filter System — Phase 1, Part 1
-- Creates the form template library used by the public /offert/<slug> flow.
--
-- Two tables:
--   form_templates         — global defaults shipped by Quotly (seeded)
--   company_form_templates — per-firm editable copies (copy-on-first-use later)
--
-- Public read access is required because anonymous customers need to render
-- these templates. Write access is restricted via RLS.

-- =========================================================================
-- 1. form_templates (global library)
-- =========================================================================

CREATE TABLE public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trade text NOT NULL CHECK (trade IN ('el', 'bygg', 'vvs', 'general')),
  sub_type text NOT NULL,
  description text,
  form_schema jsonb NOT NULL,
  red_flag_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade, sub_type)
);

CREATE INDEX idx_form_templates_trade ON public.form_templates (trade);
CREATE INDEX idx_form_templates_active ON public.form_templates (is_active) WHERE is_active;

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or anon) can read active templates.
-- Write path goes through migrations/service role only.
CREATE POLICY form_templates_select_active ON public.form_templates
  FOR SELECT
  USING (is_active = true);

-- =========================================================================
-- 2. company_form_templates (per-firm copies)
-- =========================================================================

CREATE TABLE public.company_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  based_on_template_id uuid REFERENCES public.form_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  trade text NOT NULL CHECK (trade IN ('el', 'bygg', 'vvs', 'general')),
  sub_type text NOT NULL,
  description text,
  form_schema jsonb NOT NULL,
  red_flag_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, sub_type)
);

CREATE INDEX idx_company_form_templates_company
  ON public.company_form_templates (company_id);
CREATE INDEX idx_company_form_templates_active
  ON public.company_form_templates (company_id, is_active)
  WHERE is_active;

ALTER TABLE public.company_form_templates ENABLE ROW LEVEL SECURITY;

-- Anon (and members) can read active per-firm copies — public form needs them.
CREATE POLICY company_form_templates_select_active ON public.company_form_templates
  FOR SELECT
  USING (is_active = true);

-- Members see all their own rows (active or not) for future editing UI.
CREATE POLICY company_form_templates_select_member ON public.company_form_templates
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY company_form_templates_insert ON public.company_form_templates
  FOR INSERT TO authenticated
  WITH CHECK (company_role(company_id) IN ('owner', 'admin'));

CREATE POLICY company_form_templates_update ON public.company_form_templates
  FOR UPDATE TO authenticated
  USING (company_role(company_id) IN ('owner', 'admin'));

CREATE POLICY company_form_templates_delete ON public.company_form_templates
  FOR DELETE TO authenticated
  USING (company_role(company_id) IN ('owner', 'admin'));

-- =========================================================================
-- 3. updated_at triggers
-- =========================================================================

CREATE OR REPLACE FUNCTION public.touch_form_template_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_form_templates_update
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_form_template_updated_at();

CREATE TRIGGER on_company_form_templates_update
  BEFORE UPDATE ON public.company_form_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_form_template_updated_at();
