-- Insert a conditional follow-up field "rot_utrymme_kvar" right after every
-- existing rot field. Visible only when rot = 'ja'. Default value 50 000
-- (the annual ROT cap per person, 2026 rule), editable so customers who
-- have already used some of their cap can correct it. Captured value is
-- read at quote-generation time to cap the ROT discount.

UPDATE public.form_templates
SET form_schema = jsonb_set(
  form_schema,
  '{fields}',
  (
    WITH src AS (
      SELECT
        elem,
        ord,
        elem->>'id' AS field_id
      FROM jsonb_array_elements(form_schema->'fields') WITH ORDINALITY AS t(elem, ord)
    ),
    expanded AS (
      SELECT elem, ord, 0 AS sub
      FROM src
      UNION ALL
      SELECT
        jsonb_build_object(
          'id', 'rot_utrymme_kvar',
          'label', 'ROT-utrymme kvar i år (kr)',
          'type', 'number',
          'required', false,
          'default', 50000,
          'visible_when', jsonb_build_object('field', 'rot', 'value', 'ja'),
          'help', 'Du har max 50 000 kr ROT-avdrag per år. Justera om du redan använt en del på ett annat jobb.'
        ) AS elem,
        ord,
        1 AS sub
      FROM src
      WHERE field_id = 'rot'
    )
    SELECT jsonb_agg(elem ORDER BY ord, sub)
    FROM expanded
  )
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(form_schema->'fields') AS elem
  WHERE elem->>'id' = 'rot'
);
