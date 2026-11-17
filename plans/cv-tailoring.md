# Plan: CV tailoring

**Branch**: jkenger/cv-tailoring
**Status**: Active

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

- [ ] Clicking "Tailor my CV" produces a resume that reorders and filters which Experience, Skills and Projects
      entries show, through the owner's existing default template; every bullet reads exactly as it does in the
      Profile (never rewritten or invented).
- [ ] Education and the Summary are never touched by tailoring.
- [ ] A posting with nothing relevant in the Profile still produces the full resume, unfiltered, in its original
      order — never a thin or near-empty result.
- [ ] Reopening a posting with an existing tailored resume serves the stored PDF instantly; nothing re-renders on
      view.
- [ ] Clicking Tailor/Regenerate again overwrites the existing tailored resume; there is no version history.
- [ ] A tailored resume is a frozen snapshot: a later Profile edit alone never changes it; only clicking
      Tailor/Regenerate does.
- [ ] If generation fails (AI error, timeout, bad output), the owner sees a clear error and can retry
      immediately; a failed regenerate leaves the previously tailored resume exactly as it was.
- [ ] Apply stays enabled and clickable regardless of the CV button's state.

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
**Delivery**: Independent PR against trunk.
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
A1 (idle, gradient border at 45%)/A2 (pending, rotating gradient + spinner)/A3 (ready, "View tailored CV" with
`ArrowUpRight`) states in `posting-detail.tsx`, using the new `--cv-tailor-gradient` token
(`apps/web/DESIGN.md`). Regenerate and the split-button seam are Slice 2 — Slice 1 ships a single "View tailored
CV" button once ready.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on `selectTailoredEntries`'s index-bounds check and
the empty-selection fallback, and on the profile-slicing/reordering function — a silently-wrong bounds check lets
an invented entry through or crashes on a borderline posting, and a silently-wrong fallback check either never
shows the full resume when nothing matched or always does, which would quietly defeat the entire feature.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended with this slice's scenarios and passing; dev-server check
of A1/A2/A3 in light and dark.

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
**Delivery**: Independent PR against trunk, after Slice 1 merges.
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
**GREEN or preservation change**: the split-button UI (seam, icon-only Regenerate, tooltip) replacing Slice 1's
plain button; the client-side error-toast wiring on the `POST` call. No change expected to `tailorResume`'s
write ordering — it's already correct from Slice 1; this slice adds the tests that pin it down.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the build-before-write ordering in `tailorResume`
— a flipped order would silently destroy the existing tailored resume the moment a regenerate fails, which is
exactly the regression this slice exists to prevent.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended; dev-server check of A4/A5/A6/A7 (regenerating, error,
dark, phone) against a real posting.

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
