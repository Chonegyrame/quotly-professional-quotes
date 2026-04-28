# Session State

Last updated: 2026-04-28

Branch: main — clean. All of this session's work committed across 6 commits and pushed to origin/main.

## What was done this session

Architectural fix for the AI quote price-invariant bug. The `purchase_price ≠ unit_price / (1 + markup/100)` desync that produced -2483% margins was structurally eliminated, not patched.

1. **Cosmetic polish on MaterialRowEditor.** Added unit suffixes to the priced inputs in `src/components/quote-builder/MaterialRowEditor.tsx`: `kr` on Inköpspris and Kundpris, `%` on Påslag. Absolute-positioned with `pointer-events-none`, right-padding on the inputs so digits don't overlap.

2. **Diagnosed the catalog-poisoning loop.** Traced the data flow with two parallel research agents (codebase mapper + architectural patterns research). Found the loop: AI hallucinates inconsistent triple → frontend saves all 3 fields to `quote_item_materials` → frontend upserts all 3 to `materials` catalog → next AI generation pulls polluted catalog via the saved-price override → bad values propagate forever. Confirmed via DB query: 31 of 41 rows broken in the test quote (id `999681a9-a477-4e35-9bb9-80a00511ee17`), 35 of 104 catalog rows had drift.

3. **Architectural fix: Option B1 (single source of truth) + repair fallback + DB CHECK.** Migration `20260427210000_price_invariant_generated_unit_price.sql`:
   - Reconciled all 35 broken catalog rows by trusting `unit_price` and back-deriving `purchase_price`. Verified 0/104 broken post-migration.
   - Dropped `unit_price` columns on `materials` and `trade_materials`, re-added as `GENERATED ALWAYS AS (purchase_price * (1 + markup_percent/100.0)) STORED`. The third field is now non-writable; the invariant is a property of the schema, not of code discipline.
   - Added CHECK `markup_percent <= 1000` upper bound on both tables.

4. **Edge function `generate-quote` v23 deployed.** Removed the old "repair before override" block (which the override was clobbering). Added "repair after override" as the final pass before returning, so any AI output that's still desynced for fresh materials gets back-calc'd before reaching the frontend or being snapshotted into `quote_item_materials`. The saved-price override unchanged in shape — still SELECTs all three fields (the generated unit_price is read-only, not invisible).

5. **Frontend writers updated to stop writing `unit_price` to the catalog.** Three files: `src/pages/QuoteBuilder.tsx` catalog upsert (both INSERT and UPDATE branches), `src/pages/Materials.tsx` manual edit form, `src/hooks/useMaterials.tsx` starter-material seeder. Trying to write a generated column would now fail at the DB level — every site already drops the field.

6. **Quote line items (`quote_item_materials`) intentionally left as-is.** That table keeps `unit_price` as a regular writable column (snapshot semantics — frozen at quote-save time so historical PDFs don't shift if the catalog price changes later). No schema change.

7. **Selling-at-cost edge case fixed in `QuoteBuilder.tsx` catalog upsert.** If the user types only kundpris on a fresh row (no inköp, no markup), the upsert now treats it as selling-at-cost: `purchase_price = unit_price`, `markup_percent = 0`. DB recomputes `unit_price = purchase_price × 1` = same value the user typed. Round-trip preserved. Without this, the catalog row would have stored 0/0 and zeroed out the typed kundpris on next AI generation.

8. **Supabase types regenerated.** `src/integrations/supabase/types.ts` overwritten via `mcp__supabase__generate_typescript_types`. `materials.unit_price` and `trade_materials.unit_price` now show as `number | null` reflecting their generated nature. PostgrestVersion 14.1's generator does not strip generated columns from Insert/Update types — they appear as optional. TypeScript won't catch a future write attempt, but the DB will reject at runtime.

## Current state

- **The class of bugs is structurally impossible.** No code path can store a `unit_price` that disagrees with `purchase_price × (1 + markup_percent/100)` in the catalog tables. Tested with a DB consistency query post-migration: 0/104 broken in `materials`, 0/86 broken in `trade_materials`.
- The vavavav test quote (id `999681a9-a477-4e35-9bb9-80a00511ee17`) is left in the DB unchanged as a before/after reference. Its `quote_item_materials` rows still have the inflated purchase_price values from the old AI output (we don't touch the snapshot table). Generating a fresh quote with the same prompt is the right way to verify the fix.
- AI generation flow now: AI returns triple → catalog override pulls consistent values for known materials → final repair pass back-derives any AI-only rows that drifted → response goes to frontend with all rows internally consistent.
- The bidirectional MaterialRowEditor is unchanged from the user's perspective — typing any of the three fields still works. Only the persistence path differs.

## Commits this session (2026-04-28)

All committed to `main` and pushed. In order:

1. `feat(quote): structurally fix AI price-invariant bug` — generated `unit_price` columns + post-override repair pass + frontend writers stop writing the generated field.
2. `feat(lead-filter): 4-tier scoring + Inbox tweaks` — carryover from prior session.
3. `feat(quote-send): branded customer view + preview dialog` — `get_quote_company_branding` RPC + `CustomerViewPreviewDialog`.
4. `feat(landing): trade pages, marketing chrome, Inter-only typography` — extracted `MarketingHeader` / `Footer`, added Bygg/El/Vvs/Pricing/Anvandarvillkor/FragorOchSvar/Ovrigt pages, switched fonts to Inter everywhere.
5. `refactor(flipdeck): replace previews with new four` — swapped to BusinessInsights/MaterialFlow/QuoteTracking/ROTCalc, deleted obsolete `FeatureDetail` page.
6. `chore: firm migration status, session state, gitignore local notes` — doc + state + `*.local.md` ignore pattern.

Edge functions deployed via MCP earlier this session: `generate-quote` v23, `score-incoming-request` v2 (both ACTIVE).

Skipped (intentionally untracked, not gitignored): `Lead Cards Scroll Animation.html`, `scroll-line-demo-fixed.html`, `formul_r slider.zip`, `landing page quotly.zip`, `zaptec-UHNdOFqNhNQ-unsplash.jpg`, `_design_handoff/`. Tidy or formally ignore in a future session.

## What comes next

1. **Test the fix end-to-end.** Generate the same Attefallshus prompt that produced -2483% margin in the previous session. Watch the marginal box: total materialkostnad should land in the ~150–250k range (not 13M+), marginal should be a sane positive percentage. If anything still drifts, check edge function logs for `Repaired N inconsistent material rows post-override` to see how many AI rows the final-pass repair caught.
2. **Carryover from prior session — not touched today:**
   - Build `/integritetspolicy` (still `#` in footer; GDPR Art. 13–14 requires it)
   - Build `/cookie-instalningar` or simple disclosure
   - Apply Peter-style fix to `/el` Johan example (Bulk Box 3 from 3 lines → 6–7 lines)
   - Decide what `Lär dig mer` (footer) links to
   - Hero ImagePlaceholders on /bygg, /vvs, /el still aspect-4/3 placeholders
   - Verify 4-tier lead-scoring deploy (`20260425120000_four_tier_lead_scoring.sql` + `score-incoming-request` edge function)
   - Delete dead `src/pages/TradePage.tsx`

## Open questions

- **Whether to add Zod validation + retry at the AI boundary (Option E from the architectural research).** Not implemented this session — B1 + the repair fallback already break the loop. E would add extra robustness if AI quality becomes an issue. Easy to layer in as v24 later.
- All carryover from prior sessions still stand: image sourcing strategy (pay-per-shot stock vs Adobe Firefly vs design partner), cookie banner vs simple disclosure, when to start the first specialized agent from `future-implementations.local.md`, all legal placeholders (Org.nr, address, support email, etc.).

## Context that is easy to forget

- **`materials.unit_price` and `trade_materials.unit_price` are GENERATED columns now.** Any new code that tries to INSERT or UPDATE them will fail with a Postgres error. Frontend types still show them as writable (PostgrestVersion 14.1 limitation), but TypeScript won't catch the misuse — the DB will. Always write only `purchase_price` and `markup_percent` to those tables.
- **`quote_item_materials.unit_price` is intentionally NOT generated.** It's a snapshot column — frozen at save time so historical PDFs don't shift. All three fields are writable on that table. Don't refactor it to match `materials`; it has a different contract (immutable history).
- **Saved-price override still copies all three fields from catalog.** Works because the generated unit_price is fully readable via SELECT. Only the write side is restricted.
- **Selling-at-cost shortcut at `QuoteBuilder.tsx` catalog upsert.** If user types kundpris alone with `purchasePrice === 0`, the upsert promotes `unit_price → purchase_price` and sets markup to 0. Don't "fix" this thinking it looks weird — without it, user-typed kundpris alone would round-trip to 0.
- **vavavav test quote still in DB (`999681a9-a477-4e35-9bb9-80a00511ee17`)** with old broken purchase_price values intact. Its `quote_item_materials` rows are not reconciled (snapshot table is left alone). Useful for before/after comparison; safe to delete once verified.
- All carryover quirks from prior sessions still apply: Vite on port 8081 with `strictPort: true` (preview_start fails, user runs dev server), FlipDeck must stay JS-free per-scroll, FrontPanel uses Flexbox not Grid, FlipDeck card height = 425, Inter is the only font, Footer is shared component, no em-dashes in Swedish copy, formul_r slider.zip in root is user's source artifact (don't delete), DPA is INSIDE Användarvillkor section 7, Box 1 in PipelineDemo uses JS-calculated min-height, `future-implementations.local.md` is gitignored local notes file.
