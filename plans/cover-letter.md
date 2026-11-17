# Plan: Cover letter

**Branch**: one per slice, `feat/cover-letter-<slice>`
**Status**: Active

## Goal

A cover letter per posting: AI-written, built from scoring's `whyFits` plus Profile facts, owner-editable, on its
own page. Spec: `docs/product/cover-letter.md`. Technical design: `docs/architecture/cover-letter.md`. Mockup
brief: `docs/mockups/cover-letter.md`.

## Acceptance Criteria

- [ ] Clicking "Write cover letter" on a posting with no letter yet generates one and lands on
      `/jobs/[id]/cover-letter` showing it, editable.
- [ ] Reopening that route later shows the same letter, served from storage, no regeneration.
- [ ] An AI failure, a number-check failure, or an empty `whyFits` all show the same "Couldn't write a letter for
      this posting" error, with no letter saved.
- [ ] Editing the text and clicking Save persists it; reloading the page shows the saved (possibly edited) text,
      not the original AI draft.
- [ ] Clicking Regenerate on a never-edited letter overwrites it with no confirmation. Clicking Regenerate on an
      edited one shows "This replaces your edited letter" first; confirming overwrites, cancelling leaves the
      edited text untouched.
- [ ] A failed Regenerate never discards the letter currently in the textarea; it stays, with a toast reporting
      the failure.

## Slices

### Slice 1: Generate and view a cover letter

**Value**: The owner clicks one button and gets a usable cover letter for a posting, without needing Slice 2's
editing to get value out of it.
**Path**: "Write cover letter" button (`posting-detail.tsx`, mirrors "Tailor my CV") → new route
`/jobs/[id]/cover-letter` (new page) → `POST /api/jobs/postings/[id]/cover-letter` (new) →
`writeCoverLetterForPosting` (new, `cover-letter.ts`) → `writeCoverLetter` (new, `packages/agents/src/jobs/
cover-letter.ts`) → `job_cover_letters` (new table, migration). `GET` on the same route serves the stored
content for the page's initial render.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `tdd`, `testing`.
**Acceptance criteria**: Clicking the button from a posting with no letter generates and shows one; an AI
failure or empty `whyFits` shows the error state, saves nothing; reopening the route later serves the stored
letter without a new AI call.
**RED**: `verify-jobs.ts` — `writeCoverLetterForPosting` saves `content`/`promptVersion`/`model` with
`generatedAt` and `updatedAt` equal; throws (nothing saved) when `whyFits` is empty, before ever calling
`generate`; throws (nothing saved) when the generated content contains a number not in
`knownNumbers(profile)` (`hasInventedNumber`, pure, tested directly with its own cases).
**GREEN**: Migration, `writeCoverLetter` (agents package), `hasInventedNumber`, `writeCoverLetterForPosting`, the
route's `POST`/`GET`, the new page (empty/generating/has-letter/error states only — D1, D2, D3 read-only, D7),
the title-row button (C1/C2).
**REFACTOR**: N/A.
**PRE-PR MUTATION**: Run once at PR readiness for this slice's scope.
**PR-ready when**: Criteria above met, `pnpm check`/`test`/`build` pass from `apps/web`.
**Slice complete when**: Its PR lands.

### Slice 2: Edit, save, and the regenerate-overwrite guard

**Value**: The owner can make the AI's draft their own without losing it the next time they click Regenerate for
a different reason (or by accident).
**Path**: `Textarea` + dirty-check "Save" button (new, the page from Slice 1) → `PUT /api/jobs/postings/[id]/
cover-letter` (new) → updates `content`/`updatedAt` only. Regenerate's existing `POST` call gains the
`force`/409 negotiation: checks `updatedAt > generatedAt` before regenerating, returns `409 { edited: true }`
instead when true and `force` isn't set; the page shows the confirm `AlertDialog` (same primitive
`use-apply-flow.tsx` already uses) and resubmits with `force: true` on "Yes, rewrite."
**Class**: Behavior change.
**Delivery**: Independent PR against trunk (depends on Slice 1's route/page existing, not on anything else).
**Required implementation skills**: `tdd`, `testing`.
**Testability note**: same reasoning as the Job Board plan's Apply-confirmation slice — the "should the dialog
show" decision is a plain function of `(generatedAt, updatedAt, force) => "regenerate" | "confirm"`, unit-tested
directly; the actual dialog/fetch wiring isn't the part carrying real logic.
**Acceptance criteria**: Editing then Save persists and reloads correctly; Regenerate on unedited content
overwrites with no dialog; Regenerate on edited content shows the dialog, Yes overwrites, Cancel leaves the
edit untouched; a failed Regenerate (either path) leaves the textarea's current content in place and shows a
toast, never the full-page error state.
**RED**: `verify-jobs.ts` — the PUT-equivalent store function updates `content`/`updatedAt` without touching
`generatedAt`; the pure "regenerate or confirm" decision function covers all three cases
(never-edited/edited-no-force/edited-with-force).
**GREEN**: The `PUT` route, the store function, the `POST` route's 409 branch, the dirty-check Save button, the
confirm dialog, the failed-regenerate toast path (D4-D6, the toast-not-D7 behavior).
**REFACTOR**: N/A.
**PRE-PR MUTATION**: Run once at PR readiness.
**PR-ready when**: Criteria met, full gate passes.
**Slice complete when**: Its PR lands.

## Pre-PR Quality Gate

Before each PR, from `apps/web`: `pnpm check`, `pnpm test`, `pnpm build`, plus `pnpm --filter @ken-os/web
test:db:jobs`. No mutation-testing harness is configured in this repo today — skip that step, rely on the
behavior tests named per slice above.

## Out of scope

PDF export, multi-letter history, tone presets — see `docs/product/cover-letter.md`'s own "What this is not
(yet)."

---

_Delete this file and remove `plans/` if it's left empty, once every slice's PR has landed._
