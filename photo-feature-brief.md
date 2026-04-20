# Photo-Driven Quote Feature — Council Briefing

This document is context for the LLM Council. It describes the feature being
designed, the existing architecture it plugs into, what's decided, what's open,
and the specific decision the council is being asked to pressure-test.

---

## Product context

**Quotly** is a quote management SaaS for Swedish tradespeople (bygg, el, vvs,
general). Users create quotes with labor + material line items, deliver via
email/PDF, and track status. It already has an AI quote generator that accepts
**text input** (customer request) or a **screenshot** of a customer's email/text.

Target users: small Swedish tradesperson firms (1–10 employees). Primary language
Swedish. Payment is subscription SaaS.

## The feature being added: site photos as a quote input

A new input mode alongside text and screenshot: **site photos**. The
tradesperson uploads 3–15 photos of the actual job site, provides a brief
text context (customer's message or their own notes) and any known dimensions,
picks their trade, and submits. The system produces a ready-to-send quote
draft.

### Goal stated by the founder

> "Produce quotes with consistently high hit rates using images and brief input."

**Hit rate** is defined operationally as: **the AI-generated draft needs <2
line-item edits before the tradesperson is willing to send it to the customer.**
Success is stable achievement of this across users and job types.

Why brief input matters: tradespeople are time-constrained. If the feature
requires 10 minutes of typing, it's dead on arrival. The value is *time
saved* vs. writing the quote manually or via text input.

---

## Existing architecture it plugs into

### Current AI quote generation pipeline (`generate-quote` edge function)

Runs in two stages on every quote request:

**Stage 1 — Keyword extraction** (Claude Haiku):
- Input: text OR image + trade
- Output: array of material/component noun keywords in Swedish

**Stage 2 — Quote generation** (Claude Sonnet 4.6):
- Input: customer request text/image + extracted keywords + trade context +
  Layer 1/2/4 learnings + merged materials catalog
- Output: structured JSON quote — customer details, line items
  (labor + materials with quantities and prices), VAT flags

### The 4-layer learning system (already live)

- **Layer 1 — User trade profile**: top 10 materials by frequency (>30%
  threshold), labor price min/max/percentiles per trade. Stored in
  `user_trade_profiles`.
- **Layer 2 — Job pattern matching**: past quotes clustered by shared
  keywords (minimum 2 occurrences to form a pattern). Injected when
  matching quote comes in. Thresholds: strong match = 3+ keyword overlap
  OR 2+ overlap with 4+ past occurrences; moderate = 2+ overlap with 2+
  occurrences.
- **Layer 4 — Correction learnings**: tracks materials the user
  added/removed after AI generation, per keyword. Thresholds:
  keyword-specific = 2+ occurrences at 40%+ ratio; trade-wide = 3+
  occurrences at 15%+ ratio. Capped at 5 per tier.

Learning recompute fires on quote **send** (fire-and-forget, non-blocking).

### Materials catalog

Two sources merged per user: per-company materials + global `trade_materials`
(user takes priority). Every line item in a generated quote references a
specific catalog entry with fixed name + unit + price. The AI can invent
materials outside the catalog but with "reasonable Swedish market prices" as
fallback — rarely desired.

### Other relevant constraints

- Rate limit: 20 AI generations per user per day.
- Swedish prompts throughout.
- Quote output is a draft — user reviews and edits in QuoteBuilder before
  sending.
- Users can correct materials (add/remove) and the correction data feeds
  Layer 4 on send.
- Stack: React + TS + Supabase (Postgres + edge functions). Anthropic API
  for AI. pdf-lib for PDF. Tradespeople use the app on mobile frequently
  while on-site.

---

## Decisions already made (closed)

- **Input type:** new "Site Photos" tab in `AIQuoteModal` alongside existing
  text + image modes. Multi-photo upload (3–15 photos). Keep existing modes
  untouched.
- **Dimensions:** user-provided, not AI-estimated. The UI asks for width,
  height, or area. A reference-object hint ("include a ruler or A4 for small
  items") is shown but optional.
- **Two Claude API calls per photo quote:**
  1. **Extraction call** with trade-specific vision prompt → structured JSON
     of observations (fixtures, surfaces, conditions, access constraints).
  2. **Quote generation call** — existing `generate-quote` pipeline, unchanged,
     fed by a natural-language summary derived from the extraction JSON plus
     photo-derived keywords plus any user-pasted customer text.
- **Trade-specific prompts:** four separate extraction prompts (bygg, el, vvs,
  general) used in the extraction call only. Quote generation prompt stays
  shared.
- **Learning integration:** photo-derived keywords get added to
  `quotes.keywords` alongside text-derived keywords. Same Layer 1/2/4
  pipeline. No new learning tables needed — existing system picks up the
  richer signal automatically.
- **Embeddings:** out of scope for v1. Can be added in v2 without schema
  migration if `material_fingerprint` column is reserved for it.
- **Vocabulary learning (keramik → porslin):** not a real problem — catalog
  owns material naming. Not a feature.

---

## The one open decision being counciled

**What should happen between the extraction call and the quote generation
call, given the goal of high hit rate with minimal user friction?**

Options being considered:

### Option A — Full review UX
After extraction, show the user a screen with all observed fields (room type,
dimensions, fixtures, conditions, access). User can edit anything before
clicking "Generate quote." Corrections are stored (format TBD) as potential
future training signal.

**Pros:** Catches extraction errors at the source. User sees what the AI
perceived (trust). Richer, more accurate input to quote generator.

**Cons:** Adds a step = friction. Might feel redundant when the AI is right.
Requires solid UX design to not become a form-filling slog. Risk of users
just clicking through without actually reviewing.

### Option B — No intermediate step
Extraction result goes straight to quote generation. User edits the final
quote directly in QuoteBuilder as today. Learning relies on quote-level
edits (existing Layer 4 mechanism).

**Pros:** Lowest friction. Matches existing flow shape. Ships fastest.

**Cons:** Extraction errors propagate into the quote. User corrects *symptoms*
(wrong line items) rather than *causes* (wrong observations). Learning signal
less clean.

### Option C — Conditional review
Show the review UX only when extraction confidence is below a threshold, or
when specific high-risk fields (dimensions, material type) are uncertain.
Otherwise skip straight to quote generation.

**Pros:** Friction only when needed. Respects experienced users who trust
the AI. In theory best of both worlds.

**Cons:** "Confidence" is hard to calibrate and calibration errors = silent
failures. More complex logic. User can't predict when the review will appear.

### Option D — Minimal review
Show a compact card with only the 3–4 highest-risk fields (dimensions, room
type, primary material) — not the full observation JSON. Quick scan, quick
confirm, generate.

**Pros:** Friction bounded. Catches the errors with biggest dollar impact.
Simpler than full review.

**Cons:** Misses conditions Claude hallucinated or missed. Might give false
sense of accuracy. Decides for the user what matters most.

---

## What the council is being asked

Which of these designs (or a variant they propose) maximizes hit rate
— "AI draft needs <2 line-item edits before sending" — given:

- Users are tradespeople on mobile, often on-site
- Inputs are deliberately brief (photos + few fields)
- The downstream learning system (Layer 1/2/4) already makes the *second
  call* smart if its inputs are clean
- New users have no learning history; hit rate at cold start matters too
- The feature competes with "just type the quote manually in 10 minutes"

Advisors should pressure-test this decision specifically. They are not
redesigning the whole feature. They are not redesigning the learning
system. They are not picking a trade to launch with. The question is the
review-UX design and its implications for hit rate.
