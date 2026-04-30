-- Track when an accepted quote has been pushed to the firm's Fortnox
-- as a draft invoice. Set by create-fortnox-invoice edge function on
-- success. Surfaced as a "Synkad till Fortnox · #12345" badge on
-- QuoteDetail and used to gate the "Skicka till Fortnox" button so
-- the same quote isn't pushed twice by accident.
--
-- fortnox_invoice_number : Fortnox's own invoice number for the draft
--                          (their DocumentNumber, integer-as-string).
--                          NULL until the quote is synced.
-- fortnox_synced_at      : Timestamp of the successful sync. NULL when
--                          unsynced. If the firm wants to re-sync (after
--                          editing the quote), the edge function may
--                          update both columns to point at a new draft.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS fortnox_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS fortnox_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quotes.fortnox_invoice_number IS
  'Fortnox DocumentNumber for the draft invoice created from this quote. NULL when unsynced.';
COMMENT ON COLUMN public.quotes.fortnox_synced_at IS
  'When this quote was last successfully pushed to Fortnox. NULL when unsynced.';
