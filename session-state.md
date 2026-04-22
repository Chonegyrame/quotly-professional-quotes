# Session State

Last updated: 2026-04-22
Branch: main

**⚡ NEXT ACTION when opening a fresh session:** Chunk B of the firm-model migration — rewrite the learning system to be firm-scoped. Full spec in [docs/firm-model-migration.md](docs/firm-model-migration.md) §6. Chunk A shipped + verified this session.

## What was done this session

- **Chunk A of firm-model migration — shipped + verified.**
  - 4 migrations applied to prod: `company_memberships` + `company_invites` + helpers + backfill (`20260422140000`), RLS rewrite on 7 tables (`20260422150000`), policy TO-authenticated tighten (`20260422160000`), `get_company_members` RPC (`20260422170000`).
  - 2 new edge functions deployed: `send-team-invite`, `accept-team-invite`. Both use `verify_jwt=false` + `authenticate()` helper per project JWT pattern.
  - Frontend: `useCompany` rewritten to query via `company_memberships` join (now returns `role`). New hooks `useCompanyMembers`, `useCompanyInvites`, `useCurrentRole`. New `src/lib/permissions.ts` with 7-permission helper. New `TeamSection` component on Settings page. New `/invite/:token` page + route + post-signup sessionStorage redirect.
  - DB types regenerated to include new tables + RPCs.
  - Trigger `on_company_created` auto-creates the owner membership row when a new company is inserted — keeps signup flow working unchanged.
  - Pre-existing policies on `quote_events` / `quote_item_materials` / `quote_items` / `quotes` for `anon` (public customer view at `/q/:id`) were explicitly preserved; only authenticated-role policies got rewritten.
- **Verified end-to-end:** Invited `gwallin.photo@gmail.com` from Brunn boofing owner. Used the raw invite token + `/invite/<token>` URL (email send blocked by Resend sandbox — see gotcha below). Signed up as that email, auto-redirected through `/auth` → `/invite/:token` → accepted. New user (`a29ceea2-c17a-402a-a323-69db57366d57`) is now `member` of Brunn boofing. Zero RLS errors in Postgres logs during the test.
- **Flagged pre-existing `/q/:id` accept/decline bug as a separate task** via spawn_task. Customer-facing accept/decline silently fails for anon users because RLS blocks the writes; UI shows fake success. Not caused by this migration — pre-existed. Fix will route accept/decline through a new public edge function `respond-to-quote`.
- **One small UX fix during verification:** `TeamSection.handleSendInvite` now unpacks `FunctionsHttpError.context` to surface the actual Swedish error message instead of the generic "Edge Function returned a non-2xx status code".

## Current state

- **Firm model Chunk A is live in prod.** Multi-user-per-firm works. `gustav.wallin123@gmail.com` owns Brunn boofing + the new `gwallin.photo@gmail.com` is a member of Brunn boofing. `Wallin taklägg` still single-user (owner only).
- **Chunk B is NOT started.** The learning tables (`user_trade_profiles`, `user_job_patterns`, `user_material_learnings`) are still keyed by `user_id`. `recompute-user-profile` edge function still at v9 from last session — needs rewrite for firm-scoping.
- **Fortnox** still deferred until Chunk B ships (see §2 of migration doc).
- **`companies.user_id` column** retained as historical "original creator" marker. RLS no longer reads it for auth — only the trigger on insert does.

## Uncommitted changes

Modified (from this session):
- `src/App.tsx` — added `/invite/:token` route, added `/invite/` to `isPublicRoute` check
- `src/hooks/useCompany.tsx` — rewrote to query via `company_memberships`, returns `role` now
- `src/integrations/supabase/types.ts` — regenerated after migrations
- `src/pages/Auth.tsx` — post-login redirect checks sessionStorage for pending invite
- `src/pages/Settings.tsx` — imports + renders `<TeamSection />` at the bottom
- `supabase/config.toml` — registered `send-team-invite` + `accept-team-invite` with `verify_jwt=false`

Untracked (from this session):
- `src/components/TeamSection.tsx` — members list + invite form + pending invites UI
- `src/hooks/useCompanyInvites.tsx`, `src/hooks/useCompanyMembers.tsx`, `src/hooks/useCurrentRole.tsx`
- `src/lib/permissions.ts`
- `src/pages/AcceptInvite.tsx`
- `supabase/functions/send-team-invite/index.ts`
- `supabase/functions/accept-team-invite/index.ts`
- `supabase/migrations/20260422140000_firm_model_foundation.sql`
- `supabase/migrations/20260422150000_firm_model_rls_rewrite.sql`
- `supabase/migrations/20260422160000_firm_model_tighten_new_table_policies.sql`
- `supabase/migrations/20260422170000_get_company_members_rpc.sql`

Also carry-over dirty from prior sessions: `index.html`, `tailwind.config.ts`, `src/components/FlipDeck/`, `src/components/LearningSlot.tsx`, `src/components/LearningSlot.backup.tsx`, `src/pages/LandingPage.tsx` from last session, plus session's own changes to `supabase/functions/recompute-user-profile/index.ts`.

No commits this session.

## What comes next

1. **PRIMARY — Chunk B of firm-model migration.** Full spec in [docs/firm-model-migration.md](docs/firm-model-migration.md) §6. Drop the three `user_*` learning tables, recreate as `company_*` scoped, replace `replace_user_job_patterns` RPC with `replace_company_job_patterns`, rewrite `recompute-user-profile` + `generate-quote` edge functions to read/write by `company_id`, trigger one recompute per firm to rebuild learning. §10 has the checkpoint tests. Main assistant (not /buildreal) per §13 recommendation — surface area is smaller than Chunk A.
2. **Then resolve the spawned task** for the pre-existing `/q/:id` accept/decline bug. Already has a full brief.
3. **Then Fortnox integration (Chunk C)** when partner approval comes through.
4. **Smaller backlog:**
   - Deferred UI: change-role dropdown + transfer-ownership flow in Team section (skipped for v1 — add when you actually have a firm managing itself).
   - Deferred: post-signup email→invite auto-match (plan §7.4 last bullet). Would need a lookup edge function since fresh users can't read invites. Low priority — primary flow (click email link) works fine.
   - Cleanup: commit this session's work + last session's LearningSlot carryover.
   - Cleanup: verify a domain in Resend before sending real customer quote emails. Current setup only works for `gustav.wallin123@gmail.com` via sandbox sender.

## Open questions

- Whether to eventually drop `companies.user_id` column once we're confident nothing reads it for auth. Low priority — audit the codebase first.
- Whether invite emails should use a different `from` address than `send-quote-email` (currently both use `onboarding@resend.dev` sandbox). Moot until you verify a domain.

## Context that is easy to forget

- **Resend sandbox limitation.** `onboarding@resend.dev` only delivers to the Resend account owner's email (`gustav.wallin123@gmail.com`). Any other recipient gets silently dropped. This applies to `send-team-invite` AND the existing `send-quote-email`. For testing invites to other emails, grab the token from `company_invites` and go directly to `/invite/<token>`.
- **supabase-js non-2xx behavior.** `supabase.functions.invoke` throws `FunctionsHttpError` on 4xx/5xx. The JSON body is on `err.context.response` — read it with `.json()` to surface the real error. `TeamSection.handleSendInvite` has the pattern.
- **The `on_company_created` trigger** is load-bearing for signup — it auto-creates the owner membership when a new company is inserted. If you ever drop it, new signups will end up with a company but no membership, and `useCompany` will return null.
- **Role-based RLS pattern:** `is_company_member(company_id)` for SELECT/INSERT/UPDATE access, `company_role(company_id) IN ('owner', 'admin')` for DELETE and company settings. Members can do everything except delete quotes/materials/templates or edit company settings.
- **Plans for Chunk B rely on the two test firms being sparse** (few quotes). Because of that, the plan drops + recreates the learning tables rather than doing a column rename + backfill. If you add 100+ quotes before running Chunk B, reconsider the approach.
- **Scroll-driven hero animations** still can't be verified in Claude Preview harness — verify visually in Chrome (carry-over).
- **Pre-existing TS error at LandingPage.tsx:835** unrelated (carry-over).
- **Two companies exist in DB:** Brunn boofing (owner + 1 member as of this session) and Wallin taklägg (owner only).
- capybara
