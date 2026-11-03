# ADR-002: Stay on incremental cleanup, not a ground-up rewrite

**Status**: Accepted

**Date**: 2026-11-04

**Decision Makers**: the owner

**Tags**: architecture, folder-structure, migration, decision

## Context

ken-os predates the dotfiles repo's current "Hard architecture" convention
(`app/` routes only, `components/ui/` presentational-only, `platform/` named
capabilities, `generated/` never hand-edited, `features/<feature>/` earned on
reuse). The question: does ken-os's existing structure already fit that
convention well enough to fix in place, or does the gap justify starting a
new project from scratch and porting features over?

An `improve-codebase-architecture` audit was run specifically to answer this,
scoped to `apps/web/src/` and `packages/*` (the docs/ tree was audited and
fixed separately, see the consolidation that landed the `decisions/` folder
this ADR lives in). Full report:
`architecture-review-ken-os-20261103-231040.html`.

- `packages/domain`, `packages/agents`, `packages/portfolio`: zero import-
  direction inversions, zero app-layer dependency leakage (no Next.js, React,
  or UI library imports in any package).
- `components/`: 9 of 11 non-`ui/` files were already correctly placed
  (genuinely cross-feature or cross-route); the 2 stragglers were
  single-consumer feature code sitting at the shared level.
- Feature coupling: one real reverse dependency found (`features/profile`
  calling into `features/portfolio`'s own shaping policy), one mild
  type-only cross-feature import, and nothing else.
- Git history (last 100 non-merge commits on `main`): dominated by one
  feature's (`jobs`) healthy vertical-slice development, not shotgun changes
  forcing edits across unrelated folders.
- Nine prior `components/<x>` → `features/<x>` migrations (PRs #172-#182,
  plus two more from this audit, #190) each cost roughly one PR, 1-2
  commits, single-digit-to-low-teens files, near-zero net line diff.

## Decision

Keep cleaning up ken-os's existing codebase in place. No ground-up rewrite,
no new project to port features into.

## Alternatives Considered

### Alternative 1: Ground-up rewrite in a new project

**Pros:**

- Immediate, total conformance to the current dotfiles Hard architecture
  convention, with no legacy shape to reconcile.
- A clean slate to apply the full feature lifecycle chain from day one.

**Cons:**

- Throws away 591 passing tests and six shipped modules (Profile,
  Engineering, Terms, Project Memory, Jobs, Portfolio) that would all need
  re-proving from scratch.
- No evidence the current structure's problems are deep enough to need it:
  the audit found a clean package layer, mostly-correct component placement,
  and no systemic coupling.
- The team/agent combination has already proven it can execute structural
  fixes incrementally and cheaply (nine completed migrations); a rewrite pays
  that same cost again for the parts that were never actually broken.

**Why Rejected**: the audit found no evidence of the kind of deep,
systemic rot that would justify this cost. Every structural issue found was
small, bounded, and already fixable with the same pattern proven nine times.

### Alternative 2: Incremental cleanup in place (chosen)

**Pros:**

- Every structural issue the audit found was already fixed in this same
  session, cheaply (PR #190: the two stray components; PR #191: the one
  real reverse feature dependency).
- Reuses nine proven migration cycles instead of starting over.
- No working behavior is put at risk; the test suite and shipped modules
  stay intact throughout.

**Cons:**

- A few cosmetic gaps remain unresolved: no literal `platform/` folder
  (`lib/` fills that role under a different name, but isn't renamed), a
  couple of generated files sit flat instead of nested, a few route files
  compute minor logic inline instead of delegating to their feature.

**Why Chosen**: the evidence matched this path's cost profile, not the
rewrite's. The remaining gaps are cosmetic, not structural, and the audit
explicitly rated them speculative — not worth their own investment, let
alone a rewrite.

## Consequences

### Positive

- No re-proving of already-working, tested behavior.
- The audit's remaining speculative-tier items (platform/ naming,
  generated/ placement, a few inline-logic routes) can be picked up
  opportunistically, or never, without blocking anything.
- Confirms the dotfiles feature lifecycle chain and its migration pattern
  work on a real, pre-existing codebase, not just greenfield projects.

### Negative

- ken-os's folder names (`lib/` instead of `platform/`) will keep
  diverging cosmetically from the dotfiles convention's literal naming,
  unless a later, separate decision renames it.

### Neutral

- This decision closes the cleanup-vs-rewrite question specifically for
  `apps/web/src/` and `packages/*`. It says nothing new about the `docs/`
  tree, which was already handled separately.

## Implementation Notes

- No implementation follows directly from this ADR — it's a decision not
  to act further beyond what PRs #190 and #191 already did.
- Future structural findings should default to the same incremental,
  PR-sized pattern unless new evidence of systemic coupling emerges.

## Related Decisions

- None yet. This is the project's second ADR.

## References

- `architecture-review-ken-os-20261103-231040.html` (the full audit report;
  generated to the OS temp directory, not committed to the repo).
- PR #190 — merged the two stray `components/` files into their features.
- PR #191 — removed `features/profile`'s reverse dependency on
  `features/portfolio`.
- PRs #172-#182 — the nine prior `components/<x>` → `features/<x>`
  migrations used as the cost-evidence baseline.
