# Job listing card actions — technical design

Product spec: `docs/product/job-finder.md`, "ATS compatibility". Mockup brief: `docs/mockups/job-card-actions.md`.
Canvas (frames E1-E11, the ring redesign and all four open questions resolved 19 Nov 2026):
`docs/mockups/job-card-actions-canvas/`. No backend changes beyond the ATS formula — Tailor and Cover letter
reuse their existing hooks, routes and store functions (`docs/architecture/cv-tailoring.md`,
`docs/architecture/cover-letter.md`) unchanged; this is a UI-layer addition.

## ATS compatibility: the formula

New pure function, `apps/web/src/features/jobs/skills-match.ts` (alongside the existing `matchSkills` it reuses):

```ts
export function atsScore(skillMatches: SkillMatch[]): number | null {
  if (skillMatches.length === 0) return null;
  const have = skillMatches.filter((m) => m.status === "have").length;
  return Math.round((have / skillMatches.length) * 100);
}
```

`null` means "no posting skills to score" — the card hides the ring entirely (resolved open question: Match ring
still shows alone, ATS just isn't rendered, so nothing shifts position). No new AI call, no new storage — computed
from the same `matchSkills(posting.skills, profileSkills)` the card already calls for its skill badges.

## New component: `ScoreRing`

`apps/web/src/features/jobs/score-ring.tsx`. A 40px circle: a muted track, a progress arc whose length is the
value (0-100), the figure centered in Geist Mono 12px, with a small label ("Match"/"ATS") beside it (owner's 19
Nov decision — replaces the originally-briefed header badges entirely).

```tsx
export function ScoreRing({ value, label, tooltip }: { value: number; label: string; tooltip: string }) {
  // ...
}
```

Same two-layer technique as `.rainbow-ring` extended to a circle: a `conic-gradient` built from
`--rainbow-gradient`'s five hues, scaled so the full rainbow always spans the arc regardless of `value`, with a
radial mask (`mask: radial-gradient(...)`) cutting it to a 4px stroke — no SVG, no `<canvas>`, same CSS-only
approach the existing ring treatment already uses. Resolved: keep the rainbow (not a neutral arc) — both rings
and the AI-action buttons come from the same matching work, one visual language. Wrapped in a shadcn `Tooltip`
("6 of 7 posting skills in your Profile" for ATS, an equivalent sentence for Match) per the resolved "explain the
rings" decision — `TooltipTrigger` wraps the ring, no layout change needed since `Tooltip` doesn't add a wrapper
box.

## Card layout (E9's resolved reorganization)

`apps/web/src/features/jobs/new-list.tsx`'s `PostingCard`:

- Header keeps only the title and Save — the score/ATS rings move out, so the title gets its full width back.
- Footer, left to right: the two `ScoreRing`s (Match always, ATS when `atsScore` isn't null) → Tailor CV → Write
  cover letter → pay (moved here from its own right-aligned line above the separator, per E9) → Apply, alone and
  right-aligned as the one primary action. Splitting by role (AI actions left, Apply right) avoids three
  near-equal-weight right-aligned buttons competing with Apply, which is what E1's drawn-with-real-content frame
  showed as crowded.
- Phone (E10): footer wraps to two rows — rings + Apply on the first row, the two AI actions on the second. Pay
  stays on its own line above the separator at this width (no room in either footer row).

## New footer buttons: Tailor CV / Write cover letter

Each `PostingCard` instantiates its own `useTailorFlow`/`useCoverLetterFlow` (same pattern the card already uses
for `useApplyFlow` — one hook instance per posting, not shared across the list). Button copy per the mockup's
"changes from this brief": **"Tailor CV"** (not "Tailor" — app language wants a verb + object), ready label
**"View CV"** (not "View tailored CV" — shorter, and no arrow icon since clicking opens a modal, not a new tab,
so the up-right-arrow affordance would promise the wrong thing). Icons: `FileText`/`Mail`, rainbow-stroked,
resolved to keep (ties the card action to its detail-page counterpart, ~22px fits the card fine). Idle/pending
states render inline on the card's own button (spinner replacing the icon while pending, same as the detail
page); the modal only opens on click once something exists to show.

## Two new modals

Both are shadcn `Dialog`, opened by the ready-state button's `onClick` (not a `Link`, not a route change).

**Tailored CV modal** (new markup — `tailorStatus`'s ready state has never had a dialog form before, only the
detail page's inline split button): title "Tailored CV", subtitle `"<posting title> at <company>"`, a file-info
row (icon, "Tailored CV, PDF", "Made `<date>`"), then the same `ButtonGroup` already on the detail page ("View
tailored CV" → opens the PDF route in a new tab, Regenerate icon button) — extract that `ButtonGroup` out of
`posting-detail.tsx` into a small shared component (e.g. `TailoredCvActions`) so the detail page's title row and
this modal both render it instead of duplicating the markup.

**Cover letter modal**: renders the existing `CoverLetterTab` component directly — it's already purely
presentational, driven entirely by props from `useCoverLetterFlow` (verified: no state of its own, same reason
it survives the detail page's tab unmounting). No new component needed here, just a `Dialog` wrapper with a
title/subtitle header matching the Tailored CV modal's shape, and the same component inside.

## Explicitly out of scope here

Company Match Score (product spec: dropped). Any change to the detail page's own title row buttons or Cover
letter tab beyond extracting `TailoredCvActions` for reuse — both keep their current behavior exactly.
