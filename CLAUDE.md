# Quotly — Professional Quote Management

Quotly is a quote/quotation management app for Swedish tradespeople (bygg, el, vvs).
Users create structured quotes with labor + material line items, manage customers,
generate quotes with AI, send via email/SMS, export PDF, and track analytics.

The app is in active development. Swedish is the primary language for UI and data.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite (port 8081)
- **Styling:** Tailwind CSS with shadcn/ui (Radix primitives, slate base)
- **State:** React Query (server state), React Context (auth), useState (UI)
- **Backend:** Supabase — PostgreSQL, Auth, Edge Functions (Deno)
- **AI:** Claude Haiku via Supabase Edge Functions
- **Email:** Resend API
- **PDF:** Server-side generation via edge function
- **Package manager:** Bun (preferred), npm as fallback
- **Path alias:** `@/` maps to `src/`

No global state library (Redux/Zustand) — React Query + Context is sufficient.
Do not introduce one without discussing it first.

---

## Project Structure

```
quotly-professional-quotes/
  src/
    pages/           — Route-level components (Dashboard, QuoteBuilder, Settings, etc.)
    components/      — Reusable UI (Navbar, QuoteCard, AIQuoteModal, LineItemEditor, etc.)
    components/ui/   — shadcn/ui primitives (do not edit manually)
    hooks/           — Custom hooks (useQuotes, useAuth, useCompany, useMaterials, etc.)
    integrations/    — Supabase client + auto-generated types
    lib/             — Utility functions
    data/            — Mock data, starter materials, constants
  supabase/
    functions/       — Edge functions (generate-quote, send-quote, generate-pdf, etc.)
    migrations/      — SQL migrations
```

---

## Conventions

### Naming
- Components and types: PascalCase (`LineItemEditor`, `QuoteStatus`)
- Functions, variables, hooks: camelCase (`useQuotes`, `updateItem`)
- Constants: UPPER_SNAKE_CASE (`DAILY_LIMIT`)
- Database tables and columns: snake_case (`quote_items`, `customer_email`)
- Foreign keys: `table_id` pattern (`quote_id`, `company_id`)
- Route params: kebab-case (`/quotes/:id`)
- i18n keys: dot notation (`navbar.dashboard`, `settings.field.companyName`)

### React Patterns
- Functional components only, never class components
- Custom hooks for reusable logic — one hook per domain (`useQuotes`, `useMaterials`)
- React Query for all server state — query keys scoped by company_id
- Local state with `useState` for UI concerns (modal open, form inputs, step progression)
- `sonner` for toast notifications — use `toast.success()` / `toast.error()`

### Component Guidelines
- One component per file
- Components in `components/ui/` are shadcn-generated — do not edit directly
- Icons from `lucide-react` only
- Fonts: Plus Jakarta Sans (headings), Inter (body)
- Mobile-first Tailwind — dark mode via class strategy

### Backend / Supabase
- Edge functions are Deno/TypeScript
- Auth uses Supabase Auth with localStorage persistence
- RLS is assumed on all tables — queries are scoped by company_id or user_id
- Soft deletes use `is_deleted` boolean, not row removal
- Quote numbers assigned server-side via `get_next_quote_number` RPC

---

## Key Domain Logic

### Quote Lifecycle
```
draft → sent → opened → accepted → completed
                     → declined
         → revised (when an accepted quote is edited)
         → expired (validity period passed)
```
- All status transitions create a `quote_events` entry (audit trail)
- Editing an accepted quote changes status to "revised", not back to draft
- Validity is calculated from `valid_until` date, not creation date

### Materials & Pricing
- Materials have `purchase_price` + `markup_percent`
- `unit_price` (retail) is calculated: `purchase_price * (1 + markup_percent / 100)`
- VAT is per line item, toggleable — not a global setting
- Units: st (pieces), m (meters), m2, kg, l, etc.
- Starter materials auto-sync per trade on first load (`useMaterials`)

### AI Quote Generation
- Input: free text OR image (base64) + trade selection
- Edge function `generate-quote` calls Claude Haiku
- 4-layer learning system:
  - Layer 1: User trade profile (material frequency, labor price range)
  - Layer 2: Job pattern recognition (keyword-based recurring job types)
  - Layer 4: Correction learning (materials user added to AI-generated quotes)
- Rate limit: 20 generations per user per day
- Learning recompute fires only on quote SEND (fire-and-forget, non-blocking)
- AI output maps to `location.state.aiData` in QuoteBuilder

### Delivery
- Email via Resend API with optional PDF attachment
- SMS via Twilio (currently commented out)
- Public customer view at `/q/:id` — no auth required, uses `maybeSingle()`

---

## Session Start

At the beginning of every session, read `session-state.md` in this directory
if it exists. Summarize the current project state before doing anything else.
If it does not exist, skip this step silently.

---

## Important Warnings

- Never hardcode Supabase keys or API secrets — always use environment variables
- Never edit files in `src/components/ui/` — these are shadcn-generated
- Never install packages globally — use the project's node_modules
- The `.env` file contains Supabase project ID and anon key — do not commit secrets beyond these
- Do not change the Supabase client config in `src/integrations/supabase/client.ts` without asking
- Database types in `src/integrations/supabase/types.ts` are auto-generated — do not edit manually
- When modifying edge functions, remember they run in Deno (not Node) — imports use URL syntax
