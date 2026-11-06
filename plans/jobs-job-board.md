# Plan: Job Board

**Branch**: one per slice, `feat/jobs-<slice>`
**Status**: Active

## Goal

Save becomes real (persisted, not a client-only toggle) and Applied gets built, both visible on a new Job Board
screen inside `/jobs`.

Spec: `docs/product/job-finder.md`, "Job Board". Technical design: `docs/architecture/job-board.md`,
`docs/architecture/decisions/ADR-003-job-board-status-separate-columns.md`.

## Acceptance Criteria

- [ ] Clicking Save on a card persists it; reloading the page still shows it saved; clicking again un-saves it.
- [ ] Clicking Apply, then returning to the tab (or closing the one it opened), shows a "Did you apply?" dialog;
      confirming marks the posting Applied and Viewed; declining changes nothing.
- [ ] A Saved or Applied posting shows that status as a badge, replacing New, both in the New list and on
      `/jobs/board`.
- [ ] `/jobs/board` lists every Saved or Applied posting, reusing the existing card; an empty state when neither
      exists yet.
- [ ] Un-saving or removing Applied from `/jobs/board` takes the posting off that screen immediately.

## Slices

### Slice 1: Save persists for real

**Value**: The owner clicks Save on a card; it survives a reload. Today's `SaveButton` is `useState` only and
forgets on every refresh — this replaces the fake toggle with the real thing.
**Path**: `SaveButton` (`new-list.tsx`) → `POST /api/jobs/postings/[id]/save` (new, mirrors the existing
`show-anyway` route) → `setSaved(userId, postingId, saved)` (new, `store.ts`) → `job_matches.saved_at` (new
column, migration). `PostingView`/`POSTING_COLUMNS` gain `savedAt`. The card's badge slot (today only
`isNew()`) extends to show "Saved" in place of New once `savedAt` is set.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `tdd`, `testing`.
**Acceptance criteria**: Clicking Save sets `saved_at`; reloading the page shows the button in its pressed
state and the card's badge reads "Saved"; clicking again clears `saved_at` and the badge reverts to New/nothing.
**RED**: `verify-jobs.ts` — `setSaved` sets `saved_at`, calling it again with `saved: false` clears it. `new-list.test.ts` — the badge-selection function returns `"Saved"` when `savedAt` is set, overriding New.
**GREEN**: Migration, `setSaved`, the route, `SaveButton` wired to call it (replacing its local `useState`), badge logic extended.
**REFACTOR**: N/A unless duplication surfaces between the badge logic for New/Saved/Applied.
**PRE-PR MUTATION**: Run once at PR readiness for this slice's scope.
**PR-ready when**: Criteria above met, `pnpm check`/`test`/`build` pass from `apps/web`.
**Slice complete when**: Its PR lands.

### Slice 2: Apply confirmation marks Applied

**Value**: The owner clicks Apply, comes back from the tab it opened, and is asked whether they applied —
confirming is the only way `applied_at` gets set, since clicking Apply itself proves nothing.
**Path**: `useApplyFlow({ postingId, link })` (new hook) used identically by `new-list.tsx`'s and
`posting-detail.tsx`'s Apply buttons → `window.open` (not a native anchor navigation) → tracks that one window's
`.closed` state and this window's `focus` event → `AlertDialog` ("Did you apply?", Yes/Not yet) → on Yes,
`POST /api/jobs/postings/[id]/apply` → `markApplied(userId, postingId)` sets `applied_at = now()` and
`viewed_at = coalesce(viewed_at, now())`.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `tdd`, `testing`.
**Testability note**: this repo's test runner has no DOM/browser harness, so the hook's "should the dialog show
right now" decision needs factoring into a plain function of `(windowClosed: boolean, justRegainedFocus: boolean, hasPendingWindow: boolean) => boolean`, unit-tested directly — the actual `window.open`/event wiring around it isn't unit-testable here and isn't the part carrying real logic.
**Acceptance criteria**: Clicking Apply opens the link in a new tab; returning to/closing that tab shows the
dialog; Yes sets `applied_at` and `viewed_at` (if unset) and the card's badge reads "Applied"; Not yet changes
nothing and asks again next time.
**RED**: `verify-jobs.ts` — `markApplied` sets `applied_at`, and `viewed_at` only if it was null (an
already-viewed posting's `viewed_at` doesn't move). Plus the pure decision-function test above.
**GREEN**: Migration (`applied_at`), `markApplied`, the route, the hook, both Apply buttons wired to it, the dialog.
**REFACTOR**: N/A.
**PRE-PR MUTATION**: Run once at PR readiness.
**PR-ready when**: Criteria met, full gate passes.
**Slice complete when**: Its PR lands.

### Slice 3: Job Board screen

**Value**: The owner can actually find everything they've saved or applied to, in one place.
**Path**: `/jobs/board/page.tsx` (new route, server component) → `listJobBoard(userId)` (new, `store.ts`:
`saved_at is not null or applied_at is not null`) → same card component the New list uses → a Job Board
sub-nav item under Jobs.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk (depends on Slices 1-2 for real data, but is itself a read-only
addition — safe to build once either status exists, doesn't need to wait for both).
**Required implementation skills**: `tdd`, `testing`.
**Acceptance criteria**: `/jobs/board` lists every Saved/Applied posting with its status badge; shows an empty
state ("Nothing saved or applied yet", one line, no action) when there are none.
**RED**: `verify-jobs.ts` — `listJobBoard` returns a posting with either flag set, excludes one with neither.
**GREEN**: The route, `listJobBoard`, the nav entry.
**REFACTOR**: N/A.
**PRE-PR MUTATION**: Run once at PR readiness.
**PR-ready when**: Criteria met, full gate passes.
**Slice complete when**: Its PR lands.

### Slice 4: Undo from Job Board

**Value**: The owner can remove something they saved or applied to by mistake, without leaving Job Board.
**Path**: Save's existing toggle (Slice 1) reused as-is on Job Board's cards. A new small "Remove" action,
shown only on Job Board (not the New list), clears `applied_at` via a new
`POST /api/jobs/postings/[id]/unapply`.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `tdd`, `testing`.
**Acceptance criteria**: Clicking Save again on a Job-Board card un-saves it; clicking Remove on an Applied
card clears `applied_at`; either removes the posting from `/jobs/board` immediately if it was its only status.
**RED**: `verify-jobs.ts` — an `unapply`-equivalent store function clears `applied_at` only, leaves `saved_at`
untouched if both were set.
**GREEN**: The route, the store function, the Remove action on Job Board's card variant.
**REFACTOR**: N/A.
**PRE-PR MUTATION**: Run once at PR readiness.
**PR-ready when**: Criteria met, full gate passes.
**Slice complete when**: Its PR lands.

## Pre-PR Quality Gate

Before each PR, from `apps/web`: `pnpm check`, `pnpm test`, `pnpm build`, plus the relevant
`pnpm --filter @ken-os/web test:db:jobs` DB check. No mutation-testing harness is configured in this repo today
— skip that step, rely on the behavior tests named per slice above.

---

_Delete this file and remove `plans/` if it's left empty, once every slice's PR has landed._
