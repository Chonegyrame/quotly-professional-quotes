-- =========================================================================
-- get_quote_company_branding
--
-- Safe public lookup of company branding (logo, name, contact info) for a
-- given quote. Used by CustomerView (/q/:id) to render a polished quote
-- that matches the formal PDF style.
--
-- SECURITY DEFINER bypasses RLS but returns ONLY the explicitly whitelisted
-- columns. Adding new columns to public.companies does NOT auto-expose them —
-- this function must be edited and re-deployed to include them.
--
-- Whitelisted columns (all of these already appear on the customer-facing
-- PDF, so exposing them here matches the customer's existing trust surface):
--   name, org_number, address, phone, email, logo_url, bankgiro
--
-- Explicitly NOT exposed: user_id, default_vat, default_validity_days,
-- email_template, created_at, or any subscription / billing fields.
--
-- Mirrors the safe-lookup pattern already established by
-- get_company_by_slug() in 20260423170000_incoming_requests.sql.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_quote_company_branding(p_quote_id uuid)
RETURNS TABLE (
  name text,
  org_number text,
  address text,
  phone text,
  email text,
  logo_url text,
  bankgiro text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.name,
    c.org_number,
    c.address,
    c.phone,
    c.email,
    c.logo_url,
    c.bankgiro
  FROM public.quotes q
  JOIN public.companies c ON c.id = q.company_id
  WHERE q.id = p_quote_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_quote_company_branding(uuid) TO anon, authenticated;
