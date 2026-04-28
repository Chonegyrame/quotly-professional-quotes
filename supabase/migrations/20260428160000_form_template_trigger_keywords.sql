-- Form templates: add trigger_keywords + relax UNIQUE constraint on company copies
--
-- Adds a `trigger_keywords text[]` column to both form_templates (global library)
-- and company_form_templates (per-firm copies). The classify-intake-request edge
-- function will check these for direct keyword hits before falling through to AI.
--
-- Also relaxes the UNIQUE (company_id, sub_type) constraint on the per-firm
-- table so a firm can have multiple custom forms in the same sub_type.
-- Names must still be unique per firm.
--
-- Seeds sensible Swedish triggerord on the 16 standard templates so the
-- keyword classifier works out of the box for all firms.

-- =========================================================================
-- 1. Add trigger_keywords columns
-- =========================================================================

ALTER TABLE public.form_templates
  ADD COLUMN IF NOT EXISTS trigger_keywords text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.company_form_templates
  ADD COLUMN IF NOT EXISTS trigger_keywords text[] NOT NULL DEFAULT '{}';

-- =========================================================================
-- 2. Relax UNIQUE on company_form_templates
-- =========================================================================

ALTER TABLE public.company_form_templates
  DROP CONSTRAINT IF EXISTS company_form_templates_company_id_sub_type_key;

ALTER TABLE public.company_form_templates
  ADD CONSTRAINT company_form_templates_company_id_name_key
  UNIQUE (company_id, name);

-- =========================================================================
-- 3. Seed Swedish trigger keywords on the 16 standard templates
-- =========================================================================

-- EL
UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'eluttag','vägguttag','stickkontakt','strömbrytare','lampa','belysning','kabeldragning'
] WHERE trade='el' AND sub_type='allman';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'felsökning','elfel','strömavbrott','säkring','kortslutning','proppen gick','funkar inte'
] WHERE trade='el' AND sub_type='felsokning';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'elcentral','proppskåp','gruppcentral','jordfelsbrytare','säkringsskåp'
] WHERE trade='el' AND sub_type='gruppcentralbyte';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'laddbox','laddstolpe','elbilsladdare','bilsladdare','ev-laddare','wallbox'
] WHERE trade='el' AND sub_type='laddbox';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'solceller','solpaneler','solpanel','växelriktare','solenergi'
] WHERE trade='el' AND sub_type='solceller';

-- BYGG
UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'målning','måla','golv','parkett','dörr','fönster','innervägg','tapet','tapetsering'
] WHERE trade='bygg' AND sub_type='allman';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'altan','uteplats','terrass','trädäck','pergola','staket'
] WHERE trade='bygg' AND sub_type='altan';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'badrumsrenovering','kakel','klinker','renovera badrum'
] WHERE trade='bygg' AND sub_type='badrum';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'köksrenovering','köksinredning','köksluckor','bänkskiva','renovera kök'
] WHERE trade='bygg' AND sub_type='kok';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'tillbyggnad','utbyggnad','attefall','attefallshus','uterum','friggebod'
] WHERE trade='bygg' AND sub_type='tillbyggnad';

-- VVS
UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'kran','blandare','vvs','rör','avlopp','stopp i avlopp','wc','toalett'
] WHERE trade='vvs' AND sub_type='allman';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'dusch','golvbrunn','toalettstol','handfat','badrumskran'
] WHERE trade='vvs' AND sub_type='badrum';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'diskmaskin','köksblandare','diskbänk','vatten i kök'
] WHERE trade='vvs' AND sub_type='kok';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'värmepump','bergvärme','luftvärmepump','frånluftsvärmepump','luft-vatten','luft-luft'
] WHERE trade='vvs' AND sub_type='varmepump';

UPDATE public.form_templates SET trigger_keywords = ARRAY[
  'vattenskada','läckage','läcker','rörbrott','vattenläcka','fuktskada','översvämning'
] WHERE trade='vvs' AND sub_type='vattenskada';

-- general/allman intentionally has no triggerord — it's the AI-fallback catch-all.
