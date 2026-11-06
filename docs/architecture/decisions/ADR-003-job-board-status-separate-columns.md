# ADR-003: Saved/Applied status lives in its own columns, not `job_matches.state`

**Status**: Accepted

**Date**: 2026-11-05

**Decision Makers**: the owner

**Tags**: jobs, data-model, decision

## Context

Job Board (`docs/product/job-finder.md`, "Job Board") needs to track whether
a posting has been Saved or Applied to. `job_matches.state` already exists
and today holds `"new" | "filtered_out"`; the product doc's older,
aspirational language lists Saved and Applied as values of that same state
alongside New/Dismissed/Filtered out, which reads as the obvious place to
add them.

`state` has exactly one writer: `filterReason()` (`apps/web/src/features/jobs/filters.ts`),
called from `savePostings` on first save and from `refilterExisting()`
(`apps/web/src/features/jobs/store.ts`) every time the owner changes a
preference. `refilterExisting` re-evaluates every stored posting and
unconditionally overwrites `state` and `filterReason` with whichever of
exactly two outcomes `filterReason()` returns.

This session already faced the same shape of question for Viewed status and
resolved it the same way: `job_matches.viewed_at`, a separate nullable
timestamp, not a third value folded into `state` (PR #197).

## Decision

Saved and Applied each get their own nullable timestamp column on
`job_matches` — `saved_at`, `applied_at` — mirroring `viewed_at` exactly.
`state` stays exactly `"new" | "filtered_out"`, owned exclusively by the
filter-classification path.

## Alternatives Considered

### Alternative 1: Extend `state` to include `"saved"` and `"applied"`

Matches the product doc's older language directly, no new columns.

Rejected: `filterReason()` has no knowledge of Saved/Applied and never will
— it is the filter-preference verdict, nothing else. The moment Saved/Applied
lived in `state`, the next `refilterExisting()` call (triggered by _any_
preference edit, unrelated to the posting in question) would overwrite it
back to `"new"` or `"filtered_out"`, silently discarding the owner's own
action. This is not a hypothetical edge case — `refilterExisting` runs on
every single preference save, and a posting the owner applied to months ago
is exactly the kind of row likely to still be sitting in the table when a
later, unrelated preference change sweeps over it.

### Alternative 2: Separate columns (chosen)

`saved_at`/`applied_at`, each independently nullable, each written only by
the action that sets it (`SaveButton`'s toggle; the Apply-confirmation
dialog's "Yes"). Neither is ever touched by `filterReason()` or
`refilterExisting()`, so a preference change cannot clobber either.

## Consequences

### Positive

- One column, one writer: `state` stays the filter-classification path's own
  concern, uncontaminated by user actions that happen to apply to the same
  row.
- Matches the already-shipped `viewed_at` pattern — a reader who understands
  one understands the other, and queries that need "any of New/Viewed/Saved/
  Applied" just read several nullable columns rather than parsing one
  overloaded enum.
- Save and Applied can each be set and cleared independently, with no
  encoding games for "a posting that's both Saved and Applied."

### Negative

- A posting's full status is now spread across four columns (`state`,
  `viewed_at`, `saved_at`, `applied_at`) instead of one. A query listing
  "everything on Job Board" needs `saved_at is not null or applied_at is not
null`, not a single equality check.

### Neutral

- Doesn't change `state`'s existing values or any code that reads it today.

## Implementation Notes

- `markApplied(userId, postingId)`: sets `applied_at = now()` and, matching
  the product doc's "Applied implies Viewed" rule, `viewed_at = coalesce(viewed_at, now())`
  in the same update.
- Save stays a direct toggle (unlike Applied, no confirmation step): `setSaved(userId, postingId, saved: boolean)` sets `saved_at` to `now()` or `null`.

## Related Decisions

- PR #197 (New/Viewed state) established the separate-column pattern this
  one extends.

## References

- `docs/product/job-finder.md`, "Job Board"
- `apps/web/src/features/jobs/filters.ts`, `apps/web/src/features/jobs/store.ts` (`refilterExisting`)
