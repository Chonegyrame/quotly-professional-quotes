
CREATE TABLE public.quote_item_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id uuid NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'st',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_item_materials ENABLE ROW LEVEL SECURITY;

-- Public can view (for customer view)
CREATE POLICY "Public can view quote item materials"
  ON public.quote_item_materials FOR SELECT
  USING (true);

-- Owners can manage via quote chain
CREATE POLICY "Users can manage own quote item materials"
  ON public.quote_item_materials FOR ALL
  USING (
    quote_item_id IN (
      SELECT qi.id FROM public.quote_items qi
      JOIN public.quotes q ON qi.quote_id = q.id
      JOIN public.companies c ON q.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );
