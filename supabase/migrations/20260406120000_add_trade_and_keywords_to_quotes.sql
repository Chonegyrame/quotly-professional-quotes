-- Add trade and keywords columns to quotes
ALTER TABLE public.quotes
  ADD COLUMN trade TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN keywords TEXT[];
