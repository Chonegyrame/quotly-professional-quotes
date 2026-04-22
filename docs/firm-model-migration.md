# Firm Model Migration Plan

Draft: 2026-04-22
Status: Plan — not yet executed.
Target: Full migration from single-user-per-company to multi-user-per-firm, with firm-scoped AI learning.

---

## 1. Why

Today Quotly is built around one user per company. The real customers — Swedish tradesperson firms of 2–15 people — need shared company data, role-based permissions, and (most importantly) a learning system that pools every firm member's quotes into one shared AI context. That last part is the product win: a new hire benefits from every quote their firm has ever written, not starting from zero.

---

## 2. Decisions locked in

- **Three roles:** `owner`, `admin`, `member`. No fourth role.
- **Default data visibility:** all firm members see all firm data. No private-draft concept in v1.
- **Invite flow:** email + signed token, magic-link style. 7-day expiry.
- **Multi-firm membership:** schema supports it; UI doesn't expose a switcher in v1 (no one is in multiple firms yet).
- **Learning system:** firm-scoped (keyed by `company_id`). Every member's quotes feed the pool — no filtering by role or seniority. Apprentices don't send quotes anyway, so a "feeds_learning" toggle would solve a non-problem.
- **Billing:** deferred. Schema is ready for per-seat pricing whenever you add Stripe.
- **Fortnox:** deferred. Will be built on top of the firm model in a later phase.

---

## 3. Final data model

Tables that change or are added:

| Table | Status | Keyed by |
|---|---|---|
| `companies` | unchanged (column `user_id` becomes historical, keep for now) | `id` |
| `company_memberships` | **NEW** | `(company_id, user_id)` |
| `company_invites` | **NEW** | `id` (with unique `token`) |
| `company_trade_profiles` | renamed from `user_trade_profiles`, rekeyed | `(company_id, trade)` |
| `company_job_patterns` | renamed from `user_job_patterns`, rekeyed | `(company_id, trade, ...)` |
| `company_material_learnings` | renamed from `user_material_learnings`, rekeyed | `(company_id, ...)` |
| All other data tables | unchanged schema; RLS rewritten | `company_id` |

Tables that stay exactly as-is (only RLS gets rewritten):
`quotes`, `quote_items`, `quote_item_materials`, `quote_events`, `materials`, `quote_templates`, `recompute_metrics`, `ai_idempotency_cache`, `ai_usage`, `ai_ip_usage`.

---

## 4. New tables

### 4.1 `company_memberships`

```sql
CREATE TABLE public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

-- Exactly one owner per company
CREATE UNIQUE INDEX uq_one_owner_per_company
  ON public.company_memberships (company_id)
  WHERE role = 'owner';

CREATE INDEX idx_memberships_user ON public.company_memberships (user_id);
CREATE INDEX idx_memberships_company ON public.company_memberships (company_id);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
```

### 4.2 `company_invites`

```sql
CREATE TABLE public.company_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),  -- owner is never invited
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
```

### 4.3 Helper functions

```sql
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
```

### 4.4 Backfill existing users as owners

```sql
INSERT INTO public.company_memberships (company_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.companies
ON CONFLICT (company_id, user_id) DO NOTHING;
```

After this runs: both your test accounts become owners of their respective firms. Nothing visible changes for them yet.

---

## 5. RLS rewrite

### 5.1 Policies on new tables

```sql
-- memberships: you see members of your own firms
CREATE POLICY memberships_select ON public.company_memberships
  FOR SELECT USING (is_company_member(company_id));

-- only admins/owners can insert (invite accept edge function uses service_role)
CREATE POLICY memberships_insert ON public.company_memberships
  FOR INSERT WITH CHECK (company_role(company_id) IN ('owner', 'admin'));

-- only owners can update role
CREATE POLICY memberships_update ON public.company_memberships
  FOR UPDATE USING (company_role(company_id) = 'owner');

-- delete = remove member. owner and admin can; owner can't be deleted except by transfer
CREATE POLICY memberships_delete ON public.company_memberships
  FOR DELETE USING (
    company_role(company_id) IN ('owner', 'admin')
    AND role != 'owner'  -- owner only leaves via transfer
  );

-- invites: admin+ can create, read, cancel
CREATE POLICY invites_select ON public.company_invites
  FOR SELECT USING (is_company_member(company_id));

CREATE POLICY invites_insert ON public.company_invites
  FOR INSERT WITH CHECK (company_role(company_id) IN ('owner', 'admin'));

CREATE POLICY invites_delete ON public.company_invites
  FOR DELETE USING (company_role(company_id) IN ('owner', 'admin'));
```

### 5.2 Existing tables — replace user-based checks with membership checks

For every table with existing policies using `user_id = auth.uid()` or `company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())`, drop the old policies and replace with the pattern:

```sql
-- Example for quotes
DROP POLICY IF EXISTS "Users can read own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete own quotes" ON public.quotes;

CREATE POLICY quotes_select ON public.quotes
  FOR SELECT USING (is_company_member(company_id));
CREATE POLICY quotes_insert ON public.quotes
  FOR INSERT WITH CHECK (is_company_member(company_id));
CREATE POLICY quotes_update ON public.quotes
  FOR UPDATE USING (is_company_member(company_id));
CREATE POLICY quotes_delete ON public.quotes
  FOR DELETE USING (
    is_company_member(company_id)
    AND company_role(company_id) IN ('owner', 'admin')
  );
```

**Tables to rewrite:** `companies`, `quotes`, `quote_items`, `quote_item_materials`, `quote_events`, `materials`, `quote_templates`. (Learning tables get rewritten in Chunk B.)

**Child tables without `company_id`** (`quote_items`, `quote_item_materials`, `quote_events`): their policies go through the parent quote, e.g. `USING (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND is_company_member(q.company_id)))`.

### 5.3 `companies` table special-case

Old: `USING (user_id = auth.uid())`. New: `USING (is_company_member(id))`. The `companies.user_id` column stays as a historical "original creator" reference — no more enforcement on it.

---

## 6. Chunk B — learning system migration

Run only after Chunk A is verified.

### 6.1 Rename + rekey the three learning tables

Because there are only your two test accounts, we skip column backfills entirely — drop the tables, recreate with new keys, re-run recompute.

```sql
-- Drop old tables (safe: data is regenerated from raw quotes)
DROP TABLE IF EXISTS public.user_trade_profiles CASCADE;
DROP TABLE IF EXISTS public.user_job_patterns CASCADE;
DROP TABLE IF EXISTS public.user_material_learnings CASCADE;

-- Recreate as company-scoped

CREATE TABLE public.company_trade_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade text NOT NULL,
  total_quotes integer NOT NULL DEFAULT 0,
  common_materials jsonb NOT NULL DEFAULT '[]',
  typical_labor_min numeric NOT NULL DEFAULT 0,
  typical_labor_max numeric NOT NULL DEFAULT 0,
  typical_labor_avg numeric NOT NULL DEFAULT 0,
  typical_labor_p10 numeric NOT NULL DEFAULT 0,
  typical_labor_p90 numeric NOT NULL DEFAULT 0,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, trade)
);

CREATE TABLE public.company_job_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade text NOT NULL,
  pattern_keywords text[] NOT NULL DEFAULT '{}',
  occurrence_count integer NOT NULL DEFAULT 0,
  common_materials jsonb NOT NULL DEFAULT '[]',
  typical_line_items jsonb NOT NULL DEFAULT '[]',
  avg_total_labor numeric NOT NULL DEFAULT 0,
  member_quote_ids uuid[],
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_job_patterns_company_trade
  ON public.company_job_patterns (company_id, trade);

CREATE TABLE public.company_material_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade text NOT NULL,
  job_keywords text[] NOT NULL DEFAULT '{}',
  material_name text NOT NULL,
  learning_type text NOT NULL CHECK (learning_type IN ('addition', 'removal')),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_company_material_learnings_quote_material_type
  ON public.company_material_learnings (quote_id, material_name, learning_type)
  WHERE quote_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.company_trade_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_job_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_material_learnings ENABLE ROW LEVEL SECURITY;

-- Read access for members; writes are service_role only
CREATE POLICY company_trade_profiles_select ON public.company_trade_profiles
  FOR SELECT USING (is_company_member(company_id));
CREATE POLICY company_trade_profiles_service ON public.company_trade_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY company_job_patterns_select ON public.company_job_patterns
  FOR SELECT USING (is_company_member(company_id));
CREATE POLICY company_job_patterns_service ON public.company_job_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY company_material_learnings_select ON public.company_material_learnings
  FOR SELECT USING (is_company_member(company_id));
CREATE POLICY company_material_learnings_service ON public.company_material_learnings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 6.2 Update the atomic-replace RPC

The existing `replace_user_job_patterns` function gets renamed + rekeyed:

```sql
DROP FUNCTION IF EXISTS public.replace_user_job_patterns(uuid, text, jsonb);

CREATE OR REPLACE FUNCTION public.replace_company_job_patterns(
  p_company_id uuid,
  p_trade text,
  p_patterns jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.company_job_patterns
  WHERE company_id = p_company_id AND trade = p_trade;

  IF p_patterns IS NOT NULL AND jsonb_array_length(p_patterns) > 0 THEN
    INSERT INTO public.company_job_patterns (
      company_id, trade, pattern_keywords, occurrence_count,
      common_materials, typical_line_items, avg_total_labor,
      member_quote_ids, last_updated_at
    )
    SELECT
      p_company_id,
      p_trade,
      ARRAY(SELECT jsonb_array_elements_text(elem->'pattern_keywords')),
      (elem->>'occurrence_count')::int,
      COALESCE(elem->'common_materials', '[]'::jsonb),
      COALESCE(elem->'typical_line_items', '[]'::jsonb),
      (elem->>'avg_total_labor')::numeric,
      ARRAY(SELECT jsonb_array_elements_text(elem->'member_quote_ids'))::uuid[],
      now()
    FROM jsonb_array_elements(p_patterns) elem;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_company_job_patterns(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_company_job_patterns(uuid, text, jsonb) TO service_role;
```

### 6.3 Update `recompute-user-profile` edge function

Rename to `recompute-firm-profile` (for clarity) or leave the name. Either way, the code changes are:
- Write targets change from `user_trade_profiles.user_id` → `company_trade_profiles.company_id`.
- Write targets change from `user_material_learnings.user_id` → `company_material_learnings.company_id`.
- RPC call: `replace_user_job_patterns` → `replace_company_job_patterns`; first param `p_user_id` → `p_company_id`.
- Metrics log: `user_id` remains the invoker for observability; add `company_id`.

The quote-fetch query already filters by `company_id` — no change needed there. All quotes from all members of the firm feed the learning pool.

### 6.4 Update `generate-quote` edge function

Reads switch from `user_trade_profiles` / `user_job_patterns` (keyed by `user_id`) to `company_trade_profiles` / `company_job_patterns` (keyed by `company_id`). The company_id can be resolved from the request payload or looked up via membership of the calling user.

### 6.5 Re-run recompute once per firm

After Chunk B SQL + function deploys, trigger a recompute for each existing company to rebuild the learning tables from scratch:

```sql
-- From SQL editor, invoke the edge function for each (company, trade) combo
-- Easiest: just have the frontend trigger one fresh recompute via any quote action
-- Or directly POST to the function with adminClient
```

After this runs, both firms have their learning tables populated from their full history of sent quotes.

---

## 7. Frontend code changes

### 7.1 `useCompany` hook — `src/hooks/useCompany.tsx`

**Before (conceptually):**
```ts
const { data } = await supabase
  .from('companies')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle();
```

**After:**
```ts
const { data: memberships } = await supabase
  .from('company_memberships')
  .select('company_id, role, companies(*)')
  .eq('user_id', user.id);

// For v1, pick the first (and only) membership
const current = memberships?.[0];
return {
  company: current?.companies,
  role: current?.role,
};
```

### 7.2 New hooks (all in `src/hooks/`)

- **`useCompanyMembers()`** — returns `[{ user_id, email, role }, ...]` for the current company. Joins `company_memberships` with the auth.users view.
- **`useCompanyInvites()`** — returns pending invites (`accepted_at IS NULL AND expires_at > now()`) for the current company.
- **`useCurrentRole()`** — shortcut returning just `'owner' | 'admin' | 'member'` from the current membership. Used for permission gating.

### 7.3 Permission gating helper — `src/lib/permissions.ts`

```ts
export function getPermissions(role: 'owner' | 'admin' | 'member' | null) {
  return {
    canInviteMembers: role === 'owner' || role === 'admin',
    canRemoveMembers: role === 'owner' || role === 'admin',
    canChangeRoles: role === 'owner',
    canTransferOwnership: role === 'owner',
    canConnectFortnox: role === 'owner' || role === 'admin',
    canEditCompanySettings: role === 'owner' || role === 'admin',
    canDeleteQuotes: role === 'owner' || role === 'admin',
  };
}
```

### 7.4 UI surfaces

**Settings → Team page** (`src/pages/Settings.tsx` or new `src/pages/TeamSettings.tsx`):
- Members list with role badges (reads `useCompanyMembers`).
- "Bjud in medlem" form (email + role dropdown), posts to `send-team-invite` edge function.
- Pending invites list (reads `useCompanyInvites`).
- Actions per member: admin+ can remove non-owners. Owner can change roles or transfer ownership.

**Invite acceptance page** — new route `/invite/:token`:
- If user is logged in: show "Join [Firm Name]?" → calls `accept-team-invite`.
- If not logged in: redirect to signup/login, preserve token in query string, auto-accept on return.

**Post-signup routing** — in the auth callback:
- Check `company_invites` for any rows matching the signed-up user's email.
- If match: redirect to `/invite/:token` for acceptance.
- If no match: redirect to existing "Create company" onboarding.

---

## 8. Edge functions

### 8.1 Existing — updates only

- **`recompute-user-profile`** → writes firm-scoped tables (see §6.3).
- **`generate-quote`** → reads firm-scoped tables (see §6.5).

### 8.2 New — `send-team-invite`

Path: `supabase/functions/send-team-invite/index.ts`.
- Input: `{ company_id, email, role }`.
- Verifies caller has admin+ role on company_id.
- Generates cryptographically-random token.
- Inserts row into `company_invites`.
- Sends email via Resend with link `https://<app>/invite/<token>`.
- Returns success.

### 8.3 New — `accept-team-invite`

Path: `supabase/functions/accept-team-invite/index.ts`.
- Input: `{ token }`.
- Looks up invite by token; verifies not expired, not already accepted.
- Verifies auth.uid()'s email matches invite email.
- Inserts into `company_memberships` with the invited role.
- Marks `accepted_at = now()` on the invite.
- Returns the company id.

Both new functions: `verify_jwt = false`, use the shared `authenticate()` helper (pattern per project's `project_supabase_jwt_pattern` memory).

---

## 9. Execution plan

### Chunk A — team foundation

Order matters because later steps depend on earlier ones.

1. Apply migration: create `company_memberships` + `company_invites` + helper functions + backfill existing users as owners.
2. Apply migration: rewrite RLS policies on all non-learning tables to use `is_company_member` / `company_role`.
3. Deploy `send-team-invite` and `accept-team-invite` edge functions.
4. Update frontend: `useCompany` rewrite + add `useCompanyMembers`, `useCompanyInvites`, `useCurrentRole` hooks + permissions helper.
5. Build Settings → Team UI.
6. Build `/invite/:token` route + post-signup invite check.
7. **Checkpoint verification** (see §10).

### Chunk B — learning system firm-scoping

1. Apply migration: drop old learning tables, recreate as company-scoped, create new `replace_company_job_patterns` RPC, drop old one.
2. Deploy updated `recompute-user-profile` (or renamed `recompute-firm-profile`) edge function.
3. Deploy updated `generate-quote` edge function.
4. Trigger one recompute per (company, trade) combo to rebuild learning tables from raw quotes.
5. **Checkpoint verification** (see §10).

### Chunk C (later) — Fortnox integration at firm level

Not part of this migration. Starts after partner approval + Chunks A/B verified.

---

## 10. Post-migration verification

### After Chunk A

- [ ] Log in to both existing test accounts — each still sees their own company + quotes.
- [ ] Create a new quote — saves successfully, linked to correct company.
- [ ] From account #1, invite a throwaway third email as `member`. Check that email is delivered with a working link.
- [ ] Sign up as the invited email via the invite link. Verify auto-join to firm.
- [ ] Verify the invited member can see existing quotes from account #1.
- [ ] Verify member cannot invite others (role gated).
- [ ] Verify admin can invite others.
- [ ] Check Supabase logs: no RLS errors during normal usage.

### After Chunk B

- [ ] Run one AI quote generation from the original owner account — verify output is reasonable (uses existing learning).
- [ ] Run one AI quote generation from the newly-invited member — verify output pulls from the *same* learning pool (sees patterns they didn't write themselves).
- [ ] Query `company_trade_profiles` + `company_job_patterns` in SQL editor — verify rows are keyed by `company_id` and populated.
- [ ] Query `recompute_metrics` — verify `status = 'ok'` on the rebuild recomputes.
- [ ] Verify no references to the old `user_trade_profiles` / `user_job_patterns` / `user_material_learnings` remain in code.

---

## 11. Open for v2

- Multi-firm-per-user: UI switcher in the nav (schema already supports it).
- Private drafts (member-scoped visibility).
- Fortnox integration (one connection per firm).
- Per-seat billing with Stripe (membership count = seat count).
- Role "viewer" for read-only stakeholders (accountants, consultants).

---

## 12. Risks + gotchas

- **`companies.user_id` column** — we leave it as historical data, but nothing should read it for permission checks after Chunk A. Audit the codebase for any remaining `.eq('user_id', ...)` calls against `companies`.
- **`ai_usage` / `ai_idempotency_cache`** — still per-user. Consider later whether daily AI limits should be per-firm (e.g., "100 generations/day shared across firm") vs per-user. Not blocking.
- **Email deliverability** — make sure Resend is set up to send from your verified domain before running invite tests.
- **Owner deletion** — the RLS blocks deleting the single owner. Make sure the frontend never offers "remove" on the owner row; only the transfer-ownership flow changes ownership.

---

## 13. Using /buildreal vs. a direct assistant build

`/buildreal` is a disciplined coding agent defined at `~/.claude/commands/buildreal.md`. It executes a planreal-format plan file with a clear engineering bar: reasons before writing, verifies imports against `package.json`, self-verifies every file it writes, classifies blockers as LOCAL / STRUCTURAL / CRITICAL, maintains a discovery log, ticks plan steps as it goes, and reports honestly at the end. It's an excellent way to force high-quality code output and avoid "vibe-coded" shortcuts. The tradeoff is that its tool surface is narrow: `Read, Write, Edit, Grep, Glob, Bash` only. No Agent spawning. No MCP tools.

### Why that matters for this migration specifically

This migration is not purely a code-writing job. It requires two classes of action:

1. **Code writing** — SQL migration files, edge function source, new React hooks, UI components.
2. **Live Supabase operations** — applying migrations to the actual database, deploying edge functions to the Supabase runtime, re-running recompute once to rebuild learning tables.

`/buildreal` can do class (1) extremely well. It cannot do class (2) at all — no Supabase MCP access. If you run `/buildreal` against this plan, it will write all the files to disk correctly, then stop. You'd still need to come back to the main assistant (or run `supabase db push` / `supabase functions deploy` manually) to finish.

### Format mismatch

`/buildreal` expects the plan file to contain three specific section headers: `## Build Order`, `## Acceptance Criteria`, `## Verification`. It also expects the file to live at `.claude/plans/planreal-<slug>.md`. This plan currently uses section numbering (§9, §10) and lives in `docs/`. If you want to use `/buildreal`, the plan needs a light restructure: either rename sections to the required headers, or copy this plan into `.claude/plans/planreal-firm-model.md` with the header names adjusted.

### Recommendation — hybrid is best

Three realistic ways to run the migration:

**Option A — Assistant-only (what we're defaulting to).**
Ask the main assistant to execute chunks A and B top to bottom. The assistant writes files, applies migrations via Supabase MCP, deploys edge functions via MCP, and iterates on failures. Fastest, lowest coordination overhead. Quality depends on the assistant adopting self-discipline (reasoning before writing, self-verifying). Best when you want minimum back-and-forth.

**Option B — `/buildreal` for code, assistant for deploys.**
First, restructure the plan to buildreal-compatible format at `.claude/plans/planreal-firm-model.md`. Run `/buildreal firm-model` to have it write every SQL file, edge function, hook, and component with full reason-before-write + self-verify discipline. It'll tick off build steps in its own plan file. When it finishes, come back to the main assistant and say "apply the migrations and deploy the edge functions." Main assistant uses MCP to finish. Highest code quality, ~5 minutes of coordination overhead per chunk.

**Option C — `/buildreal` only, manual deploys.**
Same as B but instead of asking the main assistant to deploy, you run `supabase db push` and `supabase functions deploy` from the terminal yourself. Most control, slowest. Only makes sense if you explicitly want to review each migration SQL before it hits the DB.

### Honest take for Quotly right now

This migration is big enough and important enough that the extra rigor of `/buildreal` is worth the coordination overhead — particularly for the Chunk A RLS rewrite, where a subtle bug could lock a user out of their own data. For Chunk B the learning system migration is more contained and the main assistant with MCP can handle it directly without much risk.

Suggested split:
- **Chunk A: use `/buildreal`.** Code quality discipline pays off when you're rewriting 15 RLS policies. Hand off to the main assistant for the migration-apply and edge function deploys.
- **Chunk B: ask the main assistant directly.** Smaller surface area. Main assistant writes the migration + function updates + deploys in one flow.

If you want to go the `/buildreal` route, the next step is restructuring this file into `.claude/plans/planreal-firm-model.md` with the three required section headers. Happy to do that as a prep step before you run `/buildreal firm-model`.
