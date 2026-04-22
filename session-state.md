# Session State

Last updated: 2026-04-22 (later in the day)
Branch: main — clean, everything committed + pushed

**⚡ NEXT ACTION when opening a fresh session:** No blocking work. Pick from the backlog under "What comes next" below. The firm-model migration is done (both chunks verified). AI prompt visibility was just added for dev observability.

## What was done this session (the "later" day 2026-04-22 session)

- **Chunk B of firm-model migration shipped + verified** (commit `6b39f89`). Dropped three user-scoped learning tables (all sparse: 3 rows + 0 + 0), recreated as `company_*` versions keyed by `company_id`. New `replace_company_job_patterns` RPC. Updated `recompute-user-profile` (v10) and `generate-quote` edge fns to read/write firm-scoped. Added `company_id` column to `recompute_metrics`. Learning tables repopulate naturally on quote send — verified owner's 10 sent `general` quotes aggregated correctly into `company_trade_profiles` after one test send.
- **AI prompt visibility for dev** shipped (commit `eeb48b3`). New `ai_prompt_text` column on `quotes`. `generate-quote` now returns the full assembled prompt alongside its parsed response. QuoteBuilder persists it on the quote row. QuoteDetail renders a collapsible "AI-prompt (dev)" card visible only on AI-generated quotes. Purpose: observe how the same input prompt produces different Layer 1/2/4 context as the learning pool grows. Removable pre-launch by deleting ~16 lines from QuoteDetail.tsx (data stays) or dropping the column (full removal).
- **Big conceptual discussion** (no code, but saved thinking for later): scoping of learning, what Layer 4 actually tracks (material names, NOT quantities — quantities come from Claude parsing customer input + Layer 5 size scaling + Layer 1/2 as background), what makes a useful AI quality signal (edit magnitude already tracked via `ai_materials_added`/`removed` columns, NOT save rate which is near-meaningless), future architectural consideration for wholesale catalog retrieval layer.

## Current state

- **Firm model is live + complete.** Both firms (Brunn boofing + Wallin taklägg) run on the new schema. One member invited/accepted via the Chunk A flow (`gwallin.photo@gmail.com` is a member of Brunn boofing). Learning system is firm-pooled.
- **Learning data:** `company_trade_profiles` has 1 row (Brunn boofing × general, 10 quotes). Other combos (Brunn × bygg, Brunn × el, Wallin × general) will populate on next send in each. This is expected — plan §6.5 explicitly says rebuild on first quote activity.
- **AI prompt visibility live.** Generate a new AI quote and you'll see the "AI-prompt (dev)" card on the quote detail page.
- **Git:** main is at `eeb48b3`, clean, pushed. No uncommitted changes.
- **Carry-over dirty files:** none this session.

## Uncommitted changes

None. Fully synced with origin/main.

## What comes next — backlog, pick whatever

1. **Pre-existing `/q/:id` accept/decline bug.** Spawned as a separate task during Chunk A session. Customer-facing accept/decline silently fails for anon users (RLS blocks anon writes, UI shows fake success). Fix routes accept/decline through a new `respond-to-quote` edge function. Full brief in the spawned task.
2. **Wholesale material catalog retrieval (architectural prep).** Discussed this session. If/when importing thousands of materials from wholesalers (Beijer, Ahlsell, etc.) becomes a plan, we'd need to add a retrieval layer (keyword filter or vector RAG) *before* materials hit the prompt. Not urgent. Revisit when real wholesaler import is on the table.
3. **Firm material trade-tagging.** Minor refinement: firm `materials` are currently untagged by trade, so ALL firm materials appear in every generate-quote prompt regardless of selected trade. Fine for now (both test firms have <20 materials). Worth addressing when a firm crosses ~100 materials.
4. **Customer's original request visible on the quote (non-dev).** Earlier in this session the user raised this idea — showing what the customer typed ("bygga ett staket 5 m och måla sovrummet") on the generated quote for context. The raw input is technically inside the `ai_prompt_text` now, but buried in thousands of chars. If the user wants a clean surface-level display of just the original input, we'd need a separate `ai_input_text` column and a small QuoteDetail section. Not built yet — deferred.
5. **Layer 4 recency filter** (still parked). Revisit when `company_material_learnings` crosses ~2000 rows or AI starts showing "stale" preferences from long-past jobs.
6. **Fortnox integration (Chunk C)** — still waiting on partner approval.
7. **Pre-launch cleanup items:** verify a Resend domain (still using sandbox sender, blocking real customer email delivery), remove or gate the `ai_prompt_text` dev panel.

## Open questions

- Whether to eventually drop `companies.user_id` column once confident nothing reads it for auth (low priority — audit codebase first).
- Whether invite emails should use a different sender than `send-quote-email` (both still `onboarding@resend.dev`). Moot until a Resend domain is verified.

## Context that is easy to forget

- **`ai_prompt_text` is dev-only.** Renders on QuoteDetail for any AI-generated quote. Remove before launching to real users — they don't want to see internal prompt engineering. One-line removal in [QuoteDetail.tsx](src/pages/QuoteDetail.tsx).
- **The `on_company_created` trigger** is load-bearing for signup — auto-creates owner membership when a new company is inserted. Don't drop it without replacing the mechanism.
- **Role-based RLS pattern:** `is_company_member(company_id)` for SELECT/INSERT/UPDATE access, `company_role(company_id) IN ('owner', 'admin')` for DELETE and company settings. Members can do everything except delete quotes/materials/templates or edit company settings.
- **Layer 4 does not track quantities.** Only which materials the user adds/removes per keyword context. Quantities come from (1) Claude parsing explicit customer input, (2) Layer 5 size scaling (kvm/m/m3 jobs), (3) Layer 1/2 `avg_quantity` as background context. Customer's explicit request should win; Claude is usually reliable for clear counts.
- **Save rate is a vanity metric for AI quality.** Users save almost everything because the UX funnels to save. Real signal is edit magnitude: `ai_materials_added` / `ai_materials_removed` on quotes. Near-zero edits = AI nailed it; many edits = AI was wrong.
- **Resend sandbox limitation** persists. `onboarding@resend.dev` only delivers to `gustav.wallin123@gmail.com` (the Resend account owner). Applies to `send-quote-email` AND `send-team-invite`. See `project_resend_sandbox.md` memory entry.
- **Edge function deploys:** use `./supabase.exe functions deploy <name> --project-ref cimixmdgcyozwmzboxfk` via CLI. MCP's `deploy_edge_function` works but requires JSON-escaping large files by hand, which is error-prone for files >500 lines.
- **generate-quote is 1030 lines.** Considered fat but not urgent to refactor. When next touching it for a substantive change, consider splitting into `_shared/` modules (prompt-layers.ts, layer5.ts, sub-aggregates.ts).
- **Two test accounts + membership state:**
  - Brunn boofing (company_id `6b84d6a5…`): owner `gustav.wallin123@gmail.com`, member `gwallin.photo@gmail.com`
  - Wallin taklägg (company_id `0b663e76…`): owner only (different user)
- **Two companies, four trade combos with sent quotes:** Brunn×bygg (5), Brunn×el (2), Brunn×general (10), Wallin×general (25). Only Brunn×general has populated learning tables so far.
- **Pre-existing TS error at LandingPage.tsx:835** (framer-motion Variants typing) — unrelated carry-over.
- **Scroll-driven hero animations** still can't be verified in Claude Preview harness — test visually in Chrome.
- capybara
