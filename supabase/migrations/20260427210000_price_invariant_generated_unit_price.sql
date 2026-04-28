-- Migration: enforce the per-unit price identity by making unit_price a
-- generated (computed) column on the catalog tables. Eliminates the class
-- of bugs where unit_price drifts from purchase_price * (1 + markup_percent/100)
-- and breaks the saved-price catalog poisoning loop at the schema level.
--
-- Affected tables: public.materials, public.trade_materials
-- NOT affected: public.quote_item_materials (intentionally — that table now
-- carries unit_price as an immutable snapshot taken at quote-save time, so
-- historical PDFs stay stable even if catalog prices change later).
--
-- Strategy:
--   1. Reconcile existing rows whose three fields drift > 5%. Trust
--      unit_price (most stable per-unit value), back-derive purchase_price.
--   2. Drop unit_price column.
--   3. Re-add as GENERATED ALWAYS AS (...) STORED so it is no longer
--      directly writable. All future INSERT/UPDATE statements that include
--      unit_price will fail at the database level — application code must
--      stop writing it.
--   4. Add upper-bound CHECK on markup_percent so future writes can't smuggle
--      absurd markups into the catalog.

-- ---------------------------------------------------------------------------
-- Step 1: reconcile drifted rows in materials
-- ---------------------------------------------------------------------------
-- Markup > 0: trust unit_price, back-calc purchase_price.
UPDATE public.materials
SET purchase_price = unit_price / (1 + markup_percent / 100.0)
WHERE is_deleted = false
  AND unit_price > 0
  AND markup_percent > 0
  AND ABS(unit_price - purchase_price * (1 + markup_percent / 100.0)) / unit_price > 0.05;

-- Markup = 0 (selling at cost): purchase_price must equal unit_price.
UPDATE public.materials
SET purchase_price = unit_price
WHERE is_deleted = false
  AND unit_price > 0
  AND markup_percent = 0
  AND ABS(unit_price - purchase_price) > 0.01;

-- ---------------------------------------------------------------------------
-- Step 2 & 3: drop and re-add unit_price as a generated column
-- ---------------------------------------------------------------------------
ALTER TABLE public.materials
  DROP COLUMN unit_price;

ALTER TABLE public.materials
  ADD COLUMN unit_price NUMERIC GENERATED ALWAYS AS
    (purchase_price * (1 + markup_percent / 100.0)) STORED;

ALTER TABLE public.trade_materials
  DROP COLUMN unit_price;

ALTER TABLE public.trade_materials
  ADD COLUMN unit_price NUMERIC GENERATED ALWAYS AS
    (purchase_price * (1 + markup_percent / 100.0)) STORED;

-- ---------------------------------------------------------------------------
-- Step 4: add upper-bound CHECK on markup_percent
-- (existing materials_markup_percent_nonnegative and
--  trade_materials_markup_percent_nonnegative cover the lower bound)
-- ---------------------------------------------------------------------------
ALTER TABLE public.materials
  ADD CONSTRAINT materials_markup_percent_sane_upper
    CHECK (markup_percent <= 1000);

ALTER TABLE public.trade_materials
  ADD CONSTRAINT trade_materials_markup_percent_sane_upper
    CHECK (markup_percent <= 1000);
