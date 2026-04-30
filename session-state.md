# Session State

Last updated: 2026-04-30 (late evening)
Branch: main — Fortnox integration shipped end-to-end and verified live against a Testmiljö account. All work committed and pushed; no loose changes.

## What was done this session (continuation of earlier 2026-04-30 session)

The earlier part of today closed out the ROT Phase 3 + UI/CRM backlog (11 commits past `ae852fe` — see "Commits" below). The later part of today shipped the Fortnox integration end-to-end.

### Fortnox integration — full lifecycle

- **OAuth2 connection per firm.** New `fortnox_connections` table (RLS deny-all; service-role only). Frontend reads safe state via `fortnox-status` edge function — tokens never reach the browser. `Anslut Fortnox` button in Settings → consent at apps.fortnox.se → redirect to `/auth/fortnox/callback` → `fortnox-oauth-callback` edge function exchanges code for tokens (Basic-auth with CLIENT_ID:CLIENT_SECRET) → upserts row → `fortnox-disconnect` clears.
- **Send accepted quotes as draft invoices.** `Skicka till Fortnox` button on QuoteDetail when `status='accepted'`, no existing sync. `create-fortnox-invoice` edge function: atomic claim on `fortnox_synced_at` (idempotency), refresh tokens via optimistic concurrency on `refresh_token`, find-or-create Fortnox Customer (PRIVATE, SE), build InvoiceRows from quote_items + materials, POST `/3/invoices` with `Sent: false`, persist `fortnox_invoice_number` on success. Best-effort customer rollback if invoice POST fails.
- **ROT-avdrag mapping.** Labor rows tagged `HouseWork: true` + `HouseWorkType` per trade (CONSTRUCTION/ELECTRICITY/HVAC). Material rows always `HouseWork: false`. Invoice-level `HouseWork: true` when quote.rot_eligible. **Untested live** — the verification quote wasn't ROT-eligible. Marked TODO(fortnox-spike).
- **One-firm-per-user constraint.** Added `UNIQUE (user_id)` on `company_memberships` after security review found the multi-firm-per-user case as a critical cross-tenant data leak. `accept-team-invite` updated to return clean Swedish 409 if invitee already in another firm.
- **Frontend.** `useFortnoxConnection` hook (status + completeOAuth + disconnect + sendInvoice). `FortnoxSection` card in Settings. `FortnoxCallback` page with state nonce + user-binding to close CSRF login-fixation. Synkad-till-Fortnox badge on QuoteDetail after success.
- **Security review.** Two parallel reviewers spawned mid-session caught: critical cross-tenant via membership ambiguity (closed by UNIQUE constraint + defensive eq("company_id", quote.company_id)), HIGH idempotency race (closed by atomic claim), HIGH OAuth state CSRF (closed by user-binding), HIGH token refresh race (closed by optimistic concurrency), HIGH error bubbling (closed by sanitizing all catch blocks). 3 MEDIUM fixes also landed: IP rate limits on every fortnox-* function, `FORTNOX_REDIRECT_URIS` allow-list env var, dropped dead `Buffer` fallback in basicAuthHeader.
- **Double-click race fixes** (during the same review pass, since the user noticed the same idempotency class of bug had bitten generate-quote a few days ago): synchronous `useRef` guards on `QuoteBuilder.handleSave`, `useGenerateQuoteFromRequest.generate`, `QuoteCard.handleDuplicate`, `QuoteDetail.handleDuplicate`, `DeclineRequestDialog.handleSend`. The mutation.isPending button gating was cosmetic — only the ref guard is synchronous and actually prevents the double fire.

### End-to-end verification

Confirmed live against a Testmiljö Fortnox account:
- "Anslut Fortnox" → consent → "Ansluten" badge ✓
- "Skicka till Fortnox" on accepted quote ("gustav", 19 138 kr, 4 line items) → "Synkad till Fortnox · #1" badge ✓
- Fortnox Kundfakturor list shows the draft invoice with matching numbers, customer, dates, totals ✓

Failures encountered along the way (now fixed):
- 404 from non-existent `vat_rate` column on `quote_item_materials` — removed from select.
- 502 from invalid customer email "s" — added `cleanEmail` regex + `cleanField` for empties.
- 502 from missing räkenskapsår on Testmiljö — Fortnox-side setup, not a Quotly bug. User added it.
- 403 from Resend on send-quote during the round-trip (sandbox sender + case-mismatched email). Known Resend constraint, not Quotly.

## Current state

- All Fortnox setup complete: env vars (`VITE_FORTNOX_CLIENT_ID`, `FORTNOX_CLIENT_ID`, `FORTNOX_CLIENT_SECRET`, `FORTNOX_REDIRECT_URIS`) set in Supabase secrets + `.env`. Redirect URI registered in developer.fortnox.se. Permissions checked: Faktura, Kund, Företagsinformation. Räkenskapsår configured in user's Testmiljö.
- Five fortnox-* edge functions deployed, plus accept-team-invite v5. Three migrations applied (fortnox_connections, quotes_fortnox_invoice_columns, one_membership_per_user).
- Backlog from earlier today (11 commits) plus today's Fortnox commits all pushed to origin/main.
- generate-pdf v18 still active on remote (ROT support from earlier session).

## Commits this session

Earlier-day work (UI/CRM/ROT backlog): 11 commits past `ae852fe` — see prior session-state for the list (chore migrations, feat forms, feat rot, feat leads, refactor classify, feat analytics, feat landing, style marketing, feat dashboard, feat quotes archive, feat templates).

Fortnox + security review:
1. `feat(auth): one firm per user` — `1137ecd`. UNIQUE (user_id) on company_memberships + accept-team-invite friendly 409.
2. `fix(fortnox): close 5 HIGH-severity findings from security review` — `dfa14cc`. Defensive company_id check, atomic-claim idempotency, OAuth state user-binding, token refresh race via optimistic concurrency, error sanitization, customer-rollback on invoice failure.
3. `fix(fortnox): close 3 MEDIUM-severity findings from security review` — `89e573a`. IP rate limits, FORTNOX_REDIRECT_URIS allow-list, basicAuthHeader Buffer fallback removed.
4. `fix: synchronous re-entrancy guards on five mutation handlers` — `a6f4bb7`. useRef-based guards on QuoteBuilder.handleSave, useGenerateQuoteFromRequest.generate, QuoteCard.handleDuplicate, QuoteDetail.handleDuplicate, DeclineRequestDialog.handleSend.

The Fortnox scaffold (`feat(fortnox): scaffold OAuth + invoice push backend` `c7adb9c`, `feat(fortnox): connect flow in Settings + Skicka till Fortnox on QuoteDetail` `0e19b6f`, `docs(fortnox): integration mapping + auth flow reference` `df72a56`) was the original plumbing — landed earlier in the session.

Then the live-test fix-up commits (will be a single commit on next push since they came after the deploy verification): `vat_rate` column removal + console.error on quote-lookup-failure, `cleanField` / `cleanEmail` helpers, Option B contact requirement (name + at least one of email/phone), `_detail` debug field added then removed once Fortnox spike was complete, error-body parsing in `useFortnoxConnection.sendInvoice` so toasts surface real Swedish messages instead of generic "non-2xx" wrapper.

## Security review (post-session, 2 senior reviewers run in parallel)

Both reviewers verified the previous critical + 5 HIGH + 3 MED fixes and looked for new issues. Status of previous fixes:

| Previous finding | Status |
|---|---|
| 🔴 CRITICAL — cross-tenant via membership ambiguity | ✅ Closed (UNIQUE constraint + defensive eq) |
| HIGH #1 — defensive company_id check | ✅ Closed *on `create-fortnox-invoice` only* — see new MED #5 below |
| HIGH #2 — idempotency race / atomic claim | ⚠️ Closed for happy path; **two new edge cases** found (HIGH #1, #2 below) |
| HIGH #3 — OAuth state user-binding | ✅ Closed |
| HIGH #4 — token refresh race | ⚠️ Partially closed — Fortnox grace-window edge case still theoretical (MED #6) |
| HIGH #5 — raw error bubbling | ✅ Closed |
| MED #6 — IP rate limits | ✅ Closed (TOCTOU caveat — MED #10) |
| MED #7 — redirect_uri allowlist | ✅ Closed but operationally fragile + fails open if env empty (MED #9) |
| MED #8 — basicAuthHeader Buffer fallback | ✅ Closed |
| Double-click ref guards on 5 mutation handlers | ⚠️ Closed at UI layer only; server-side idempotency only exists on `create-fortnox-invoice` (MED #7) |

### New findings (uncommitted — to fix in next session)

**🟠 HIGH (3 — fix early next session)**
1. **Claim leak when `rows.length === 0`** — `create-fortnox-invoice/index.ts:365-370`. Returns 400 without `await rollbackClaim()`. Quote permanently locked at 409. Fix: rollback before the 400 return, or move row-build above the claim.
2. **State-machine TOCTOU between read and atomic claim** — same file, lines 158-189. Status can flip to archived/completed/revised between read and claim; invoice still gets pushed. Fix: add `.eq("status", "accepted")` to the claim's WHERE.
3. **`cleanField` allows control chars / bidi / homographs** — same file, lines 64-68. Public intake form can pollute firm's Fortnox catalog with deceptive `customer_name` values (U+202E etc.). Fix: strip `\p{C}` + `\p{Cf}`, cap fields to ~200 chars, cap email to 254.

**🟡 MEDIUM**
4. **`accept-team-invite` mishandles pre-existing duplicate memberships** — only triggers if `UNIQUE (user_id)` is ever bypassed; defensive 409 needed.
5. **Defensive `company_id` check missing on disconnect/status/oauth-callback** — only `create-fortnox-invoice` got the defense-in-depth filter. Pattern needs to be applied to the other three.
6. **Token refresh: Fortnox grace-window double-issue** — theoretical persistent-lockout if Fortnox accepts the same refresh_token from two callers in its grace window. Fix is a per-company Postgres advisory lock instead of optimistic concurrency.
7. **No server-side idempotency for createQuote / duplicateQuote / generate-quote / declineRequest** — `useRef` guards are UI-only. Strict-Mode remount or scripted bypass re-opens the double-fire window. Real fix: client-minted idempotency token + unique constraint on rows.
8. **Customer-rollback abuse vector** — malicious member can churn ~60 PRIVATE customer DELETEs/hour in firm's Fortnox by submitting failing invoices. Fix: validate invoice payload before customer-create, or move customer-create after invoice POST.
9. **`redirect_uri` allowlist fragility** — strict `Array.includes` (no normalization for trailing slash / case); silently fails open if `FORTNOX_REDIRECT_URIS` env unset. Fix: hard-fail in prod when empty + normalize comparison.
10. **`checkIpRateLimit` TOCTOU** — read-then-insert; effective limit doubles under concurrency. Fix: atomic counter row.

**🟢 LOW (deferred)**
- 403/404 oracle on quote ownership (currently unreachable due to RLS; future risk if RLS relaxes)
- `sendInvoice` toast doesn't cap error-body size
- `fortnoxFetch` raw bodies into logs (potential token leak if logs ever ship to less-trusted aggregator)
- `getAccessToken` doesn't guard for missing `FORTNOX_CLIENT_SECRET`
- `accept-team-invite` no IP rate limit
- `ranRef` set before validations in `FortnoxCallback` (cosmetic)
- `fortnox-status` exposes `expires_at` + `scope` (timing metadata, acceptable)

## What comes next

1. **Security fixes from review** — at minimum HIGH #1, #2, #4 (claim leak, status TOCTOU, cleanField hardening) before any production traffic. MEDIUMs #5, #7 in the next session pass; rest can be batched later.
2. **Toast positioning** — user requested error toasts render center-aligned (modal-style) instead of corner. Cosmetic, low priority.
2. **Fortnox cosmetic + accounting polish (deferred from live verification):**
   - Labor rows post with no `Unit` field → blank in Fortnox UI. Default to `Unit: "st"` or `"tim"`.
   - All rows book to default Konto 3001 (försäljning, varor 25%). Real firms would prefer labor on a service account (3041). We don't currently send `Konto` per row. Either map Quotly trade → konto, or leave for the firm's bookkeeper.
   - TG % shows 100% on every row in Fortnox because we don't send purchase/cost data. Correct per design (cost data stays in Quotly) but worth documenting for firms who'd ask.
   - **ROT-avdrag verification** — the live test wasn't ROT-eligible. Need to push a ROT-eligible quote and confirm Fortnox shows the HouseWork tag + the discount. `TODO(fortnox-spike)` markers in `_shared/fortnox.ts` and `create-fortnox-invoice/index.ts` flag the exact spots to verify.
   - Customer Type is hardcoded `PRIVATE`. Corporate customers get mistyped. Add a toggle on the quote when a real corporate-billing user appears.
3. **Resend domain verification** — current sender is `onboarding@resend.dev` (sandbox). Only delivers to the Resend account-owner email. To send to real customers, verify a domain in Resend and switch the `from:` field. Unblocks send-quote + send-team-invite + send-lead-decline + the reminder flow.
4. **AI learning system stress test** — run 50–100 leads through `generate-quote` to verify the 4-layer learning system holds up at volume.
5. **Outstanding from earlier today's plan** (still on todo list): bulk select markera-mode on Dashboard; sticky toolbar + per-row ··· + bulk select on Inbox; localize ISO dates app-wide.
6. **ROT Phase 4 (personnummer + fastighetsbeteckning)** — still on the long-term roadmap. Was deferred pending real craftsman feedback.

## Open questions

- **Templates.tsx edit form vs TemplateBuilder.** The existing Templates list page still uses its own inline edit form that only handles single-item templates. Multi-item templates created via TemplateBuilder save fine but render only the first item when opened in Templates.tsx's inline editor. Should we redirect "edit template" clicks on Templates.tsx to `/templates/:id/edit` (a new route on TemplateBuilder) and retire the inline form?
- **Reminder rate limiting.** Currently you can send reminder after reminder unbounded. Should we add `last_reminder_sent_at` and gate the button if <24h since last send?
- **Archived view discoverability.** The 5th chip "Arkiverade" works but is the same visual weight as Alla/Skickade. Is that the right hierarchy or should it be visually de-emphasized (e.g., placed at the far right, smaller text)?
- **Inbox bulk action UX.** User pre-confirmed the markera-mode pattern (click "Markera" → enters selection mode → click rows to toggle → bottom action bar). Action bar items will be *Markera som hanterad / Avböj / Avbryt*. Confirmed but not yet built.
- **Resend domain decision.** Use a custom domain like `noreply@quotly.se` once the prod domain exists, or add the firm's own SMTP credentials so emails come from their own address? Latter is more legit but adds setup complexity per firm.

## Context that is easy to forget

### Fortnox-specific (this session)

- **Tokens never reach the browser.** `fortnox_connections` has RLS deny-all; only service-role bypasses. Frontend uses `fortnox-status` edge function for safe state (returns connected_at, scope, expires_at — no tokens).
- **Atomic claim pattern.** Before any external Fortnox call, `create-fortnox-invoice` does a conditional `UPDATE quotes SET fortnox_synced_at=$sentinel WHERE id=$id AND fortnox_invoice_number IS NULL AND fortnox_synced_at IS NULL`. If 0 rows updated → another caller already claimed → 409. On any subsequent failure: rollback the claim back to NULL. Worked end-to-end in live test.
- **Token refresh race uses optimistic concurrency, not advisory lock.** `getAccessToken` updates with `.eq("refresh_token", oldValue)`. If 0 rows, another caller already refreshed → re-read DB and return their fresh token. Refresh-call failure also re-reads (in case the OTHER caller's refresh succeeded but ours rejected because Fortnox already rotated the token). Converges in all races.
- **`one_membership_per_user` is now load-bearing.** The DB constraint guarantees `.limit(1).maybeSingle()` patterns return THE membership, not A membership. If anyone ever drops this constraint, audit every edge function that uses that pattern.
- **`onboarding@resend.dev` sandbox limit + case-sensitivity.** Resend's sandbox sender only delivers to the account-owner email. They're also unexpectedly case-sensitive (the user's quote had email saved with capital `G`, Resend rejected it as "not your address"). Once a real domain is verified, this isn't a constraint.
- **Fortnox returnerade krav på räkenskapsår** — fresh Testmiljöer don't have a räkenskapsår (fiscal year) configured. Fortnox refuses `/invoices` POST without one. Real firms always have one. Document for new test setups.
- **F-skatt / VAT in Fortnox setup wizard.** For testmiljö with org-nummer 555555-5555, VAT-nr is `SE555555555501` (SE + 10-digit org-nr without dash + 01). F-skatt: Godkänd is the realistic default.

### Older context (still relevant)

- **`archived_at` migration applied via MCP, not as a local file.** If you migrate environments or rebuild the schema from migrations folder, the column won't exist. Manually create `supabase/migrations/20260430120000_add_archived_at_to_quotes.sql` with the same DDL the MCP applied if needed.
- **`deleteQuote` is still a hard delete.** Now gated to "Ta bort permanent" on archived quotes only, behind an AlertDialog confirmation. Don't accidentally re-wire it to a primary action.
- **QuoteCard switched from `<Link>` wrapper to `<Card onClick=navigate>`.** All clickable children (dropdown trigger, dropdown content, reminder button, reminder pill wrapper) call `e.stopPropagation()` to prevent navigation. If you add new clickable children inside QuoteCard, remember the propagation guard.
- **In-app navbar sticky uses `top-0 z-40`; Dashboard toolbar uses `top-[57px] z-30`.** Match the offset if porting the toolbar to other pages — the navbar height is exactly 57px including its `border-b`.
- **Templates page form is single-item only.** Multi-item templates from TemplateBuilder save fine, get applied fine in QuoteBuilder, but show only the first item if opened via Templates.tsx's existing edit form. Caveat documented; refactor pending.
- **The Quotly user count at this stage is 1 (you).** Mock data fallback exists in Dashboard when no real quotes are present — `hasDbQuotes ? activeQuotes.map(transform) : mockQuotes`. Stays useful during demo/dev.
- **All previous-session caveats still apply** (Vite strictPort:8081 means preview_* MCP can't bind; Supabase MCP namespace `mcp__02d0ae63-...`; edge function deploy file path quirks; `is_labor` is structural not flag-based; no em-dashes in Swedish copy; AnimatePresence on routes fades pages so screenshots taken too quickly may show faded version).
- **`--radius: 0.2rem` swap is system-wide via CSS variable.** Most components inherit. Some hardcoded `rounded-2xl` / `rounded-xl` instances may still exist (intentional for hero images, FlipDeck cards, etc.). If something looks oddly soft, check for hardcoded radius classes that bypass the var.
