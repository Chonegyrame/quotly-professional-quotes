-- Firm Model Migration — Chunk A, Part 2: RLS rewrite
-- Drops user_id-based policies on 7 tables and replaces them with
-- membership-based policies. Preserves all existing anon/public policies
-- that power the /q/:id customer view.
-- Also adds a trigger on companies that auto-creates the owner membership
-- when a new company is inserted, so the signup flow keeps working.

-- =========================================================================
-- 0. Auto-create owner membership on company insert
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.company_memberships (company_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- =========================================================================
-- 1. companies
-- =========================================================================

DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;

CREATE POLICY companies_select ON public.companies
  FOR SELECT TO authenticated
  USING (is_company_member(id));

-- Keep the original-creator check on insert so signup flow works unchanged.
-- The trigger above promotes the inserting user to owner.
CREATE POLICY companies_insert ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY companies_update ON public.companies
  FOR UPDATE TO authenticated
  USING (company_role(id) IN ('owner', 'admin'));

-- =========================================================================
-- 2. quotes
-- =========================================================================

DROP POLICY IF EXISTS "Users can view own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete own quotes" ON public.quotes;

CREATE POLICY quotes_select ON public.quotes
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY quotes_insert ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (is_company_member(company_id));

CREATE POLICY quotes_update ON public.quotes
  FOR UPDATE TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY quotes_delete ON public.quotes
  FOR DELETE TO authenticated
  USING (
    is_company_member(company_id)
    AND company_role(company_id) IN ('owner', 'admin')
  );

-- =========================================================================
-- 3. quote_items (child of quotes)
-- =========================================================================

DROP POLICY IF EXISTS "Users can manage quote items via quote" ON public.quote_items;

CREATE POLICY quote_items_all ON public.quote_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
        AND is_company_member(q.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
        AND is_company_member(q.company_id)
    )
  );

-- =========================================================================
-- 4. quote_item_materials (grandchild via quote_items -> quotes)
-- =========================================================================

DROP POLICY IF EXISTS "Users can manage own quote item materials" ON public.quote_item_materials;

CREATE POLICY quote_item_materials_all ON public.quote_item_materials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_items qi
      JOIN public.quotes q ON q.id = qi.quote_id
      WHERE qi.id = quote_item_materials.quote_item_id
        AND is_company_member(q.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quote_items qi
      JOIN public.quotes q ON q.id = qi.quote_id
      WHERE qi.id = quote_item_materials.quote_item_id
        AND is_company_member(q.company_id)
    )
  );

-- =========================================================================
-- 5. quote_events (child of quotes)
-- =========================================================================

DROP POLICY IF EXISTS "Users can manage quote events via quote" ON public.quote_events;

CREATE POLICY quote_events_all ON public.quote_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_events.quote_id
        AND is_company_member(q.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_events.quote_id
        AND is_company_member(q.company_id)
    )
  );

-- =========================================================================
-- 6. materials
-- =========================================================================

DROP POLICY IF EXISTS "Users can manage own materials" ON public.materials;

CREATE POLICY materials_select ON public.materials
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY materials_insert ON public.materials
  FOR INSERT TO authenticated
  WITH CHECK (is_company_member(company_id));

CREATE POLICY materials_update ON public.materials
  FOR UPDATE TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY materials_delete ON public.materials
  FOR DELETE TO authenticated
  USING (
    is_company_member(company_id)
    AND company_role(company_id) IN ('owner', 'admin')
  );

-- =========================================================================
-- 7. quote_templates
-- =========================================================================

DROP POLICY IF EXISTS "Users can manage own templates" ON public.quote_templates;

CREATE POLICY quote_templates_select ON public.quote_templates
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY quote_templates_insert ON public.quote_templates
  FOR INSERT TO authenticated
  WITH CHECK (is_company_member(company_id));

CREATE POLICY quote_templates_update ON public.quote_templates
  FOR UPDATE TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY quote_templates_delete ON public.quote_templates
  FOR DELETE TO authenticated
  USING (
    is_company_member(company_id)
    AND company_role(company_id) IN ('owner', 'admin')
  );
