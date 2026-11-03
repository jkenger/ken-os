# apps/web structure cleanup (plan)

**Status**: Closed (2026-11-03). All 9 slices landed; see [the write-up](../writeups/apps-web-structure-cleanup.md) for how delivery actually went.
**Delivery**: 9 independent trunk-based PRs, one branch per slice (e.g. `refactor/drop-drive-package`, `refactor/merge-profile-components`, `refactor/lib-auth-split`). Any order except Slice 1 first.

## Goal

Bring `apps/web/src` into compliance with the codebase contract this repo already
documents in [`starter-standard.md`](starter-standard.md) — `app/`,
`features/<feature>/`, `components/ui/`, `lib/auth/`, `lib/db/` — by removing one
dead package and the `components/`/`features/` split-brain duplication. No
product behavior changes in this plan; every slice is a **pure refactor**.

## Conserved contract (every slice)

The app behaves identically for every user-visible flow. Only file locations
and import paths change. `components/ui/` is not touched or renamed — it is
the working, already-correct part of the contract (236 import sites).

**Baseline oracle, run at every slice:** `pnpm check` (typecheck + the two
generator checks), `pnpm test`, `pnpm build`, `pnpm format:check`.

## Explicitly out of scope

Not guessed at, because the existing contract doesn't name a destination and
there's no second-consumer evidence yet:

- Remaining flat `lib/` files: `api-client.ts`, `app-language-banned.ts`,
  `app-language-scan.ts`, `app-language.test.ts`, `config.ts`, `day.ts`,
  `day.test.ts`, `messages.ts`, `shadcn-default.test.ts`,
  `shadcn-primitives.test.ts`, `theme.ts`, `theme.test.ts`, `utils.ts`.
- Cross-cutting shell components: `surfaces.ts`, `workspace-shell.tsx`,
  `docked-panel.tsx`, `account-menu.tsx`, `brand.tsx`, `sign-in-card.tsx`,
  `page-heading.tsx`, `memory-workspace.tsx`, `inline-script.tsx`,
  `inline-separator.tsx`, `use-theme-choice.ts`. No single feature owns these.

## Slices

### Slice 1: Delete the dead `packages/drive` package

**Value**: Removes dead weight — the package has only `node_modules`, no
`src/` or `package.json`. Every reference to `@ken-os/drive` found lives in
stale `.claude/worktrees/*` checkouts, not the main tree.
**Path**: `pnpm-workspace.yaml`'s `packages/*` glob currently picks it up for
nothing; removing the folder removes it from the workspace.
**Class**: Pure refactor (deletion).
**Delivery**: Independent PR against trunk.
**Required implementation skills**: N/A — no code restructuring, just removal.
**Preservation baseline**: `grep -rn "ken-os/drive\|packages/drive"` across
the main tree (excluding `.claude/worktrees/`) returns zero hits today.
**Preservation change**: Delete `packages/drive/`. Run `pnpm install` to
refresh the lockfile.
**Verification / alternate evidence**: `N/A` for mutation testing — alternate
evidence is the same grep returning zero hits after deletion, plus
`pnpm install`, `pnpm check`, `pnpm test`, `pnpm build` all passing.
**PR-ready when**: Baseline oracle passes and the grep stays at zero.
**Slice complete when**: PR lands.

### Slice 2: Merge `components/profile` into `features/profile`

**Value**: Removes split-brain — `features/profile/` (owns `store.ts`) and
`components/profile/` (owns UI, including `profile-workspace.tsx`) both claim
the same feature today.
**Path**: Move `apps/web/src/components/profile/*` into
`apps/web/src/features/profile/`. Update the 4 `@/components/profile` import
sites to `@/features/profile/...`.
**Class**: Pure refactor.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `refactoring` (mechanical move only).
**Preservation baseline**: `pnpm check`, `pnpm test`, `pnpm build` pass before
the move; no test files exist under `components/profile/` today, so no test
relocation is needed.
**Preservation change**: Move the files; update the 4 import sites; run
`grep -rn "@/components/profile"` to confirm zero remaining references.
**Verification / alternate evidence**: `N/A` for mutation testing — alternate
evidence is the zero-reference grep plus the baseline oracle passing
unchanged.
**PR-ready when**: Baseline oracle passes, zero stale imports remain.
**Slice complete when**: PR lands.

### Slice 3: Merge `components/terms` into `features/terms`

**Value**: Same split-brain fix for the `terms` feature.
**Path**: Move `apps/web/src/components/terms/*` into
`apps/web/src/features/terms/`. Update the 3 `@/components/terms` import
sites.
**Class**: Pure refactor.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `refactoring`.
**Preservation baseline**: Baseline oracle passes; no tests live under
`components/terms/` today.
**Preservation change**: Move files; update the 3 import sites; confirm zero
remaining `@/components/terms` references.
**Verification / alternate evidence**: `N/A` for mutation testing — zero-
reference grep plus baseline oracle.
**PR-ready when**: Baseline oracle passes, zero stale imports remain.
**Slice complete when**: PR lands.

### Slice 4: Merge `components/engineering` and `components/lab` into `features/engineering-lab`

**Value**: Same split-brain fix, across two source folders that both belong
to one feature. `components/lab/` (`markdown.tsx`, `topic/`, `words.ts`)
renders lab content for `engineering-lab`; `components/engineering/` is that
feature's UI under its older name.
**Path**: Move both `apps/web/src/components/engineering/*` and
`apps/web/src/components/lab/*` into
`apps/web/src/features/engineering-lab/`. Update the 3 `@/components/
engineering` sites and the 16 `@/components/lab` sites.
**Class**: Pure refactor.
**Delivery**: Independent PR against trunk. **Confirm the `lab` →
`engineering-lab` grouping with the repo owner before starting** — it's
inferred from file contents, not an explicit existing mapping.
**Required implementation skills**: `refactoring`.
**Preservation baseline**: Baseline oracle passes; no tests live under either
source folder today.
**Preservation change**: Move both folders' contents; update all 19 import
sites; confirm zero remaining `@/components/engineering` or `@/components/lab`
references.
**Verification / alternate evidence**: `N/A` for mutation testing — zero-
reference grep plus baseline oracle.
**PR-ready when**: Baseline oracle passes, zero stale imports remain, grouping
confirmed.
**Slice complete when**: PR lands.

### Slice 5: Merge `components/design-studio` into `features/design-studio`

**Value**: Same split-brain fix for `design-studio` (`studio-graph.tsx`,
`studio-inspector.tsx`, `studio-workspace.tsx` and others currently sit in
`components/design-studio/` alongside `features/design-studio/`'s
`manifest.ts`, `drafts.ts`, `source.ts`).
**Path**: Move `apps/web/src/components/design-studio/*` into
`apps/web/src/features/design-studio/`. Update the 1 `@/components/
design-studio` import site.
**Class**: Pure refactor.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `refactoring`.
**Preservation baseline**: Baseline oracle passes.
**Preservation change**: Move files; update the import site; confirm zero
remaining references.
**Verification / alternate evidence**: `N/A` for mutation testing — zero-
reference grep plus baseline oracle.
**PR-ready when**: Baseline oracle passes, zero stale imports remain.
**Slice complete when**: PR lands.

### Slice 6: Merge `components/connector` into `features/connector`

**Value**: Same split-brain fix for `connector` (`features/connector/
oauth-store.ts`, `rules.ts` already exist alongside `components/connector/`).
**Path**: Move `apps/web/src/components/connector/*` into
`apps/web/src/features/connector/`. Update the 1 `@/components/connector`
import site.
**Class**: Pure refactor.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `refactoring`.
**Preservation baseline**: Baseline oracle passes.
**Preservation change**: Move files; update the import site; confirm zero
remaining references.
**Verification / alternate evidence**: `N/A` for mutation testing — zero-
reference grep plus baseline oracle.
**PR-ready when**: Baseline oracle passes, zero stale imports remain.
**Slice complete when**: PR lands.

### Slice 7: Merge `components/portfolio` into `features/portfolio`

**Value**: Same split-brain fix for `portfolio` (`features/portfolio/
store.ts` already exists alongside `components/portfolio/`).
**Path**: Move `apps/web/src/components/portfolio/*` into
`apps/web/src/features/portfolio/`. Update the 1 `@/components/portfolio`
import site.
**Class**: Pure refactor.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `refactoring`.
**Preservation baseline**: Baseline oracle passes.
**Preservation change**: Move files; update the import site; confirm zero
remaining references.
**Verification / alternate evidence**: `N/A` for mutation testing — zero-
reference grep plus baseline oracle.
**PR-ready when**: Baseline oracle passes, zero stale imports remain.
**Slice complete when**: PR lands.

### Slice 8: Group `lib/auth/`

**Value**: Matches the contract's explicit `lib/auth/` folder. Currently
`auth.test.ts`, `auth-errors.ts`, `auth-flow.ts`, `oauth.ts`,
`oauth-relay.ts`, `oauth-relay.test.ts`, `session.ts`, and `origin.ts` (the
mutation-origin check documented as part of the auth security boundary in
`overview.md`) sit flat in `lib/`.
**Path**: Move those 8 files into `apps/web/src/lib/auth/`. Update their
internal imports and any external `@/lib/<name>` references to
`@/lib/auth/<name>`.
**Class**: Pure refactor.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `refactoring`.
**Preservation baseline**: `apps/web/package.json`'s `test` script hardcodes
`src/lib/*.test.ts` — **this must change** to also match
`src/lib/auth/*.test.ts`, or `auth.test.ts` and `oauth-relay.test.ts` go
silent: `pnpm test` reports green while running zero auth tests.
**Preservation change**: Move the files; update the `test` script glob;
update internal/external imports.
**Verification / alternate evidence**: `N/A` for mutation testing — alternate
evidence is running `pnpm test` with `--reporter` output showing
`auth.test.ts` and `oauth-relay.test.ts` by name in the executed list (not
just an exit code), plus the baseline oracle passing.
**PR-ready when**: Baseline oracle passes, both moved test files are
confirmed by name in the test run output, zero stale imports remain.
**Slice complete when**: PR lands.

### Slice 9: Group `lib/db/`

**Value**: Matches the contract's explicit `lib/db/` folder. Currently
`db.ts` and `schema.ts` sit flat in `lib/`.
**Path**: Move both files into `apps/web/src/lib/db/`. Update
`drizzle.config.ts`'s schema path, `scripts/migrate.ts` and
`scripts/migrate-on-deploy.ts`'s imports, and any `@/lib/db`/`@/lib/schema`
references elsewhere.
**Class**: Pure refactor.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `refactoring`.
**Preservation baseline**: `pnpm db:generate` and `pnpm db:migrate` must still
resolve the schema at its new path — same silent-break risk as Slice 8, this
time against Drizzle's config rather than the test runner.
**Preservation change**: Move the files; update `drizzle.config.ts` and the
migration scripts; update remaining imports.
**Verification / alternate evidence**: `N/A` for mutation testing — alternate
evidence is `pnpm db:generate` running without error against the new path,
plus the baseline oracle passing.
**PR-ready when**: Baseline oracle passes, `pnpm db:generate` resolves the
moved schema, zero stale imports remain.
**Slice complete when**: PR lands.

## Pre-PR quality gate (every slice)

1. Baseline oracle passes: `pnpm check`, `pnpm test`, `pnpm build`,
   `pnpm format:check`.
2. Zero stale import references for whatever was moved (`grep` for the old
   path).
3. Slices 8 and 9 additionally confirm their silent-break risk by name (test
   list output; `db:generate` output), not just by exit code.

## End of plan

When all 9 slices have landed: confirm `apps/web/src` matches
`starter-standard.md`'s codebase contract everywhere it applies, update this
file's status to Closed, and note any newly-evidenced case for the
deferred items (remaining `lib/` files, cross-cutting shell components) in
`starter-standard.md` itself rather than reopening this plan.
