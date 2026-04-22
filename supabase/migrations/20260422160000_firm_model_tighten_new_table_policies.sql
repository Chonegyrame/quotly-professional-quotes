-- Tighten: new-table policies had no TO clause, defaulted to PUBLIC.
-- Switch them to TO authenticated for defense-in-depth + consistency.

DROP POLICY IF EXISTS memberships_select ON public.company_memberships;
DROP POLICY IF EXISTS memberships_insert ON public.company_memberships;
DROP POLICY IF EXISTS memberships_update ON public.company_memberships;
DROP POLICY IF EXISTS memberships_delete ON public.company_memberships;

CREATE POLICY memberships_select ON public.company_memberships
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY memberships_insert ON public.company_memberships
  FOR INSERT TO authenticated
  WITH CHECK (company_role(company_id) IN ('owner', 'admin'));

CREATE POLICY memberships_update ON public.company_memberships
  FOR UPDATE TO authenticated
  USING (company_role(company_id) = 'owner');

CREATE POLICY memberships_delete ON public.company_memberships
  FOR DELETE TO authenticated
  USING (
    company_role(company_id) IN ('owner', 'admin')
    AND role != 'owner'
  );

DROP POLICY IF EXISTS invites_select ON public.company_invites;
DROP POLICY IF EXISTS invites_insert ON public.company_invites;
DROP POLICY IF EXISTS invites_delete ON public.company_invites;

CREATE POLICY invites_select ON public.company_invites
  FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY invites_insert ON public.company_invites
  FOR INSERT TO authenticated
  WITH CHECK (company_role(company_id) IN ('owner', 'admin'));

CREATE POLICY invites_delete ON public.company_invites
  FOR DELETE TO authenticated
  USING (company_role(company_id) IN ('owner', 'admin'));
