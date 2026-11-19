# Plan: Job listing card actions

**Branch**: one per slice, `feat/job-card-actions-<slice>`
**Status**: Active

## Goal

Restyled match score, a new ATS compatibility ring, and Tailor CV/Write cover letter quick actions on the Jobs
New-list card, each opening a modal that reuses the existing tailoring/cover-letter state. Spec:
`docs/product/job-finder.md`, "ATS compatibility". Technical design: `docs/architecture/job-card-actions.md`.
Mockup: `docs/mockups/job-card-actions.md`, canvas `docs/mockups/job-card-actions-canvas/`.

## Acceptance Criteria

- [ ] Every card shows a Match ring; an ATS ring beside it only when the posting has stated skills.
- [ ] Hovering either ring shows a tooltip naming what it counts.
- [ ] The footer reads, left to right: rings, Tailor CV, Write cover letter, pay, Apply (alone, right-aligned).
- [ ] At phone width, the footer wraps to two rows (rings + Apply, then the two AI actions); pay stays on its own
      line above the separator.
- [ ] Clicking Tailor CV/Write cover letter on a card with nothing generated shows a pending spinner on that
      card's own button; the modal only opens on a later click, once something exists.
- [ ] Clicking a ready Tailor CV/Write cover letter button opens a modal with the same content/behavior as the
      detail page's own tailored-CV view and Cover letter tab, including Regenerate (and, for Cover letter,
      editing, Save, Copy letter, and the edited-overwrite confirm dialog).
- [ ] Clicking elsewhere on the card (not Save/Tailor/Cover letter/Apply) still opens the detail page.

## Slices

### Slice 1: Score and ATS rings

**Value**: The owner can judge posting fit and keyword coverage at a glance, without opening every card.

**Path**: `atsScore(skillMatches)` (new, `skills-match.ts`) → `ScoreRing` (new component, `score-ring.tsx`) →
`PostingCard` (`new-list.tsx`): header loses the old score badge, footer gains the two rings at its far left.

**Class**: Behavior change (visual).

**Delivery**: Independent PR against trunk.

**Required implementation skills**: `tdd`, `testing`.

**Acceptance criteria**: A posting with skills shows both rings with the right values and tooltips; a posting
with no stated skills shows only the Match ring, in the same position (nothing shifts).

**RED**: a unit test for `atsScore` (empty skills → null; all "have" → 100; a mix → the right rounded percentage).

**GREEN**: `atsScore`, `ScoreRing`, wiring both into `PostingCard`'s header/footer per the technical design's
layout section.

**REFACTOR**: N/A.

**PRE-PR MUTATION**: Run once at PR readiness for this slice's scope.

**PR-ready when**: Criteria above met, `pnpm check`/`test`/`build` pass from `apps/web`.

**Slice complete when**: Its PR lands.

### Slice 2: Tailor CV and Write cover letter on the card, with their modals

**Value**: The owner can tailor a CV or write a cover letter straight from the list, without opening the posting.

**Path**: `PostingCard` instantiates its own `useTailorFlow`/`useCoverLetterFlow` (one per card, same pattern as
its existing `useApplyFlow`). Idle/pending render inline on the card's own button. Ready opens a `Dialog`:
`TailoredCvActions` (new, extracted from `posting-detail.tsx`'s existing `ButtonGroup` so the detail page and
this modal share one implementation) for Tailor CV; the existing `CoverLetterTab` component, unmodified, for
Write cover letter. Footer reorganized per the technical design (AI actions left, pay beside Apply, Apply alone
right); phone wrap.

**Class**: Behavior change.

**Delivery**: Independent PR against trunk (depends on Slice 1 for the footer's final layout, not on anything
else — could land first if the rings aren't ready, just with a less complete footer in between).

**Required implementation skills**: `tdd`, `testing`.

**Testability note**: `atsScore`/ring rendering aside, this slice is almost entirely wiring already-tested hooks
(`use-tailor-flow.tsx`, `use-cover-letter-flow.tsx`) and an already-tested component (`CoverLetterTab`) into a new
location — the new test surface is small: `TailoredCvActions`'s extraction shouldn't change its own behavior
(same props in, same markup out), and the card's click-elsewhere-still-opens-detail-page guard.

**Acceptance criteria**: Both buttons work from the card exactly as they do from the detail page (same
idle/pending/ready/error behavior, same Regenerate/Save/Copy/edited-confirm paths for Cover letter); clicking the
card body elsewhere still navigates to the detail page; clicking Save, Tailor CV, Write cover letter or Apply
does not.

**RED**: a test confirming `TailoredCvActions` renders identically to the markup it replaced (same props,
same output) — a refactor-safety net, not new behavior. A test for the click-elsewhere-navigates guard if this
repo's front-end testing setup can exercise it; otherwise confirm manually and note it as a gap in the PR.

**GREEN**: `TailoredCvActions` extraction (used by both `posting-detail.tsx` and the new card modal), the two
new `Dialog`s on `PostingCard`, the hook instantiation, the footer reorganization and phone wrap from the
technical design.

**REFACTOR**: N/A.

**PRE-PR MUTATION**: Run once at PR readiness.

**PR-ready when**: Criteria met, full gate passes.

**Slice complete when**: Its PR lands.

## Pre-PR Quality Gate

Before each PR, from `apps/web`: `pnpm check`, `pnpm test`, `pnpm build`, plus `pnpm --filter @ken-os/web
test:db:jobs` (Slice 2 touches no DB code, but run it anyway since it's cheap and the gate is per-PR, not
per-change). No mutation-testing harness is configured in this repo today — skip that step, rely on the
behavior tests named per slice above.

## Out of scope

Company Match Score (product spec: dropped). Any change to the detail page's own title row buttons or Cover
letter tab beyond the `TailoredCvActions` extraction.

---

_Delete this file and remove `plans/` if it's left empty, once every slice's PR has landed._
