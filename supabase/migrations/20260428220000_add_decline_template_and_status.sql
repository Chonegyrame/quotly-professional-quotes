-- Decline lead feature: template column + new status value.
--
-- 1. Add `decline_template` to companies — mirrors `email_template` pattern.
-- 2. Extend `incoming_requests.status` CHECK to allow 'declined'.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS decline_template TEXT DEFAULT NULL;

ALTER TABLE public.incoming_requests
  DROP CONSTRAINT IF EXISTS incoming_requests_status_check;

ALTER TABLE public.incoming_requests
  ADD CONSTRAINT incoming_requests_status_check
  CHECK (status IN ('new', 'viewed', 'converted', 'declined', 'dismissed'));
