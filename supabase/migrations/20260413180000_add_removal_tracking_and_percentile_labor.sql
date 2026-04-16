-- AI Learning Improvements
-- 1. Add learning_type column to track both additions and removals
-- 2. Add percentile labor columns to user_trade_profiles

-- ============================================================
-- Layer 4: Add learning type (addition vs removal)
-- ============================================================
ALTER TABLE public.user_material_learnings
  ADD COLUMN IF NOT EXISTS learning_type TEXT NOT NULL DEFAULT 'addition';

-- Backfill existing rows as additions
UPDATE public.user_material_learnings
  SET learning_type = 'addition'
  WHERE learning_type IS NULL;

-- ============================================================
-- Layer 1: Add percentile-based labor columns
-- ============================================================
ALTER TABLE public.user_trade_profiles
  ADD COLUMN IF NOT EXISTS typical_labor_p10 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS typical_labor_p90 NUMERIC NOT NULL DEFAULT 0;
