-- Replace free-text estimated_time with structured numeric fields
ALTER TABLE public.quotes
  DROP COLUMN estimated_time,
  ADD COLUMN estimated_days INTEGER,
  ADD COLUMN estimated_hours INTEGER;
