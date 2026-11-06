# Job Board — technical design

Product spec: `docs/product/job-finder.md`, "Job Board". Data-model decision: `docs/architecture/decisions/ADR-003-job-board-status-separate-columns.md`.

## Data model

`job_matches` gains two nullable timestamp columns, alongside the existing
`viewed_at`:

- `saved_at: timestamp | null`
- `applied_at: timestamp | null`

Neither is touched by `filterReason()`/`refilterExisting()` — see ADR-003 for
why. `PostingView`/`POSTING_COLUMNS` in `store.ts` gain both fields, same
pattern as `viewedAt`.

## Store functions

- `setSaved(userId, postingId, saved: boolean)`: sets `saved_at` to `now()`
  or `null`. Direct toggle, no confirmation — mirrors today's fake
  `SaveButton` behavior, just persisted.
- `markApplied(userId, postingId)`: sets `applied_at = now()` and
  `viewed_at = coalesce(viewed_at, now())` in one update (spec: "Applied
  implies Viewed"). No un-apply function needed at the store layer — see
  Job Board screen, below, for how reversal works.
- `listJobBoard(userId)`: postings where `saved_at is not null or applied_at is not null`, same `POSTING_COLUMNS` shape the New list already uses, so the
  existing card component needs no new props to render them.

## API routes

Follows the existing `/api/jobs/postings/[id]/show-anyway` pattern (one
route per action, POST, session-scoped):

- `POST /api/jobs/postings/[id]/save` — body `{ saved: boolean }`, calls
  `setSaved`.
- `POST /api/jobs/postings/[id]/apply` — calls `markApplied`. Only ever sets;
  reversal happens through `save` with `saved: false` equivalent, i.e. the
  Job Board screen's own undo control calls a corresponding unset — exact
  route to be named when that screen is built, not decided here.

## Apply flow: `useApplyFlow` hook

Both Apply buttons (`new-list.tsx`'s card, `posting-detail.tsx`'s detail
page) need identical behavior: open the link, notice when the owner comes
back from _that specific_ tab, ask if they applied. That's one piece of
behavior with two call sites, not two different things — a shared hook, not
a shared component, since the two buttons' own markup/styling already
differ and shouldn't be forced into one generic component's props.

**Interface**: `useApplyFlow({ postingId, link }): { onApplyClick: () => void; dialog: ReactNode }`

**Implementation** (hidden behind that interface):

- `onApplyClick` calls `window.open(link, "_blank")`, not a native anchor
  navigation — only `window.open` returns a reference the hook can track.
  Each card/detail page already mounts its own hook instance per posting,
  so each one tracks only its own opened window; no shared registry needed
  across postings.
  - If `window.open` returns `null` (popup blocked — rare inside a direct
    click handler, but possible), the hook does nothing further: the tab
    never opened, so there's nothing to confirm.
- Return detection: polls the returned window's `.closed` property (there is
  no native cross-origin "closed" event) and listens for this window's own
  `focus` event. Either firing, while a tracked window exists, triggers the
  dialog for that posting specifically — not any unrelated tab switch, per
  spec.
- `dialog` is the confirmation `AlertDialog` itself ("Did you apply to this
  job?", Yes / Not yet) — the hook owns its state, the caller just renders
  `{dialog}` once wherever convenient (Radix portals the actual overlay to
  `document.body` regardless of DOM position).
  - **Yes** calls `POST /api/jobs/postings/[id]/apply`.
  - **Not yet** closes the dialog, clears the tracked window reference. No
    persistence call — stateless, per spec. The next `onApplyClick` for the
    same posting starts a fresh tracking cycle.

Both `new-list.tsx` and `posting-detail.tsx` call this hook directly; neither
duplicates the window-tracking or dialog logic.

## Job Board screen

New section inside `/jobs` (not top-level nav, not nested under `/profile`
— spec). Reuses the New list's own card component, status badge (Saved/
Applied) replacing the New badge in its existing slot — no new card markup.
Build order and the undo/reversal route are a `planning` step, not decided
here.
