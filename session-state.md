# Session State

Last updated: 2026-04-28 (later)

Branch: main — clean once this session's commits land and push completes.

## What was done this session

Built the **formulär manager** — a complete UI in Settings for firms to view, customize, and create their own intake forms — and made the routing of customers to those forms deterministic via trigger-keywords. The customer-facing classifier now does keyword-match-first with smart tie-break to AI.

### 1. DB foundation
- Migration `20260428160000_form_template_trigger_keywords.sql`: added `trigger_keywords text[]` to both `form_templates` and `company_form_templates`. Dropped `UNIQUE (company_id, sub_type)` on the per-firm table and added `UNIQUE (company_id, name)` instead, so a firm can have multiple custom forms in the same sub_type.
- Seeded sensible Swedish triggerord on all 15 standard templates (general/allman intentionally has none — AI fallback only).
- Migration `20260428210000_prune_bygg_allman_triggerord.sql`: dropped `fönster` and `dörr` from bygg/allman after they caused false positives on tillbyggnad-style requests ("uterum med stora fönster").

### 2. Formulär manager UI
- New entrypoint in Settings: header gets a "Formulär" toggle button (when in settings) → switches to the Formulär landing.
- Landing shows a "Testa kundinput" sandbox (mirrors the production classifier including tie detection) + 4 trade boxes (El, VVS, Bygg, Övrigt) with form counts.
- Each trade drills into a list of forms — global standards + the firm's custom forms.
- Form cards show name + description, **"Trigger-ord:"** label with chips (gray = standard, accent = firm-added), Förhandsgranska / Redigera / Inaktivera actions.
- Preview-as-customer dialog renders the form via existing `FormFieldRenderer`.
- Lazy-copy mechanic: when a firm edits a global form (keywords or schema) or deactivates one, a `company_form_templates` row is silently created pointing back to the standard with `based_on_template_id`. The standard library is never modified. `useFormTemplates` hides globals that have been overridden.
- Create / edit modal supports the same six field types as global forms (short_text, long_text, number, single_select, multi_select, file_upload) including a per-question options editor for select types, required toggle, add/remove fields.
- Triggerord conflict detection: if a firm's keywords overlap with another active form, an amber panel lists the conflicts and toasts on save (custom always wins on actual classification).

### 3. Classifier rewrite (`classify-intake-request` v3 ACTIVE on remote)
- Pulls global library + per-firm custom templates in parallel, then hides any global that has a custom override.
- Phase 1: keyword match — case-insensitive substring against `trigger_keywords`. Custom > global, more hits = better.
- Phase 2: tie-break — if multiple forms tie on (source, hit count), AI gets called *only on the tied subset*. Saves AI cost on clear winners, gets smart disambiguation on ambiguous ones.
- Phase 3: if AI returns null OR no keywords matched at all → existing AI fallback over all candidates.
- Phase 4: final fallback to general/allman.
- Response now includes `method: "keyword" | "ai" | "fallback"` and `matched_keywords?: string[]` so the test sandbox and any future debugging UI can show why a customer landed where they did.

### 4. Customer flow polish
- `IncomingRequestForm.tsx`: when the classifier returns a template, pre-fill the first `long_text` field with the customer's brief input. Saves them retyping the same description on the structured form (the "Kort om jobbet" / "Kort om projektet" textarea was the redundancy).

## Current state

- The full formulär feature works end-to-end: customer types brief → classifier picks form by keyword (or AI on tie) → customer fills form with first long_text pre-filled → submission → firm sees lead in Inbox.
- Standard library is immutable per firm. Firms get their own world of customizations via lazy-copy.
- Test sandbox in Settings mirrors production behavior including tie surfacing ("X-vägs lika — AI avgör").
- Verified live: "bygga ett uterum med stora fönster" now routes to Tillbyggnad / utbyggnad with `method=keyword, matched=["uterum"]` — the bygg/allman pruning broke the previous false-positive tie.

## Edge functions deployed via MCP this session

- `classify-intake-request` v2 (initial keyword-first version) → v3 (tie-break-to-AI). v3 is current.

## Open / parked

- **Lightweight triggerord-only modal** for "+ lägg till" links on standard form chips — currently opens the full schema editor. Works but heavier than needed. Polish, low priority.
- **RAG / embeddings work on quote generation** still parked per `future-implementations.local.md`. Not relevant to this session's classifier work — the candidate space is tiny (~30 forms). Real embeddings work belongs to the generate-quote learning system, gated on having an eval harness first.
- **Keyword tuning policy.** The `fönster` / `dörr` prune is a one-time fix. Firms naturally extend keywords on their custom forms via the UI. If we ever see another false-positive class issue, the tie-break-to-AI usually catches it; if not, the standards can be pruned again.

## Notable carryover from prior sessions still open
- Build `/integritetspolicy`, cookie disclosure
- Lär dig mer footer link target
- Hero ImagePlaceholders on `/bygg`, `/vvs`, `/el`
- Verify 4-tier lead-scoring deploy end-to-end with a real intake
- Delete dead `src/pages/TradePage.tsx` (still alive — modified to use new chrome — but worth re-checking if it's still doing useful work)

## Context that is easy to forget

- **Lazy-copy creation is silent and idempotent.** Hitting "Inaktivera" on a global creates a `company_form_templates` row with the global's snapshot. Editing a custom doesn't recreate. `based_on_template_id` is the link.
- **The "Standard" badge on a card disappears once the firm forks the schema, not when they just add keywords.** Adding keywords keeps the linked-copy displayed as "Anpassad standard". Editing questions removes the Standard badge entirely.
- **`UNIQUE (company_id, name)`** on `company_form_templates` is the new constraint. Firms get a friendly error if they try to create two custom forms with the same name. `(company_id, sub_type)` is intentionally not unique anymore.
- **Customer flow respects firm trades.** A VVS-only firm's customers will never see El forms regardless of how triggerord match — the classifier filters candidates by `firm.primary_trade + secondary_trades + general` first.
- **All carryover quirks from prior sessions still apply.** Vite on port 8081 with `strictPort: true` (npm run dev OK via Bash run_in_background; preview_* tools fail), no em-dashes in Swedish copy, Inter is the only font, FlipDeck must stay JS-free per-scroll, etc.
