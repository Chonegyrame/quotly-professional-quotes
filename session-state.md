# Session State

Last updated: 2026-04-23 (after Phase 0–3 commit + push)
Branch: main — clean, everything committed and pushed

**⚡ NEXT ACTION when opening a fresh session:** Read [.claude/plans/lead-filter-system.md](.claude/plans/lead-filter-system.md) and start **Phase 4 — Inbox UI**. Phases 0, 1, 2, and 3 are all complete, deployed to production Supabase, and committed + pushed as 4 separate commits. The backend loop (customer submits → row stored → AI scores → verdict saved) is fully working end-to-end. Phase 4 is where firms finally see these scored leads inside Quotly.

## What was done this session

Built Phases 0 through 3 of the lead-filter system end-to-end. All deployed live and committed as 4 phase-boundary commits.

- **Phase 0 — Business profile foundation** (`7ef739c`): `companies.form_slug` + slug trigger (Swedish diacritic handling), `company_business_profile` table with RLS, interactive react-leaflet map for service-area picker (geocoded base + draggable radius) in `CompanySetup.tsx` and `BusinessProfileSection.tsx`.
- **Phase 1 — Template library** (`d11c7d3`): `form_templates` + `company_form_templates` tables. Seeded all 16 templates (5 el + 5 bygg + 5 vvs + 1 generic) with Swedish form schemas + prose red_flag_rules.
- **Phase 2 — Public intake form** (`b8b4b98`): `incoming_requests` table, `/offert/:firmSlug` route, `IncomingRequestForm.tsx` two-screen flow, dynamic `FormFieldRenderer.tsx`, 3 edge functions (`classify-intake-request`, `submit-intake-request`, `create-intake-upload-url`). Signed upload URLs harden photo uploads (no anon bucket INSERT, every upload passes IP-rate-limited edge function).
- **Phase 3 — AI scoring engine** (`12e880a`): `score-incoming-request` edge function. Sonnet 4.6 with forced tool-use (`score_lead` schema), reasoning-before-score, two-breakpoint prompt caching (rubric + firm profile). Server-side guardrails: evidence substring verification, arithmetic check, tier consistency, confidence cap at Ljummet when låg, auto-raise `needs_human_review` when guards correct anything. Scoring fires async from submit-intake-request via `EdgeRuntime.waitUntil`.

Verified end-to-end in browser + DB: test lead scored 91/Hett/hög with 7 green flags and 1 evidence-verified red flag.

## Current state

- Customer can visit `http://localhost:8081/offert/<firm-slug>` → describe their job → AI picks right template → fill form + upload photos via signed URLs → submit → "Tack!" within 500ms.
- Scoring runs in background; ~5–8s later the row has `ai_score`, `ai_tier`, `ai_confidence`, `ai_verdict`.
- Brunn boofing (`brunn-boofing-7d8746d9`) has a manually-inserted business profile (primary_trade=el, specialties=laddbox+solceller, base=Stockholm, radius=40km) for testing. **Inserted via raw SQL, not via Settings UI** — user should save their real profile via Settings at some point.
- Test rows in production DB:
  - `375fd966-...` — Phase 2 verification (no ai_verdict, scoring not yet wired at submission time)
  - `92167e84-...` — Phase 3 live test, scored 91/Hett/hög end-to-end

## Uncommitted changes

All changes committed. Branch clean. Remote in sync.

Recent commits on main:
```
12e880a feat(lead-filter): Phase 3 — AI scoring engine with forced tool-use + guardrails
b8b4b98 feat(lead-filter): Phase 2 — public intake form + signed upload URLs
d11c7d3 feat(lead-filter): Phase 1 — form template library + 16 seeded templates
7ef739c feat(lead-filter): Phase 0 — business profile foundation + map-based service area
0ddb4c0 chore: update session-state for fresh-session handoff  (previous session baseline)
```

## What comes next

**Phase 4 — Inbox UI**. All backend plumbing is done; this phase is pure frontend.

Files to build (per plan):
- `src/pages/Inbox.tsx` — `/inbox` route
- `src/pages/IncomingRequestDetail.tsx` — full-detail view
- `src/components/IncomingRequestCard.tsx` — Clariq-style card (score ring, tier badge, parsed field chips, green/red flag columns, summary, "Generera offert" CTA)
- `src/components/ScoreRing.tsx` — score visualization
- `src/components/FlagsList.tsx` — reusable flag list
- `src/hooks/useIncomingRequests.tsx` — React Query hook (mirrors `useQuotes.tsx` pattern, firm-scoped)
- Update `src/components/Navbar.tsx` to add "Förfrågningar" nav item
- Filter tabs: Alla / 🟢 Hett / 🟡 Ljummet / 🔴 Kallt / Obesvarade

Plan has full spec — no new architectural decisions needed, just build.

## Open questions

- **Per-template red_flag_rules not yet injected into scoring prompt.** Today the scoring AI sees template names + descriptions but NOT the per-template prose rules. The live test showed the AI caught technical issues (e.g. säkring/laddeffekt mismatch) from its own knowledge, so low priority. If scoring quality suffers on less common templates, wire `red_flag_rules` into the `firmBlock` of `score-incoming-request`.
- **User asked for plainer "dumbed down" explanation style** — keep technical explanations in customer-facing plain terms, avoid jargon unless asked.
- **Post-MVP reminder** queued in the plan file: when Phase 5 is done, surface the Post-MVP list (especially the **template-editor UI in Settings** — user's most-wanted V2).

## Context that is easy to forget

- **Prompt caching TTL is ~5 min.** Sparse lead volume = cache misses = full cost. Real cost impact only appears at real volume.
- **Scoring uses Claude Sonnet 4.6** (`claude-sonnet-4-6`); classification uses **Haiku 4.5**.
- **`EdgeRuntime.waitUntil`** pattern in `submit-intake-request` keeps the function alive for background scoring after the Response is returned. `@ts-expect-error` comments are intentional (runtime global not typed).
- **Photo bucket INSERT is service-role only** — browser direct uploads will fail with "new row violates row-level security policy". All uploads must go through `create-intake-upload-url` → signed URL → `uploadToSignedUrl`.
- **Nominatim rate limit: 1 req/sec, user-agent required.** Used for firm base-address (Phase 0 Settings) and customer address (Phase 2 submission) — both browser-direct, no API key.
- **Slugify handles Swedish diacritics** (å→a, ä→a, ö→o, etc.) via `translate()` in `slugify_company_name`.
- **`get_company_by_slug` is SECURITY DEFINER** — returns only safe fields (no email_template, no default_vat).
- **Tier thresholds hard-coded** (75/45/0) in `score-incoming-request`. Move to config if we ever allow firms to customize.
- **Rate limits share `ai_ip_usage` table** under different `function_name` values: classify 30/hr, submit 10/hr, upload-url 60/hr, score 30/hr IP + 500/day global ceiling.

---

## Previous session (2026-04-23 planning session) carryover

- Firm model complete (owner/admin/member memberships, RLS rewrite, team invites). Unchanged.
- Backlog items still open: `/q/:id` anon accept/decline bug, wholesale catalog retrieval layer, firm material trade-tagging, customer's original request visible on quote, Fortnox Chunk C (waiting on partner), pre-launch cleanup (Resend domain, remove ai_prompt_text dev panel).
- User's dev philosophy: build hard and fast, launch and test personally, don't wait months to validate.
