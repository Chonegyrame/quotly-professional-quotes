-- Migrate ai_tier from 3-tier (Hett/Ljummet/Kallt) to 4-tier
-- (Mycket stark/Stark/Mellan/Svag) lead scoring.
--
-- Threshold changes:
--   Old: Hett 75+, Ljummet 45-74, Kallt 0-44
--   New: Mycket stark 85+, Stark 70-84, Mellan 50-69, Svag 0-49
--
-- Existing rows are remapped from ai_score (not the old tier name) so
-- requests near the boundaries land in the right new bucket. The score
-- itself is unchanged — only the tier label moves.

BEGIN;

-- 1. Drop the old CHECK constraint so the UPDATE can write new values.
ALTER TABLE public.incoming_requests
  DROP CONSTRAINT IF EXISTS incoming_requests_ai_tier_check;

-- 2. Remap existing rows from score.
UPDATE public.incoming_requests
SET ai_tier = CASE
  WHEN ai_score IS NULL THEN NULL
  WHEN ai_score >= 85 THEN 'Mycket stark'
  WHEN ai_score >= 70 THEN 'Stark'
  WHEN ai_score >= 50 THEN 'Mellan'
  ELSE 'Svag'
END
WHERE ai_tier IS NOT NULL;

-- 3. Add the new CHECK constraint with the 4 tier values.
ALTER TABLE public.incoming_requests
  ADD CONSTRAINT incoming_requests_ai_tier_check
  CHECK (ai_tier IN ('Mycket stark', 'Stark', 'Mellan', 'Svag'));

COMMIT;
