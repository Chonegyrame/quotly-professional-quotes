# Session State

Last updated: 2026-04-25
Branch: main — clean after this session's commits land

**⚡ NEXT ACTION when opening a fresh session:** "How it works" section is fully rebuilt and committed. Tunables for the scroll animation (FREEZE_PX, ENTER_PX, FREEZE3_PX, FREEZE_Y_FRAC, ENTER_START_FRAC, BOX1_EARLY_PX, box2 reveal window) live at the top of the `useLayoutEffect` in `LandingPage.tsx` if pacing needs further dialing.

## What was done this session

- **Replaced "How it works" scroll architecture entirely.** The previous per-row sticky + getBoundingClientRect-on-every-scroll approach had unfixable sub-pixel wobble during sticky phases (path coords drifted vs. SVG render position). Rewrote using a **single sticky pin + JS-translated stack**: one `position: sticky` container holds the stage in the viewport, and the inner stack of 3 boxes + 2 SVG bars is moved via `transform: translate3d(0, Y, 0)` driven by scroll progress. SVG paths are computed ONCE at layout (via `offsetParent` walk in stack-local coords) and never per-scroll, so no wobble.
- **Phase-based scroll model:** ENTER → FREEZE 1 (bar 1 fills) → BETWEEN → FREEZE 2 (bar 2 fills) → APPROACH 3 → FREEZE 3 (box 3 reveals) → LEAVE. Each phase has its own scroll-px budget; transit phases (BETWEEN/APPROACH/LEAVE) use `TRANSIT_RATE = 1` (1px stack-rise per 1px scroll) so they don't get distorted when ENTER or FREEZE durations are tuned.
- **Box content reveal windows tuned to user feedback:**
  - Box 1: starts revealing 400px BEFORE the pin engages (`BOX1_EARLY_PX = 400`) so rows fill in as the box rises into view, not after it lands.
  - Box 2: starts revealing AFTER the "Generera offert" button press completes (`box2Start = T3 + freeze2Px * 0.1`), so the press visually triggers the typing.
  - Box 3: extended `FREEZE3_PX = 1400` so all 4 material rows + the prompt fully reveal before box 3 starts leaving.
- **Trimmed dead scroll** above and below the section: heading section uses tight `pt-4 sm:pt-6`, driver height = T7 (no trailing `+ vh`), and `offExitEnd = offBox3 - vh*0.3` ends the LEAVE phase as soon as box 3 clears the freeze line.
- **Source of architecture:** `scroll-line-demo-fixed.html` at the project root (NOT committed — working file). User built it externally to validate the approach; current `LandingPage.tsx` implementation is a faithful React port of that demo's logic with the existing `LeadBox` / `QuoteSlot` / `LearningSlot` components slotted in.
- **Committed two missing files** that previous sessions had built but never tracked: `src/components/LeadBox.tsx` + `LeadBox.css` (imported by LandingPage all along) and `public/zaptec.jpg` (referenced as `url(/zaptec.jpg)` in the hero).

## Current state

- All lead-filter phases (0–5) committed and pushed.
- "How it works" section uses the new sticky-pin / translated-stack architecture — wobble-free, content reveals tuned, dead scroll trimmed.
- Hero slide auto-rotation (4.5s, 3 slides: Elektriker / VVS-tekniker / Byggare) live, now with a real photo for slide 0 (`zaptec.jpg`).
- Trade routes (`/bygg` etc.) live but still using placeholder content.

## What comes next

1. **Post-MVP: Template editor UI in Settings** — most wanted V2 feature. `company_form_templates` table + RLS already exists. New Settings section "Formulär" with enable/disable toggle and preview.
2. **Trade landing pages — real copy and images** — `/bygg`, `/vvs`, `/el`, `/ovrigt` currently use placeholder content. Needs copy direction discussion before building.
3. **Optional follow-up on "How it works" pacing**: if any phase still feels too fast or too slow on a different viewport size, tunables are at the top of the `useLayoutEffect` block.

## Open questions

- **Post-MVP priority** — template editor vs. trade pages vs. learning system rewrite. Not decided.
- **Resend sandbox constraint** — `onboarding@resend.dev` only delivers to Resend account owner. Blocks email notifications on new leads until domain verified.

## Context that is easy to forget

- "How it works" architecture: single sticky pin (`position: sticky; top: 0; height: 100vh; overflow: hidden`) wraps a stack of 3 boxes + 2 SVG bars. Stack moves via `translate3d`. Path coordinates use `offsetParent` walk (independent of scroll), so they're computed once at layout — NEVER recompute paths per scroll, that brings the wobble back.
- TRANSIT_RATE controls how fast box-to-box transitions feel; ENTER_PX / FREEZE_PX are independent and can be tuned without affecting transit pacing.
- `_design_handoff/`, `landing page quotly.zip`, `scroll-line-demo-fixed.html`, `Lead Cards Scroll Animation.html`, `quotly-tokens.css`, and `zaptec-UHNdOFqNhNQ-unsplash.jpg` are working files in the project root that should not be committed.
- Dev server runs on port 8081 via `.claude/launch.json`.
- Scoring uses Claude Sonnet 4.6; classification Haiku 4.5; quote generation Haiku via `generate-quote`.
- `generate-quote` is rate-limited to 20/day per user — applies when triggered from inbox too.
