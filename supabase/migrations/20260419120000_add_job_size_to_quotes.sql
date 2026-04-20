-- ============================================================
-- Job size for AI-generated quotes
-- ============================================================
-- Optional structured size input (e.g. 25 kvm, 40 m, 3 m3).
-- Fed into the Claude prompt as an OMFATTNING line so the AI
-- can scale material quantities against a concrete anchor,
-- instead of parsing size from free-text prose.
--
-- Also the foundation for Phase 2 per-user ratio learning
-- (quantity / job_size → e.g. "0.125 L paint per kvm"),
-- which will be built in a separate plan.
--
-- Both columns nullable. Manual quotes and AI quotes where the
-- user skips the optional field leave both as NULL.
-- ============================================================

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS job_size      numeric,
  ADD COLUMN IF NOT EXISTS job_size_unit text;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_job_size_positive_check
    CHECK (job_size IS NULL OR job_size > 0);

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_job_size_unit_allowed_check
    CHECK (job_size_unit IS NULL OR job_size_unit IN ('kvm','m','m3'));

-- Both set or both null — never one without the other.
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_job_size_pair_check
    CHECK ((job_size IS NULL) = (job_size_unit IS NULL));
