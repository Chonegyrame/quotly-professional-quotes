-- Add completed_at timestamp and actual_hours to quotes
ALTER TABLE public.quotes
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN actual_hours INTEGER;
