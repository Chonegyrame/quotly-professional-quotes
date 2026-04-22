-- Firm Model Migration — Chunk A, Part 1: Foundation
-- Creates company_memberships + company_invites + helper functions + backfill.
-- RLS policy rewrites on existing tables happen in a separate migration.

-- =========================================================================
-- 1. company_memberships
-- =========================================================================

CREATE TABLE public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE UNIQUE INDEX uq_one_owner_per_company
  ON public.company_memberships (company_id)
  WHERE role = 'owner';

CREATE INDEX idx_memberships_user ON public.company_memberships (user_id);
CREATE INDEX idx_memberships_company ON public.company_memberships (company_id);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. company_invites
-- =========================================================================

CREATE TABLE public.company_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_token ON public.company_invites (token);
CREATE INDEX idx_invites_email ON public.company_invites (email);
CREATE INDEX idx_invites_company ON public.company_invites (company_id);

ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. Helper functions
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_company_member(check_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_memberships
    WHERE company_id = check_company_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.company_role(check_company_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM company_memberships
  WHERE company_id = check_company_id AND user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_role(uuid) TO authenticated;

-- =========================================================================
-- 4. RLS policies on the new tables
-- =========================================================================

-- Memberships: members see members; admin+ can insert; owner can update role;
-- admin+ can delete non-owner rows (owner leaves only via transfer).
CREATE POLICY memberships_select ON public.company_memberships
  FOR SELECT USING (is_company_member(company_id));

CREATE POLICY memberships_insert ON public.company_memberships
  FOR INSERT WITH CHECK (company_role(company_id) IN ('owner', 'admin'));

CREATE POLICY memberships_update ON public.company_memberships
  FOR UPDATE USING (company_role(company_id) = 'owner');

CREATE POLICY memberships_delete ON public.company_memberships
  FOR DELETE USING (
    company_role(company_id) IN ('owner', 'admin')
    AND role != 'owner'
  );

-- Invites: members can read; admin+ can create and cancel.
CREATE POLICY invites_select ON public.company_invites
  FOR SELECT USING (is_company_member(company_id));

CREATE POLICY invites_insert ON public.company_invites
  FOR INSERT WITH CHECK (company_role(company_id) IN ('owner', 'admin'));

CREATE POLICY invites_delete ON public.company_invites
  FOR DELETE USING (company_role(company_id) IN ('owner', 'admin'));

-- =========================================================================
-- 5. Backfill existing users as owners of their companies
-- =========================================================================

INSERT INTO public.company_memberships (company_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.companies
WHERE user_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;
