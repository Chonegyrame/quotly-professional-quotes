-- ROT cap math support on quotes.
--
-- rot_eligible                    : did the customer mark ROT=ja on the
--                                   intake form (or did the firm later set
--                                   it manually). NULL = unknown / not set.
-- customer_rot_remaining_at_quote : customer's stated ROT-utrymme remaining
--                                   for the year, frozen at quote-creation
--                                   time. Self-reported, not verified
--                                   against Skatteverket. In SEK.
-- rot_discount_amount             : the calculated ROT discount applied to
--                                   this quote. Computed deterministically
--                                   as min(0.30 × labor_inc_moms, cap). In
--                                   SEK. NULL when rot_eligible is false /
--                                   null. Stored so we can audit / display
--                                   without recomputing.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS rot_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS customer_rot_remaining_at_quote INTEGER,
  ADD COLUMN IF NOT EXISTS rot_discount_amount INTEGER;

COMMENT ON COLUMN public.quotes.rot_eligible IS
  'Customer declared ROT eligibility on the intake form (rot=ja). Null until the firm or customer answers.';
COMMENT ON COLUMN public.quotes.customer_rot_remaining_at_quote IS
  'Customer self-reported ROT-utrymme remaining (SEK). Frozen at quote-creation time. Not verified against Skatteverket.';
COMMENT ON COLUMN public.quotes.rot_discount_amount IS
  'Computed ROT discount (SEK) at quote-creation time. min(0.30 * labor_inc_moms, customer_rot_remaining_at_quote).';
