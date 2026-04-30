-- Lock company_memberships to one row per user. Closes a class of
-- ambiguity bugs where a query like .eq("user_id", X).limit(1) could
-- non-deterministically pick which firm to operate on for users who
-- happened to belong to two firms — the cross-tenant Fortnox sync bug
-- found in security review on 2026-04-30 was the motivating example.
--
-- This trades the (theoretical) ability for one user to belong to
-- multiple firms for a much simpler and safer data model. Reversible
-- by dropping the constraint if multi-firm-per-user is ever needed.
--
-- The existing UNIQUE (company_id, user_id) constraint stays — it
-- still guards double-accept races within the same firm. The new
-- UNIQUE (user_id) is strictly stronger.
--
-- This migration will FAIL to apply if existing rows already violate
-- the constraint. As of 2026-04-30, Quotly has one active user, so no
-- conflict is expected. If a future migration needs to apply this
-- against a populated DB, identify offending users first via:
--   SELECT user_id, COUNT(*) FROM company_memberships
--   GROUP BY user_id HAVING COUNT(*) > 1;

ALTER TABLE public.company_memberships
  ADD CONSTRAINT company_memberships_user_id_unique UNIQUE (user_id);

COMMENT ON CONSTRAINT company_memberships_user_id_unique
  ON public.company_memberships IS
  'One firm per user. Enforces the single-tenancy assumption that the rest of Quotly relies on.';
