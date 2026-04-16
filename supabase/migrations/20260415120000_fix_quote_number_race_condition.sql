-- Fix race condition in get_next_quote_number by adding advisory lock
-- and add unique constraint on (company_id, quote_number)
CREATE OR REPLACE FUNCTION public.get_next_quote_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq INTEGER;
  year_str TEXT;
BEGIN
  -- Advisory lock scoped to the company to prevent concurrent duplicates
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT));

  year_str := to_char(now(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(
      NULLIF(
        substring(quote_number FROM '-(\d+)$'), ''
      ) AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM public.quotes
  WHERE company_id = p_company_id
    AND quote_number LIKE 'Q-' || year_str || '-%';

  RETURN 'Q-' || year_str || '-' || LPAD(next_seq::TEXT, 3, '0');
END;
$$;

-- Add unique constraint to prevent duplicates at DB level
-- First clean up any existing duplicates by appending a suffix
DO $$
DECLARE
  dup RECORD;
  counter INTEGER;
BEGIN
  FOR dup IN
    SELECT company_id, quote_number
    FROM public.quotes
    GROUP BY company_id, quote_number
    HAVING COUNT(*) > 1
  LOOP
    counter := 0;
    FOR dup IN
      SELECT id FROM public.quotes
      WHERE company_id = dup.company_id AND quote_number = dup.quote_number
      ORDER BY created_at
      OFFSET 1
    LOOP
      counter := counter + 1;
      UPDATE public.quotes SET quote_number = quote_number || '-dup' || counter WHERE id = dup.id;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.quotes ADD CONSTRAINT quotes_company_quote_number_unique UNIQUE (company_id, quote_number);
