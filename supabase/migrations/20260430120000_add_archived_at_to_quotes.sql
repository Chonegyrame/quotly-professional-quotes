-- Soft archive support on quotes.
--
-- archived_at = NULL  → quote is active (default view)
-- archived_at = ts    → quote was archived at that time. Survives queries
--                       via the explicit Arkiverade filter / useArchivedQuotes
--                       hook. Restoring clears the timestamp; permanent
--                       deletion is a separate, gated action.
--
-- Applied originally via Supabase MCP on 2026-04-30. This file exists so
-- the migration replays in fresh environments. IF NOT EXISTS keeps it safe
-- against environments that already have the column.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- Active-quotes lookup is the hot path (Dashboard, every list query).
-- Partial index keeps the predicate selective and the index small.
CREATE INDEX IF NOT EXISTS idx_quotes_active_by_company
  ON public.quotes (company_id, created_at DESC)
  WHERE archived_at IS NULL;

COMMENT ON COLUMN public.quotes.archived_at IS
  'Soft-archive timestamp. NULL = active quote. Set by archiveQuote mutation, cleared by restoreQuote.';
