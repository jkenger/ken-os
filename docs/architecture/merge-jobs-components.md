# Merge components/jobs into features/jobs (follow-up)

Small, standalone follow-up to [apps-web-structure-cleanup.md](apps-web-structure-cleanup.md) —
not added as a 10th slice there because that plan is closed and this issue
didn't exist when it was written. `jobs` (job-finder) was built after that
plan, with the same `components/`/`features/` split the original plan fixed
for six other features.

## What changed

- Moved all 13 files from `apps/web/src/components/jobs/` into
  `apps/web/src/features/jobs/`, flat — matching the precedent the original
  six merges already set (no `ui/` subfolder; UI and logic sit together).
- Updated the 4 import sites that referenced `@/components/jobs/...`:
  `app/jobs/page.tsx`, `app/jobs/filtered-out/page.tsx`,
  `app/jobs/[id]/page.tsx` (2 imports there).
- Deleted the now-empty `components/jobs/` directory.

## Class

Pure refactor. No behavior change, no new architectural decision — this
repeats an already-justified convention rather than making a new one, so no
`technical-design.md` is needed.

## Verification

- `grep -r "@/components/jobs" apps/web/src` returns zero hits.
- `pnpm --filter @ken-os/web check` passes clean (lab/studio generators +
  `tsc --noEmit`).
- No test files existed under the old `components/jobs/`, so no test
  relocation was needed.
