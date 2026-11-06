# Jobs: Apply button, writeup skill, and Job Board spec, 2026-11-05

Brief recap. Most of today was a specification conversation for Applied-status tracking, not yet written to the product doc.

## Shipped

- Added a "write up what we did" skill, drafting session recaps from git/PR history (#205).
- Added an Apply button + full-width separator to the Jobs card; Save is now icon-only; title underlines on hover (#206).

## Still open — Applied-status / Job Board spec

Grew from "Applied status" into its own feature, Job Board. Not yet written to `docs/product/job-finder.md`. Decided:

- One feature: Job Board owns both a real Save and the new Applied status.
- Card's Apply button is unchanged; a "did you apply?" dialog fires on return to that specific opened tab.
- Confirming Applied also marks the posting Viewed.
- Saved and Applied are both additive — neither removes a posting from the New list.
- Both are reversible from the Job Board screen.
- Job Board lives as a new section inside `/jobs`, not under `/profile`.

Not yet decided: dialog copy, the Job Board screen's content, whether declining leaves a trace.
