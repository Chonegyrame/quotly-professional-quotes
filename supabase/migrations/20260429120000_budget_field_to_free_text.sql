-- Convert all "Ungefärlig budget" fields from single_select bucket choices
-- to free-text input. Customers know their budget number better than which
-- bracket it falls into, and the bucketing felt patronizing in user testing.
-- The akut-läcka template's "Hur vill ni debiteras?" field also uses id='budget'
-- but a different label, and that one stays as-is (it's a billing-model
-- choice, not a budget figure).

UPDATE public.form_templates
SET form_schema = jsonb_set(
  form_schema,
  '{fields}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = 'budget' AND elem->>'label' = 'Ungefärlig budget'
        THEN jsonb_build_object(
          'id', 'budget',
          'label', 'Ungefärlig budget',
          'type', 'short_text',
          'required', true,
          'help', 'T.ex. 100 000 kr, max 150 000 kr, eller "flexibel".'
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(form_schema->'fields') AS elem
  )
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(form_schema->'fields') AS elem
  WHERE elem->>'id' = 'budget' AND elem->>'label' = 'Ungefärlig budget'
);
