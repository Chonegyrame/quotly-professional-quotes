# Session State

Last updated: 2026-04-20 (evening)
Branch: main

## What was done this session

- **Executed `.claude/plans/learning-pipeline-hardening.md` end-to-end** via /bibzer-build. Plan addressed the broken learning pipeline (`supabase` ReferenceError silently killing Layer 1/2/4 since 2026-04-19 Part 1 redeploy) plus ten converged findings from the three-agent architectural critique.
- **New migration** `supabase/migrations/20260420120000_learning_pipeline_hardening.sql`: `user_job_patterns.member_quote_ids uuid[]`; `user_material_learnings.quote_id uuid` + partial unique index on `(quote_id, material_name, learning_type) WHERE quote_id IS NOT NULL`; new `ai_idempotency_cache` table (composite PK `user_id,request_id`, `input_hash`, `response`, `created_at` idx) with RLS (user SELECT own, service_role ALL); new `claim_ai_usage_slot(p_user_id, p_daily_limit)` RPC using `pg_advisory_xact_lock` + grant to service_role.
- **`recompute-user-profile/index.ts`**: renamed all 5 bare `supabase.from(...)` → `adminClient.from(...)` (the ReferenceError fix); captured material `unit` through `computeTradeProfile` and `detectPatterns` via a `Map<unit,count>` with `pickDominantUnit` tie-break; raised `detectPatterns` min cluster size 2 → 3; wrote `member_quote_ids: group.map(q => q.id)` into each pattern; added `quote_id` to Layer 4 learning rows; DELETE-by-quote_id before upsert with `onConflict: "quote_id,material_name,learning_type", ignoreDuplicates: true`.
- **`generate-quote/index.ts`**: added `temperature: 0` to inline Haiku call; added `sha256Hex` helper + `request_id` body param; idempotency cache read (60s cutoff + input-hash match) and write gated on `request_id`; replaced per-user daily-limit SELECT-count + terminal ai_usage INSERT pair with atomic `claim_ai_usage_slot` RPC (returns 429 on false); rewrote `scopeMembersToPattern` to use `member_quote_ids` directly with legacy `scoreSharedKeywords` fallback + `console.warn`; fixed hardcoded `st` → `${m.unit ?? "st"}` in Layer 1 + Layer 2 + sub-aggregate material lines; added weak-tier Layer 5 fallback (`isWeakTier` flag: 2 smaller-only or 2 larger-only neighbors, labels header `baserad på 2 {mindre|större} jobb: sizes — extrapolerad`, skips CV filter); added sub-aggregate caveat `litet urval, använd som vägledning` when `groupSize === 2 && groupSize/totalInCluster < 0.05`.
- **`extract-keywords/index.ts`**: added `temperature: 0` to Haiku fetch body.
- **`src/hooks/useQuotes.tsx`**: replaced silent `.catch(() => {})` on the `recompute-user-profile` invocation with `.catch((err) => console.error("[recompute-user-profile] failed:", err))`.
- **Deploys verified live**: `npx supabase db push`, `npx supabase gen types ...`, and `npx supabase functions deploy recompute-user-profile generate-quote extract-keywords` all ran clean. Dashboard shows "a few seconds ago" timestamps on all three — no CLI bug #4059 silent-skip this time. User ran through the post-deploy smoke tests.
- **Plan status:** `.claude/plans/learning-pipeline-hardening.md` marked IN PROGRESS with 5/6 files ticked and 19/22 acceptance criteria ticked. Build log entry appended for today.

## Current state

- Learning pipeline is functional again on the deployed edge functions (`extract-keywords`, `generate-quote`, `recompute-user-profile` all re-deployed today and tested by the user).
- Types file (`src/integrations/supabase/types.ts`) regenerated today against the live project and reflects the new `member_quote_ids` column, `quote_id` column, and `ai_idempotency_cache` table.
- Lint unchanged-category baseline: 225 problems (vs plan baseline 221) — same six categories, no new ones. Tests: 1/1 vitest passing.
- The full plan acceptance matrix is now effectively met after the user's smoke-test; three plan boxes remain unticked (see next section) because I couldn't tick them without observing the runtime myself.

## Uncommitted changes

Modified: `.gitignore`, `session-state.md`, `src/components/AIQuoteModal.tsx`, `src/hooks/useQuotes.tsx`, `src/integrations/supabase/types.ts`, `src/main.tsx`, `src/pages/Analytics.tsx`, `src/pages/QuoteBuilder.tsx`, `supabase/config.toml`, `supabase/functions/extract-keywords/index.ts`, `supabase/functions/generate-pdf/index.ts`, `supabase/functions/generate-quote/index.ts`, `supabase/functions/recompute-user-profile/index.ts`, `supabase/functions/send-quote/index.ts`.

Untracked: `photo-feature-brief.md`, `supabase/functions/_shared/` (scoring.ts + auth.ts from prior sessions), all four `supabase/migrations/202604*.sql` files (including today's `20260420120000_learning_pipeline_hardening.sql`).

Today's edits are on top of prior-session uncommitted work (Phase 1 job_size, auth/rate-limit hardening, phrase-keywords/weighted-scoring, Layer 5 + sub-aggregates). Nothing has been committed; the branch is up to date with `origin/main`.

## What comes next

- **Flip the three runtime-only acceptance boxes** in `.claude/plans/learning-pipeline-hardening.md` to `[x]` now that the user verified deploy + smoke-tested: (a) `last_computed_at` updates on quote send, (b) 3× Swedish determinism via `extract-keywords`, (c) `types.ts` regenerated. Then set plan header to `**Status:** DONE`.
- **Commit.** The diff pool is now very large (today's work plus several sessions). Suggest splitting into a few logical commits rather than one monster: (1) learning-pipeline-hardening (migration + 3 edge functions + useQuotes one-liner + types.ts), (2) prior uncommitted phrase-keywords/scoring + Layer 5 work, (3) the auth/rate-limit hardening, (4) the unrelated `AIQuoteModal`/`Analytics`/`QuoteBuilder`/`main.tsx`/`send-quote`/`generate-pdf`/`config.toml` edits whose provenance isn't clear from this session alone.
- **Watch logs** for `[generate-quote] legacy pattern fallback — no member_quote_ids`. Once it stops firing for active users, the legacy `user_job_patterns` pool has drained.
- **Revisit parked items** when data accumulates: Layer 4 recency + in-SQL aggregation; multi-cluster membership / hierarchical clustering; prompt-block interleaved-vs-grouped ordering flip if Claude output mis-attributes across clusters.
- **Previously flagged cleanup** still open: stray `quotly\supabase\` folder at outer path; orphaned `send-quote-email` edge function in Dashboard; `(row as any).job_size` casts in `useQuotes.tsx` + `QuoteBuilder.tsx`; silent-drop bug in `updateQuote` for `keywords` + `ai_suggestions`.

## Open questions

- Whether to raise the sub-aggregate caveat share threshold above 5% if real Claude output shows over-trust on small samples. Currently fires only when filtered==2 AND share<5% (so only on clusters ≥41 members). User already chose to keep 2-member sub-aggregates in smaller clusters as signal.
- Layer 5 CV<30% per-trade tuning still open (paint vs insulation variance). Defer until real per-trade data lands.
- `ai_idempotency_cache` growth — no scheduled cleanup job. Read-time 60s filter keeps lookups correct. Revisit at ~10k rows or if lookups slow.
- `pattern_keywords` 40% threshold drop to 25% — still parked awaiting 100-quote real-usage data.

## Context that is easy to forget

- **The ReferenceError was the lede.** Every other piece of today's plan was architectural polish that couldn't be meaningfully tested until recompute ran again. If anything in the learning pipeline regresses, check `adminClient` rename first.
- **Forward-only migration.** No backfill for pre-migration `user_job_patterns.member_quote_ids` (NULL) — those rebuild on the user's next quote send via the `console.warn`-flagged fallback. No backfill for pre-migration `user_material_learnings.quote_id` (NULL) — accept one-time double-count on re-sent pre-migration AI quotes. Both documented in the plan's Risks section.
- **Atomic daily-limit uses `pg_advisory_xact_lock(hashtextextended(user_id::text, 0))`.** Serializes per-user RPC calls for the transaction; fine at launch scale.
- **Idempotency cache hash inputs are `{text, image, company_id, trade, job_size, job_size_unit}`** — different text or image with same `request_id` → cache miss (intentional). `request_id` omitted → no read, no write.
- **The plan's "fire-and-forget" semantics still hold** for `recompute-user-profile` from the client — but it no longer swallows errors. A recompute failure will show in the browser console.
- **Haiku determinism is "effectively deterministic at fixed model snapshot"** per Anthropic — acceptance criterion checks 3 consecutive calls within 1 minute, not absolute determinism across unknown time.
- **Supabase CLI bug #4059** (silent function-deploy skip) did NOT bite us today — all three functions showed fresh timestamps. If future deploys show "No change found," delete in Dashboard and redeploy.
- **RLS on `ai_idempotency_cache`:** users read their own rows; service_role has ALL. Edge function uses `adminClient` for writes.
- **Supabase project id:** `cimixmdgcyozwmzboxfk`.
- **Rate-limit tiers (hourly per-IP):** generate-quote 10, extract-keywords 80, send-quote 20, generate-pdf 50, recompute-user-profile 30. Global 24h AI ceiling: 500 combined generate-quote + extract-keywords. DAILY_LIMIT per user for generate-quote: 20.
- **Pre-existing lint baseline** is 221 problems across 6 categories; today's work moved total to 225 without adding categories.
- capybara
