-- Prune ambiguous trigger keywords from bygg/allman.
--
-- `fönster` and `dörr` were in the seeded list as cues for jobs like "byta
-- fönster" / "byta dörr", but these words are mentioned incidentally in many
-- other bygg job descriptions (renoveringar, tillbyggnader, attefall, badrum,
-- etc). They were causing false positives in the classifier — e.g. an "uterum
-- med stora fönster" request matched bygg/allman *and* bygg/tillbyggnad with
-- 1 hit each, and the wrong one won on tie-break order.
--
-- Removing these two so bygg/allman only triggers on words that strongly
-- indicate the catch-all renovation form. The new tie-break logic in
-- classify-intake-request will fall through to AI when keyword counts tie.

UPDATE public.form_templates
SET trigger_keywords = ARRAY[
  'målning','måla','golv','parkett','innervägg','tapet','tapetsering'
]
WHERE trade='bygg' AND sub_type='allman';
