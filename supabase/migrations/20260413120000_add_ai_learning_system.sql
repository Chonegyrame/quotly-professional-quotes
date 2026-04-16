-- AI Learning System
-- Adds three layers of intelligence to quote generation:
-- Layer 1: Statistical user profiles per trade
-- Layer 2: Job pattern recognition via material similarity
-- Layer 4: Correction learnings from AI-generated quote edits

-- ============================================================
-- Quotes table: add AI tracking columns
-- ============================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS ai_suggestions JSONB,
  ADD COLUMN IF NOT EXISTS material_fingerprint TEXT[];

-- ============================================================
-- Layer 1: Statistical profile per user per trade
-- ============================================================
CREATE TABLE public.user_trade_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  total_quotes INT NOT NULL DEFAULT 0,
  common_materials JSONB NOT NULL DEFAULT '[]',
  typical_labor_min NUMERIC NOT NULL DEFAULT 0,
  typical_labor_max NUMERIC NOT NULL DEFAULT 0,
  typical_labor_avg NUMERIC NOT NULL DEFAULT 0,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, trade)
);

ALTER TABLE public.user_trade_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trade profiles"
  ON public.user_trade_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own trade profiles"
  ON public.user_trade_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trade profiles"
  ON public.user_trade_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own trade profiles"
  ON public.user_trade_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Layer 2: Recognized job patterns
-- ============================================================
CREATE TABLE public.user_job_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  pattern_keywords TEXT[] NOT NULL DEFAULT '{}',
  occurrence_count INT NOT NULL DEFAULT 0,
  common_materials JSONB NOT NULL DEFAULT '[]',
  typical_line_items JSONB NOT NULL DEFAULT '[]',
  avg_total_labor NUMERIC NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_job_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own job patterns"
  ON public.user_job_patterns FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own job patterns"
  ON public.user_job_patterns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own job patterns"
  ON public.user_job_patterns FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own job patterns"
  ON public.user_job_patterns FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Layer 4: Correction learnings (one row per occurrence)
-- ============================================================
CREATE TABLE public.user_material_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  job_keywords TEXT[] NOT NULL DEFAULT '{}',
  material_name TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_material_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own material learnings"
  ON public.user_material_learnings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own material learnings"
  ON public.user_material_learnings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own material learnings"
  ON public.user_material_learnings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for fast lookups during generation
CREATE INDEX idx_user_trade_profiles_lookup
  ON public.user_trade_profiles(user_id, trade);

CREATE INDEX idx_user_job_patterns_lookup
  ON public.user_job_patterns(user_id, trade);

CREATE INDEX idx_user_job_patterns_keywords
  ON public.user_job_patterns USING gin(pattern_keywords);

CREATE INDEX idx_user_material_learnings_lookup
  ON public.user_material_learnings(user_id, trade);

CREATE INDEX idx_quotes_material_fingerprint
  ON public.quotes USING gin(material_fingerprint);

CREATE INDEX idx_quotes_trade_keywords
  ON public.quotes(trade);

CREATE INDEX idx_quotes_keywords
  ON public.quotes USING gin(keywords);
