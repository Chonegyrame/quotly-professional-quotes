-- ============================================================
-- AI offer quality measurement
-- ============================================================
-- Stashes the material-level diff counts (additions + removals)
-- on the quote row itself, so we can compute p25/p50/p75 of
-- "how much did the user edit AI-generated quotes before sending".
--
-- Null for manual quotes and for AI quotes not yet sent.
-- Populated by recompute-user-profile on send, using the same
-- diff that already feeds Layer 4.
-- ============================================================

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS ai_materials_added   INT,
  ADD COLUMN IF NOT EXISTS ai_materials_removed INT;
