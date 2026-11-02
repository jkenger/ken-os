# apps/web structure cleanup: how delivery actually went

**Plan**: [`docs/architecture/apps-web-structure-cleanup.md`](../architecture/apps-web-structure-cleanup.md)
**Closed**: 2026-11-03
**Result**: all 9 slices merged, plus one unplanned hotfix (PR #181).

This is a delivery retrospective, not a second copy of the plan. It records what actually happened, what broke, and why, because most of it wasn't visible from the plan itself.

## What shipped

| Slice                         | PR   | Branch                                              |
| ----------------------------- | ---- | --------------------------------------------------- |
| 1. Drop `packages/drive`      | —    | nothing to commit; the folder was never git-tracked |
| 2. Merge `components/profile` | #173 | `refactor/merge-profile-components`                 |
| 3. Merge `components/terms`   | #174 | `refactor/merge-terms-components`                   |
| 4. Merge `engineering`+`lab`  | #175 | `refactor/merge-engineering-lab-components`         |
| 5. Merge `design-studio`      | #176 | `refactor/merge-design-studio-components`           |
| 6. Merge `connector`          | #177 | `refactor/merge-connector-components`               |
| 7. Merge `portfolio`          | #178 | `refactor/merge-portfolio-components`               |
| 8. Group `lib/auth/`          | #179 | `refactor/lib-auth-split`                           |
| 9. Group `lib/db/`            | #180 | `refactor/lib-db-split`                             |
| Hotfix (unplanned)            | #181 | `fix/shadcn-primitives-term-lookup-path`            |

Slices 2, 3, 5, 6, 7, 8, 9 were delegated to five parallel agents, each in its own git worktree, after slices 1–4 were done directly. All branches were deleted, local and remote, after merge.

## Three real bugs that shipped, and why grep missed them

The plan's own verification step for each slice was: grep for `@/components/<old-path>` or `@/lib/<old-path>`, confirm zero hits, done. That catches every TypeScript `import`. It does not catch a plain string passed to `readFileSync`, a Tailwind `@source` directive, or a test's hardcoded allowlist entry — none of those are imports, so they're invisible to an import-path grep.

**1. `generate-studio-manifest.ts`, `build-design-bundle.ts`, `design-system/components.ts` (slice 4).**
All three hardcoded the literal path `components/engineering/kit.tsx` as a string: one as an `fs.readFileSync` call, one inside a Tailwind `@source` string, one as a bare-string import outside `src/` (so even a `src`-scoped grep wouldn't have reached it). Slice 4 moved `kit.tsx` to `features/engineering-lab/kit.tsx` and never touched any of the three. Vercel's build on PR #175 failed with `ENOENT` reading the old path, because `pnpm run build` runs the manifest generator in `--check` mode before `next build` even starts.

**2. `shadcn-primitives.test.ts` (slice 3).**
This test scans `src/` for raw ARIA roles outside `components/ui`, with a small hardcoded allowlist of known, reviewed exceptions. One entry was keyed to `components/terms/term-lookup.tsx`. Slice 3 moved that file to `features/terms/term-lookup.tsx` and never touched the allowlist. The test started failing — 573 of 574 — the moment slice 3 merged into `main`, and nobody caught it in review because nobody ran the test suite against `main` itself.

**3. A module-collision class, caught twice, fixed before this write-up.**
Two different slices put a UI component in the same folder as a business-logic file of a near-identical name: `ask-claude.tsx` (component) next to `ask-claude.ts` (`askClaudeMessage`, `claudeLink`, business logic) in the engineering-lab merge, and `resume-files.tsx` next to `resume-files.ts`/`resume-files-store.ts` in the profile merge. Both were renamed (`ask-claude-dialog.tsx`, `resume-files-panel.tsx`) before this write-up, by a prior session, not by the slice author. Worth naming here because it's the same root cause as the other two: a move that's correct for every import site can still be wrong for the filesystem.

## A verification gap on my own side

Every background check I ran for slices 1–4 and the first PR-179 conflict resolution was piped through `| tail -N` to keep output short. In bash, `cmd | tail` reports `tail`'s exit code, not `cmd`'s — a failing command can still report exit 0 if `tail` itself succeeds. That's exactly why bug #1 above passed my own local `pnpm check` and only surfaced on Vercel: the check had actually failed, and the pipe hid it.

Every verification after that point used redirection (`cmd > file 2>&1; echo "EXIT: $?"`) instead of a pipe, which is what caught bug #2 for real. The fix isn't "trust less" — it's: never pipe a command whose exit code matters into anything, including `tail`, unless the pipeline explicitly preserves it.

## Merge conflicts were real, not just theoretical

The plan flagged in advance that slices 8 and 9 both touch `auth-flow.ts`'s db/schema import. That happened, plus one the plan didn't name: `portfolio-workspace.tsx` is edited by both the profile slice and the engineering-lab slice (different import lines, same file), so merging `main` into either branch produced a one-line conflict. Both were resolved by combining both sides' changes, not by picking one — the same pattern as the predicted conflict.

A second-order effect: once several slices had merged, re-merging `main` into a still-open branch (PR #178, the last one) could pull in a bug that had landed on `main` in the meantime (bug #2, above). Verifying "my branch passes" isn't the same as verifying "my branch passes against current `main`" — the gap only shows up once `main` has moved.

## Branch-checkout collision in a shared folder

Mid-way through slice 3, the working directory's checked-out branch changed out from under this session — reflog showed a `checkout` to `main` that this session didn't issue, consistent with another Claude Code session or agent using the same non-worktree checkout concurrently. It was caught by running `git branch --show-current` immediately before committing (now a hard habit, not an afterthought), which is exactly the check the repo's own git-safety rules call for. No work was lost; the commit was simply made on the correct branch once re-checked-out.

## Takeaways for the next slice-and-merge plan

- **Grep for strings, not just imports.** Before trusting an import-alias grep as complete, also check for the moved path as a bare string: `readFileSync`/`resolve` calls, build-tool directives (Tailwind `@source`, bundler entry points), and test fixtures/allowlists that reference a file by path rather than importing it.
- **Never pipe a command whose exit code you're relying on.** Redirect to a file and check `$?` directly, or read the file afterward. A pipe silently swaps in the last command's exit code.
- **A shared file edited by two independent slices will conflict exactly once, at merge time.** That's expected, not a sign something went wrong — resolve by combining both sides, and don't let one slice "win" by discarding the other's change.
- **"My branch's checks pass" and "my branch passes against current `main`"** are different claims once other slices have started merging. Re-run the full baseline oracle after merging `main` in, not just after your own change.
