# Plan: CV tailoring

**Branch**: jkenger/cv-tailoring
**Status**: Both slices implemented and delivered together in one PR (see "Delivery note" below), ready for
review.

## Delivery note

Slice 2's split button (View tailored CV + Regenerate) shipped alongside Slice 1 rather than after it: the
approved mockup (`docs/mockups/cv-tailoring-canvas/`) never actually draws a "ready, no regenerate" state — every
"ready" frame is already the split button. Shipping Slice 1's planned plain button would have meant building a UI
state nobody approved, so the split button, the icon-only Regenerate control, and the status-restore-on-failure
fix were all built in the same pass. Both slices' acceptance criteria and mutation evidence are satisfied by one
combined PR against trunk, not two independent ones.

## Goal

From a posting's detail page, the owner generates a resume tailored to that posting — the same Profile facts,
reordered and filtered to lead with what's relevant, through their existing template — views it, regenerates it,
and gets a clear retry path if generation fails.

Spec: `docs/product/cv-tailoring.md`. Technical design and UI states: `docs/architecture/cv-tailoring.md`,
`docs/mockups/cv-tailoring.md` (brief) and `docs/mockups/cv-tailoring-canvas/` (drawn frames A1-A7, owner-approved
17 Nov 2026). No unresolved product or design decisions remain — the mockup session and this plan's prep already
settled failure handling, the split-button shape, the shared pending state and the gradient-border exception
(`apps/web/DESIGN.md`).

## Acceptance Criteria

- [x] Clicking "Tailor my CV" produces a resume that reorders and filters which Experience, Skills and Projects
      entries show, through the owner's existing default template; every bullet reads exactly as it does in the
      Profile (never rewritten or invented).
- [x] Education and the Summary are never touched by tailoring.
- [x] A posting with nothing relevant in the Profile still produces the full resume, unfiltered, in its original
      order — never a thin or near-empty result.
- [x] Reopening a posting with an existing tailored resume serves the stored PDF instantly; nothing re-renders on
      view (`hasTailoredResume` threads the initial status through `posting-detail.tsx`).
- [x] Clicking Tailor/Regenerate again overwrites the existing tailored resume; there is no version history.
- [x] A tailored resume is a frozen snapshot: a later Profile edit alone never changes it; only clicking
      Tailor/Regenerate does.
- [x] If generation fails (AI error, timeout, bad output), the owner sees a clear error and can retry
      immediately; a failed regenerate leaves the previously tailored resume exactly as it was
      (`use-tailor-flow.tsx` restores whichever status preceded the click, not always idle).
- [x] Apply stays enabled and clickable regardless of the CV button's state.

## Slices

### Slice 1: Generate and view a tailored resume

**Value**: Behavior change — the owner viewing a posting's detail page clicks "Tailor my CV" and gets back a
resume PDF reordered/filtered to that posting, through their existing template, viewable in a new tab; a posting
with nothing relevant still gets the full resume rather than a thin one.
**Path**: `posting-detail.tsx`'s "Tailor my CV" button (today `disabled`, `posting-detail.tsx:203`) → enabled,
click → `POST /api/jobs/postings/[id]/tailor` → `tailorResume` (`features/jobs/tailor.ts`) loads the Profile and
the posting's text, calls `selectTailoredEntries` (`packages/agents/src/jobs/tailor.ts`, same `Agent`/zod pattern
as `score.ts`), builds a filtered `ProfileDetails` (or falls back to the full one, unfiltered, when the selection
is empty on all three arrays), renders it with the existing `renderResumePdf`, and upserts `job_tailored_resumes`
→ the button becomes "View tailored CV", opening `GET /api/jobs/postings/[id]/tailor` (stored bytes) in a new
tab.
**Class**: Behavior change.
**Delivery**: Shipped in the combined PR with Slice 2 (see "Delivery note" above), not as its own independent PR.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `typescript-strict` (new table and
selection types), `functional` (the profile-slicing/reordering logic), `api-design` (the two new routes),
`front-end-testing`/`react-testing` (the button's idle/pending/success states).
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the first four unchecked boxes above (reorder/filter, Education/Summary untouched,
no-relevant-content fallback, instant reopen).
**RED or preservation baseline**: Failing tests, in order: (1) `selectTailoredEntries` given a profile and
posting text returns an ordered list of indices into each of `experience`/`skills`/`projects`, via an injected AI
call (same dependency-injection shape `scorePostings` already uses in `process.test.ts`, not a module mock); (2)
an index the model returns that's out of bounds for its array is dropped, never crashes or invents an entry; (3)
`tailorResume` with a non-empty selection builds a filtered `ProfileDetails` whose `experience`/`skills`/
`projects` are sliced and reordered per the selection, with `contact`, `summary`, `education`, `certifications`,
`languages` and `local` byte-for-byte unchanged from the source Profile; (4) `tailorResume` with an empty
selection on all three arrays uses the full Profile, unfiltered, in its original order; (5) `tailorResume` renders
through `renderResumePdf` using the owner's saved `resume.template`/`resume.paper` and upserts
`job_tailored_resumes` (bytes, size, selection, prompt version, model, `generatedAt`); (6) `POST .../tailor`
without a session returns 401 and writes nothing; (7) `GET .../tailor` serves the stored PDF with the right
content type when a row exists, 404 when it doesn't; (8) in `posting-detail.tsx`, a posting with no tailored
resume shows "Tailor my CV" enabled; clicking it shows a pending spinner in place of the icon; on success the
button becomes "View tailored CV" opening the `GET` route in a new tab.
**GREEN or preservation change**: drizzle migration adding `job_tailored_resumes` (`postingId` PK references
`job_postings`, `userId`, `data` bytea, `size`, `selection` jsonb, `promptVersion`, `model`, `generatedAt`);
`packages/agents/src/jobs/tailor.ts` (`selectTailoredEntries`); `apps/web/src/features/jobs/tailor.ts`
(`tailorResume`, injected profile/posting loaders and the AI call for testability, mirroring `scorePostings`'s
shape in `process.ts`); `apps/web/src/app/api/jobs/postings/[id]/tailor/route.ts` (`POST`, `GET`); the button's
A1 (idle)/A2 (pending)/A3 (ready) states in `posting-detail.tsx`, built as the real split button from the start
(see "Delivery note") using shadcn's actual `ButtonGroup`/`ButtonGroupSeparator` (ported into
`components/ui/button-group.tsx`, not previously in this repo) rather than hand-rolled CSS, so each segment keeps
Button's own focus ring. The gradient ring went through several real-render iterations: a `conic-gradient`
distorts unevenly on a wide pill (angular slices near the tips cover far more pixels than near the top/bottom
edges), so it's a looping `linear-gradient` sweep instead, applied via the standard two-layer
`background-clip: padding-box, border-box` technique on the ring's own `border` (not a `::before` pseudo-element
— avoids z-index/stacking-context issues entirely). Layout, border and the two segments' corner-merging are
Tailwind utilities directly in the JSX (`cn` here is tailwind-merge-based, so same-element utility conflicts
resolve deterministically); only the gradient value, the `background-clip` mechanic and the `@keyframes` stay in
`globals.css` since Tailwind has no utility for a multi-layer clip/size/position value.
**REFACTOR**: Assessed — dropped an earlier attempt at a pseudo-element-based ring (stacking-context bugs) and a
raw hand-rolled CSS button (fought `Button`'s own styling) in favor of the `ButtonGroup` port above.
**PRE-PR MUTATION or alternate evidence**: Stryker (first mutation-testing setup in this repo; `inPlace: true` to
work around `typescript@7`'s removal of an API Stryker core's tsconfig preprocessor still calls) against
`features/jobs/tailor.ts`. Baseline found 7 real survivors: an off-by-one at the array-length boundary, two
selections wrongly treated as "fully empty" when only one of the three sections had anything, the posting text
preferring the wrong field when both full description and summary are present, and `selectEntries`'s actual
input shape going unchecked. Added targeted tests for each; **final score 100% (40/40 killed)**.
**Done when**: Mutation run complete at 100%, no outstanding survivors; `pnpm check` and `pnpm test` pass (669
tests); `pnpm --filter @ken-os/web test:db:jobs` extended with `hasTailoredResume`/save-get-round-trip/
regenerate-overwrites-in-place scenarios, passing; dev-server check of A1 (idle) and A3 (ready, light and dark)
confirmed by the owner 17 Nov 2026.

### Slice 2: Regenerate, and recovering from a failed generation

**Value**: Behavior change — the owner with an existing tailored resume can regenerate it at any time (no confirm,
no version history), and if either the first attempt or a regenerate fails, sees a clear error and can retry
immediately without losing whatever was already there.
**Path**: Slice 1's single "View tailored CV" button becomes the split button from the mockup (A3/A6): "View
tailored CV" plus, past a 1px seam, an icon-only "Regenerate" control (`aria-label="Regenerate tailored CV"`,
tooltip) that re-runs `POST .../tailor` — shown only once a tailored resume exists. Regenerating shows the exact
same pending look as Slice 1's first run (A4 reuses A2 — one pending state, not two). A thrown error from either
the first attempt or a regenerate surfaces as `toast({ tone: "error", title: "Couldn't generate. Try again" })`
(A5) and the button returns to its state before the click — A1 for a first attempt, A3 with the earlier resume
still intact for a failed regenerate, since `tailorResume` already builds the new PDF before writing it (Slice
1's step order), so a throw during generation never touches the existing row. This slice's tests are what prove
that ordering actually holds and that the Apply button is never affected by any of it.
**Class**: Behavior change.
**Delivery**: Shipped in the same combined PR as Slice 1 (see "Delivery note" above) — the split button was built
once, not added to a plain button after the fact.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `front-end-testing`/`react-testing`.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the remaining four unchecked boxes above (overwrite/no version history, frozen snapshot
against Profile edits, failed-generation error/retry/preservation, Apply stays enabled).
**RED or preservation baseline**: Failing tests: (1) clicking Regenerate on a posting with an existing tailored
resume overwrites it in place — new bytes, new `selection`, new `generatedAt`, exactly one row for that posting
and owner, no history kept; (2) when `selectTailoredEntries` or the render step throws during a regenerate, the
existing `job_tailored_resumes` row is byte-for-byte unchanged afterward and the route responds with an error,
not a partial write; (3) saving the Profile with no click on the CV button leaves an existing `job_tailored_
resumes` row untouched (frozen snapshot, same precedent as `profileVersionScored`); (4) in `posting-detail.tsx`,
a first-attempt failure returns the button to "Tailor my CV" (A1) with the error toast shown; a regenerate
failure returns it to the split button showing the prior resume (A3) with the same toast; (5) the Apply button
remains enabled and clickable while the CV button is in every state — idle, pending, ready, or showing the error
toast.
**GREEN or preservation change**: the split-button UI (`ButtonGroup`/`ButtonGroupSeparator`, icon-only
Regenerate with tooltip) built directly, not added after a plain button; the client-side error-toast wiring on
the `POST` call; `use-tailor-flow.tsx` restores whichever status preceded the failed click (`idle` or `ready`)
instead of always resetting to `idle` — the gap this slice exists to close, found while implementing rather than
after.
**REFACTOR**: Assessed as part of Slice 1's refactor pass above.
**PRE-PR MUTATION or alternate evidence**: Covered by Slice 1's Stryker run against `tailorResume` (same file,
same gate) — the build-before-write ordering is exercised directly by `tailor.test.ts`'s "a thrown error from
selectEntries/render propagates and save is never called" tests, both of which are mutation-covered at 100%.
**Done when**: Mutation run complete at 100% (shared with Slice 1); `pnpm check` and `pnpm test` pass;
`pnpm --filter @ken-os/web test:db:jobs` extended with the regenerate-overwrites-in-place scenario; dev-server
check of A1 (idle) and A3 (ready) confirmed by the owner 17 Nov 2026 — A4/A5 (regenerating/error) and the A7
phone frame were not separately screenshotted, but their logic is covered by `use-tailor-flow.tsx`'s own
status-restore behavior and the existing toast pattern already used elsewhere in this file.

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
