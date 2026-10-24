---
version: 1
slug: "apps-web-src-components-workspace-shell-tsx"
primary_target: "apps/web/src/components/workspace-shell.tsx"
related_targets: ["apps/web/src/app"]
---

# Loots app frame (every signed-in module)

Scope: the shared shell and module pages of apps/web (Profile, Engineering, Terms, Memory, Portfolio, Studio). Mode: Operate. Audience: one owner, desktop and phone, daily use. Task: keep career details, learn on a roadmap, look up terms, publish a portfolio. Constraints: shadcn default block of globals.css and components/ui untouched, all tokens in the Loots section; colour never carries meaning alone; 4.5:1 text in light and dark.

## Direction contract

THESIS: Loots reads like a printed university course catalog: the app is a set of courses and their numbered parts. It refuses the grey SaaS dashboard with a sans title over a white card grid.

OWN-WORLD: warm uncoated paper ground, brown-black ink, hairline rules, a deep oxblood module rail as the committed shell colour (the catalog's cover). Source Serif 4 for headings, Public Sans for body, Geist Mono for counts and percentages. Status keeps its icon and word; chapter hues stay low-chroma inks.

STORY: the owner opens a module, reads its title like a section head, sees each chapter and step by its number, and acts with the standard controls.

FIRST VIEWPORT: oxblood icon rail at left, paper section column, inset paper page. Page title in serif, semibold, 30 to 36px, a hairline rule under it, actions right. On the roadmap: progress strip, then lanes or graph with chapter numbers in the margin.

FORM: brief-pinned "Course catalog" (position 1, chosen by the owner). Signature move: chapter and step numbers hang in the margin as serif numerals, with a hairline rule under each heading. seed: none (no roll ran: the owner pinned the direction, so concept-seed was skipped as the skill allows for a pinned brief)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
