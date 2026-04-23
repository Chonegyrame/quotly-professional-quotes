# Session State

Last updated: 2026-04-23 (after Phase 4 + Phase 5 build)
Branch: main — uncommitted changes (Phases 4 + 5, not yet committed or pushed)

**⚡ NEXT ACTION when opening a fresh session:** Phases 4 and 5 are built but not committed. Commit them as two separate commits (Phase 4 — Inbox UI, Phase 5 — Convert to quote), push to main, then move to Post-MVP work. See "What comes next" below.

## What was done this session

- **Phase 4 — Inbox UI**: Built `src/pages/Inbox.tsx`, `src/pages/IncomingRequestDetail.tsx`, `src/components/IncomingRequestCard.tsx`, `src/components/ScoreRing.tsx`, `src/components/FlagsList.tsx`, `src/hooks/useIncomingRequests.tsx`. Added `/inbox` and `/inbox/:id` routes to `App.tsx`. Added "Förfrågningar" nav item to `Navbar.tsx`. Inbox uses Dashboard-style Card-based filter grid (Alla / Hett / Ljummet / Kallt / Obesvarade).
- **Phase 5 — Convert to quote**: Added `useGenerateQuoteFromRequest` hook to `useIncomingRequests.tsx` — calls `generate-quote` edge function with flattened form answers as text, navigates to QuoteBuilder with full `aiData` including generated line items. Added `convertRequest` mutation. Patched `QuoteBuilder.tsx` to pre-fill phone/email from `aiData` and mark the request as `converted` (with `converted_to_quote_id`) on save. Added "Från förfrågan" card to `QuoteDetail.tsx` via a React Query lookup on `incoming_requests.converted_to_quote_id`.
- **Verified in browser**: Inbox renders live data (Anna Andersson, score 91, Hett, flags, summary). Layout matches Dashboard style.

## Current state

- Full lead-filter loop is working end-to-end: customer submits `/offert/<slug>` → AI scores → lead appears in `/inbox` → firm clicks "Generera offert" → `generate-quote` called with form data → QuoteBuilder pre-filled → firm saves → request marked `converted` → QuoteDetail shows "Från förfrågan" link back to inbox.
- Test rows in production DB: `92167e84-...` scored 91/Hett/hög, `375fd966-...` unscored (Phase 2 test).
- Dev server runs on port 8081 via `.claude/launch.json`.

## Uncommitted changes

All Phase 4 + Phase 5 work is uncommitted. Modified files:
- `.claude/launch.json` (added `autoPort: false`)
- `src/App.tsx` (added `/inbox`, `/inbox/:id` routes)
- `src/components/Navbar.tsx` (added Förfrågningar nav item)
- `src/pages/QuoteBuilder.tsx` (phone/email pre-fill + convert-on-save)
- `src/pages/QuoteDetail.tsx` (Från förfrågan card)

Untracked new files:
- `src/components/FlagsList.tsx`
- `src/components/IncomingRequestCard.tsx`
- `src/components/ScoreRing.tsx`
- `src/hooks/useIncomingRequests.tsx`
- `src/pages/Inbox.tsx`
- `src/pages/IncomingRequestDetail.tsx`

## What comes next

1. **Commit and push**: Two commits — `feat(lead-filter): Phase 4 — Inbox UI` and `feat(lead-filter): Phase 5 — Convert to quote`. Then push to main.
2. **Post-MVP: Template editor UI in Settings** — user flagged this as most wanted V2. `company_form_templates` table + RLS already exists. New Settings section "Formulär" listing templates with enable/disable toggle and preview. Pure UI + mutation work, no new schema.
3. **Post-MVP: Trade-specific homepage entry points** — marketing/SEO pages per trade (El, VVS, Bygg, Övrigt). Needs copy direction discussion before building.

## Open questions

- **Per-template `red_flag_rules` not injected into scoring prompt** — today scoring AI reads template name/description but not the per-template prose rules. Low priority; live test showed AI catches issues from own knowledge. Wire in if scoring quality suffers.
- **Post-MVP priority order** — template editor vs. homepage pages vs. learning system rewrite. User has not decided.
- **Resend sandbox constraint still in place** — `onboarding@resend.dev` only delivers to Resend account owner. If email notifications on new leads are added later, this blocks delivery until domain is verified.

## Context that is easy to forget

- `useGenerateQuoteFromRequest` uses `useCompanyBusinessProfile` to get `primary_trade` for the `generate-quote` call — if the firm has no business profile set, trade falls back to `'general'`.
- `generate-quote` is rate-limited to 20/day per user — this limit also applies when triggered from the inbox flow (same edge function, same counter).
- `QuoteBuilder` marks the request converted fire-and-forget (`.then()` without await) so it never blocks the save or navigation flow.
- `incoming_requests` RLS: SELECT/UPDATE scoped to company members; writes only via service-role edge functions. The `convertRequest` mutation in `useIncomingRequests` does a direct `.update()` which works because authenticated company members have UPDATE rights.
- Scoring uses Claude Sonnet 4.6; classification uses Haiku 4.5; quote generation uses Haiku via `generate-quote`.
- Tier thresholds hard-coded in `score-incoming-request` (75/45/0). Not configurable per firm.
- Photo uploads go through `create-intake-upload-url` → signed URL → `uploadToSignedUrl`. Direct browser INSERT to storage bucket fails RLS.
- Slugify handles Swedish diacritics (å→a, ä→a, ö→o) via `translate()` in `slugify_company_name` DB trigger.
