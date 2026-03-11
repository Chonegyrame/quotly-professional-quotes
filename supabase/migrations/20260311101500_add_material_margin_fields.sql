ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS purchase_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup_percent numeric NOT NULL DEFAULT 0;

UPDATE public.materials
SET purchase_price = unit_price
WHERE purchase_price = 0 AND unit_price > 0;

ALTER TABLE public.materials
  DROP CONSTRAINT IF EXISTS materials_purchase_price_nonnegative;
ALTER TABLE public.materials
  ADD CONSTRAINT materials_purchase_price_nonnegative CHECK (purchase_price >= 0);

ALTER TABLE public.materials
  DROP CONSTRAINT IF EXISTS materials_markup_percent_nonnegative;
ALTER TABLE public.materials
  ADD CONSTRAINT materials_markup_percent_nonnegative CHECK (markup_percent >= 0);

ALTER TABLE public.quote_item_materials
  ADD COLUMN IF NOT EXISTS purchase_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup_percent numeric NOT NULL DEFAULT 0;

UPDATE public.quote_item_materials
SET purchase_price = unit_price
WHERE purchase_price = 0 AND unit_price > 0;

ALTER TABLE public.quote_item_materials
  DROP CONSTRAINT IF EXISTS quote_item_materials_purchase_price_nonnegative;
ALTER TABLE public.quote_item_materials
  ADD CONSTRAINT quote_item_materials_purchase_price_nonnegative CHECK (purchase_price >= 0);

ALTER TABLE public.quote_item_materials
  DROP CONSTRAINT IF EXISTS quote_item_materials_markup_percent_nonnegative;
ALTER TABLE public.quote_item_materials
  ADD CONSTRAINT quote_item_materials_markup_percent_nonnegative CHECK (markup_percent >= 0);

