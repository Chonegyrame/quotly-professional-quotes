# Session State

Last updated: 2026-04-30
Branch: main — backlog cleared, this session ends clean. All ROT Phase 3 + UI/CRM work split into 11 small commits and pushed past `ae852fe`.

## What was done this session

- **In-app productivity refactor on Dashboard.** Replaced the four big KPI filter cards with a slim sticky filter toolbar (Alla / Skickade / Accepterade / Utkast / Arkiverade chips with counts + search + sort dropdown). Toolbar uses `position: sticky; top: 57px;` so it stays accessible while scrolling 200+ quotes. Made the in-app `<Navbar>` `sticky top-0 z-40` so it follows users too. Sort dropdown has 5 options (Senaste först, Äldst, Högst värde, Lägst värde, Kund A–Ö); persists in URL via `?sort=`.
- **Soft archive system end-to-end.** Migration applied via Supabase MCP: `ALTER TABLE quotes ADD COLUMN archived_at TIMESTAMPTZ NULL` + partial index for fast `WHERE archived_at IS NULL` scans. `useQuotes` filters archived from default; new `useArchivedQuotes()` hook fetches archived only. Two new mutations: `archiveQuote` (soft, sets timestamp) and `restoreQuote` (clears it). `deleteQuote` kept but gated to a "Ta bort permanent" action with AlertDialog confirmation, only visible on archived quotes.
- **Per-row `···` menu on QuoteCard.** Wrapper changed from `<Link>` to `<Card onClick=navigate>` so dropdown clicks can `stopPropagation` cleanly. Menu items: *Duplicera, Spara som mall, Skicka påminnelse* (only on sent/opened), *Arkivera* (red). Archived view swaps the bottom items to *Återställ* and *Ta bort permanent*. Visa removed (clicking the row already opens detail).
- **Inline reminder UI.** Each row now renders a yellow inline pill to the **right of the customer name** when reminder is due (sent, >48h, no accept): "Ingen respons efter 48h" + "Skicka påminnelse" button. Replaces the old AlertTriangle icon. Row height stays constant; layout shifts horizontally only. Modal lives at Dashboard level; QuoteCard signals via `onSendReminder` callback.
- **QuoteDetail menu rebuilt.** "Ta bort offert" → "Arkivera" (with undo toast). Added *Skicka påminnelse* + *Spara som mall*. Archived quotes show *Återställ* in place of *Arkivera*. Quote lookup now searches both `useQuotes` and `useArchivedQuotes` so archived quotes are still openable. Inline *Skicka påminnelse* button added directly to the orange "Ingen respons efter 48h" banner.
- **Reminder flow.** New `DEFAULT_REMINDER_TEMPLATE` in `lib/emailTemplate.ts`. Reuses the existing `SendQuoteModal` with reminder copy pre-filled — no new edge function. `onSentSuccess` writes a `quote_events` row with `event_type: 'reminder_sent'` and does NOT bump `sent_at`.
- **Spara som mall = full editor (not a dialog).** First built as an inline checkbox dialog, user rejected it as too constrained. Replaced with `src/pages/TemplateBuilder.tsx` — a focused page that reuses `LineItemEditor` so all line items + materials are fully editable. Pre-fills from source quote, lets user prune/edit/add anything, saves a multi-item template to `quote_templates`. New routes: `/templates/new` (blank) and `/templates/from-quote/:quoteId` (pre-filled). Wired into both QuoteCard's and QuoteDetail's `···` menus.
- **Marketing-page polish.** `--radius: 0.75rem → 0.2rem` system-wide (sharper corners). MarketingHeader switched from `max-w-6xl mx-auto` to full-width with `pl-32 pr-32` on lg (logo + CTA hug closer to viewport edges). Landing-page hero carousel reordered bygg → vvs → el (so first slide matches first nav link).
- **Trade page hero overhaul (Bygg, VVS, El).** All three rewritten with the same pattern: 60vh tall, full-bleed `bg-contain bg-right` image on the right with a left-edge mask fading into a horizontal trade-color gradient (sage `rgba(168,200,163)` for El, tan `#c8a079` for Bygg, blue `#7eb6d9` for VVS). Gradient extends to ~96% so the trade color overlays the left portion of the image instead of cutting hard. Text container shifted right via `pl-44` so the gap between copy and image closes.
- **El page yellow → sage.** Hero gradient swapped from honey `#FDE68A` to sage `#a8c8a3` to tie into the grön-teknik narrative on that page.

## Current state

- Filter toolbar live; `?filter=archived` swaps data source to archived view; per-row `···` menu visible on every QuoteCard with proper conditional actions.
- Archive flow working end-to-end: Arkivera → row disappears, undo toast → Återställ → row reappears. Archived view shows Återställ + Ta bort permanent.
- Reminder flow working from three places: row inline button, ···  menu on row, ··· menu in QuoteDetail, and inline button on QuoteDetail's banner.
- Spara som mall opens a full editor at `/templates/from-quote/:id` — confirmed multi-item templates save correctly. `QuoteBuilder.handleTemplateSelect` already maps `default_items[]` so applying multi-item templates also works.
- Trade page heroes render with new layout on `/bygg`, `/vvs`, `/el`. Sticky elements working on Dashboard.
- generate-pdf v18 still active on remote (ROT support from previous session).

## Commits this session

Backlog cleared in 11 commits past `ae852fe`:

1. `chore(supabase)` — track this week's 5 migrations + gitignore design artifacts.
2. `feat(forms)` — visible_when + default in dynamic fields (powers ROT follow-up).
3. `feat(rot)` — ROT-avdrag end-to-end on quotes (Phase 3).
4. `feat(leads)` — avböj flow with reusable decline template.
5. `refactor(classify)` — compute score/tier deterministically from sub-scores.
6. `feat(analytics)` — expanded quote/lead analytics dashboard.
7. `feat(landing)` — kontakt page + trade-hero overhaul + landing image mask.
8. `style(marketing)` — radius, header width, pricing theme + flip wording polish.
9. `feat(dashboard)` — sticky filter toolbar + sort dropdown + sticky navbar.
10. `feat(quotes)` — soft archive + per-row menu + inline reminder pill.
11. `feat(templates)` — full-page TemplateBuilder for multi-item templates.

The `archived_at` migration is now persisted at `supabase/migrations/20260430120000_add_archived_at_to_quotes.sql` (idempotent, since prod already has the column applied via MCP).

## What comes next

1. **Fortnox integration** — user's stated next-day priority. Pro-tier killer feature: auto-create draft invoice in Fortnox from accepted quotes.
2. **AI learning system stress test** — run 50–100 leads through `generate-quote` to verify the 4-layer learning system holds up at volume.
3. **Outstanding from this session's plan** (still on todo list): bulk select markera-mode on Dashboard; sticky toolbar + per-row ··· + bulk select on Inbox; localize ISO dates app-wide.
4. **ROT Phase 4 (personnummer + fastighetsbeteckning)** — still on the long-term roadmap. Was deferred pending real craftsman feedback.

## Open questions

- **Templates.tsx edit form vs TemplateBuilder.** The existing Templates list page still uses its own inline edit form that only handles single-item templates. Multi-item templates created via TemplateBuilder save fine but render only the first item when opened in Templates.tsx's inline editor. Should we redirect "edit template" clicks on Templates.tsx to `/templates/:id/edit` (a new route on TemplateBuilder) and retire the inline form?
- **Reminder rate limiting.** Currently you can send reminder after reminder unbounded. Should we add `last_reminder_sent_at` and gate the button if <24h since last send?
- **Archived view discoverability.** The 5th chip "Arkiverade" works but is the same visual weight as Alla/Skickade. Is that the right hierarchy or should it be visually de-emphasized (e.g., placed at the far right, smaller text)?
- **Inbox bulk action UX.** User pre-confirmed the markera-mode pattern (click "Markera" → enters selection mode → click rows to toggle → bottom action bar). Action bar items will be *Markera som hanterad / Avböj / Avbryt*. Confirmed but not yet built.

## Context that is easy to forget

- **`archived_at` migration applied via MCP, not as a local file.** If you migrate environments or rebuild the schema from migrations folder, the column won't exist. Manually create `supabase/migrations/20260430120000_add_archived_at_to_quotes.sql` with the same DDL the MCP applied if needed.
- **`deleteQuote` is still a hard delete.** Now gated to "Ta bort permanent" on archived quotes only, behind an AlertDialog confirmation. Don't accidentally re-wire it to a primary action.
- **QuoteCard switched from `<Link>` wrapper to `<Card onClick=navigate>`.** All clickable children (dropdown trigger, dropdown content, reminder button, reminder pill wrapper) call `e.stopPropagation()` to prevent navigation. If you add new clickable children inside QuoteCard, remember the propagation guard.
- **In-app navbar sticky uses `top-0 z-40`; Dashboard toolbar uses `top-[57px] z-30`.** Match the offset if porting the toolbar to other pages — the navbar height is exactly 57px including its `border-b`.
- **Templates page form is single-item only.** Multi-item templates from TemplateBuilder save fine, get applied fine in QuoteBuilder, but show only the first item if opened via Templates.tsx's existing edit form. Caveat documented; refactor pending.
- **The Quotly user count at this stage is 1 (you).** Mock data fallback exists in Dashboard when no real quotes are present — `hasDbQuotes ? activeQuotes.map(transform) : mockQuotes`. Stays useful during demo/dev.
- **All previous-session caveats still apply** (Vite strictPort:8081 means preview_* MCP can't bind; Supabase MCP namespace `mcp__02d0ae63-...`; edge function deploy file path quirks; `is_labor` is structural not flag-based; no em-dashes in Swedish copy; AnimatePresence on routes fades pages so screenshots taken too quickly may show faded version).
- **`--radius: 0.2rem` swap is system-wide via CSS variable.** Most components inherit. Some hardcoded `rounded-2xl` / `rounded-xl` instances may still exist (intentional for hero images, FlipDeck cards, etc.). If something looks oddly soft, check for hardcoded radius classes that bypass the var.
