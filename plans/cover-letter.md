# Plan: Cover letter

**Branch**: one per slice, `feat/cover-letter-<slice>`
**Status**: Active

## Goal

A cover letter per posting: AI-written, built from scoring's `whyFits` plus Profile facts, owner-editable, in a
third tab on the Job detail page. Spec: `docs/product/cover-letter.md`. Technical design:
`docs/architecture/cover-letter.md`. Mockup brief: `docs/mockups/cover-letter.md`, canvas:
`docs/mockups/cover-letter-canvas/`.

**Note (17 Nov 2026, after Slice 1 shipped):** the owner's mockup review moved the letter from the standalone
`/jobs/[id]/cover-letter` page Slice 1 built into a third Job detail tab instead — no separate route. Slice 1's
backend (table, AI module, store functions, routes) is unaffected; only its UI is superseded by Slice 2, which
now includes converting the page into the tab rather than building a throwaway intermediate state.

## Acceptance Criteria

- [ ] Clicking "Write cover letter" on a posting with no letter yet generates one and switches to the Cover letter tab showing it, editable.
- [ ] Job detail always opens on Description, even once a letter exists; "View cover letter" is how the owner reaches the tab.
- [ ] Reopening the tab later shows the same letter, served from storage, no regeneration.
- [ ] An AI failure, a number-check failure, or an empty `whyFits` all show the same "Couldn't write a letter for this posting" error, with no letter saved.
- [ ] Editing the text and clicking Save persists it; reloading the page shows the saved (possibly edited) text, not the original AI draft.
- [ ] Switching to Description and back to Cover letter keeps an unsaved edit in place.
- [ ] "Copy letter" copies the textarea's current content (edits included) and shows a "Letter copied" toast.
- [ ] Clicking Regenerate on a never-edited letter overwrites it with no confirmation. Clicking Regenerate on an edited one shows "Rewrite this letter?" first; confirming ("Rewrite letter") overwrites, cancelling leaves the edited text untouched.
- [ ] A failed Regenerate never discards the letter currently in the textarea; it stays, with a toast reporting the failure.
- [ ] At phone width, the title row's three buttons (CV, cover letter, Apply) wrap instead of overflowing.

## Slices

### Slice 1: Generate and view a cover letter

**Value**: The owner clicks one button and gets a usable cover letter for a posting, without needing Slice 2's
editing to get value out of it.

**Path**: "Write cover letter" button (`posting-detail.tsx`, mirrors "Tailor my CV") → new route
`/jobs/[id]/cover-letter` (new page) → `POST /api/jobs/postings/[id]/cover-letter` (new) →
`writeCoverLetterForPosting` (new, `cover-letter.ts`) → `writeCoverLetter` (new, `packages/agents/src/jobs/cover-letter.ts`) → `job_cover_letters` (new table, migration). `GET` on the same route serves the stored content for the page's initial render.

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

### Slice 2: Tab conversion, edit, save, and the regenerate-overwrite guard

**Value**: The owner reads the letter where the rest of the posting already lives, can make the AI's draft their own without losing it on the next Regenerate, and can copy it out whenever they want.

**Path**: Removes Slice 1's standalone `/jobs/[id]/cover-letter` page and route handler for the page; the letter moves into a third `Tabs` entry, Cover letter, on `posting-detail.tsx` beside Description and Company (default tab stays Description). The title-row button stops being a `Link` and becomes a tab-switcher (`onClick` sets the active tab), keeping its Write/View label logic from Slice 1. Inside the tab: `Textarea` + status line ("Written `<date>`" / "Edited") + dirty-check "Save" button → `PUT /api/jobs/postings/[id]/cover-letter` (new) → updates `content`/`updatedAt` only. A "Copy letter" button (`navigator.clipboard`, a "Letter copied" toast). Regenerate's existing `POST` call gains the `force`/409 negotiation: checks `updatedAt > generatedAt` before regenerating, returns `409 { edited: true }` instead when true and `force` isn't set; the tab shows the confirm `AlertDialog` ("Rewrite this letter?" / "Your edits are replaced by a new letter" / Cancel, Rewrite letter) and resubmits with `force: true`. Unsaved edits live in the tab's own client state for as long as the page is open, so switching to Description and back loses nothing. At phone width the title row's three buttons wrap (`flex-wrap`).

**Class**: Behavior change.

**Delivery**: Independent PR against trunk (depends on Slice 1's backend — table, routes, store functions — not on its now-superseded page UI).

**Required implementation skills**: `tdd`, `testing`.

**Testability note**: same reasoning as the Job Board plan's Apply-confirmation slice — the "should the dialog show" decision is a plain function of `(generatedAt, updatedAt, force) => "regenerate" | "confirm"`, unit-tested directly; the actual dialog/fetch/tab wiring isn't the part carrying real logic.

**Acceptance criteria**: Job detail opens on Description by default; clicking Write/View cover letter switches to the tab without navigating; editing then Save persists and reloads correctly; switching tabs and back keeps an unsaved edit; Copy letter copies the current textarea content and toasts; Regenerate on unedited content overwrites with no dialog; Regenerate on edited content shows the dialog, Rewrite letter overwrites, Cancel leaves the edit untouched; a failed Regenerate (either path) leaves the textarea's current content in place and shows a toast, never the full-page error state; the title row wraps at phone width.

**RED**: `verify-jobs.ts` — the PUT-equivalent store function updates `content`/`updatedAt` without touching `generatedAt`; the pure "regenerate or confirm" decision function covers all three cases (never-edited/edited-no-force/edited-with-force).

**GREEN**: Delete the Slice 1 page route (keep its API route file, just drop the page/view components it rendered), the `Tabs` addition to `posting-detail.tsx`, the `PUT` route, the store function, the `POST` route's 409 branch, the dirty-check Save button, Copy letter, the confirm dialog with corrected copy, the failed-regenerate toast path, the phone wrap on the title row (C1-C3, D1-D9 per `docs/mockups/cover-letter-canvas/`).

**REFACTOR**: N/A.

**PRE-PR MUTATION**: Run once at PR readiness.

**PR-ready when**: Criteria met, full gate passes.

**Slice complete when**: Its PR lands.

## Pre-PR Quality Gate

Before each PR, from `apps/web`: `pnpm check`, `pnpm test`, `pnpm build`, plus `pnpm --filter @ken-os/web test:db:jobs`. No mutation-testing harness is configured in this repo today — skip that step, rely on the
behavior tests named per slice above.

## Out of scope

PDF export, multi-letter history, tone presets — see `docs/product/cover-letter.md`'s own "What this is not
(yet)."

---

_Delete this file and remove `plans/` if it's left empty, once every slice's PR has landed._
