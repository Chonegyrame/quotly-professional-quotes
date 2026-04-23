-- Lead Filter System — Phase 0, Part 1
-- Adds `form_slug` to companies + auto-populates via trigger on insert.
-- The slug is the public URL fragment: quotly.se/offert/<form_slug>
--
-- Slug format: lowercased company name, non-alphanumerics collapsed to '-',
-- trimmed, then '-' + first 8 chars of a random UUID appended for uniqueness.
-- Using UUID-based suffix avoids collision retry logic entirely.

-- =========================================================================
-- 1. Helper: slugify
-- =========================================================================

CREATE OR REPLACE FUNCTION public.slugify_company_name(input text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    trim(both '-' FROM
      regexp_replace(
        translate(
          lower(coalesce(input, 'firm')),
          'åäöéèêáàâíìîóòôúùûñç',
          'aaoeeeaaaiiiooouuunc'
        ),
        '[^a-z0-9]+', '-', 'g'
      )
    );
$$;

-- =========================================================================
-- 2. Column + unique index
-- =========================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS form_slug text;

-- Unique when present (allows NULL pre-backfill, but trigger will fill it going forward)
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_form_slug
  ON public.companies (form_slug)
  WHERE form_slug IS NOT NULL;

-- =========================================================================
-- 3. Trigger: auto-fill form_slug on insert if not provided
-- =========================================================================

CREATE OR REPLACE FUNCTION public.set_company_form_slug()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_slug text;
  suffix text;
BEGIN
  IF NEW.form_slug IS NULL OR NEW.form_slug = '' THEN
    base_slug := slugify_company_name(NEW.name);
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'firm';
    END IF;
    suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    NEW.form_slug := base_slug || '-' || suffix;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_set_form_slug ON public.companies;
CREATE TRIGGER on_company_set_form_slug
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_company_form_slug();

-- =========================================================================
-- 4. Backfill existing companies
-- =========================================================================

UPDATE public.companies
SET form_slug =
  slugify_company_name(name) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
WHERE form_slug IS NULL;
