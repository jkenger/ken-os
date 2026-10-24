---
version: 1
slug: "apps-web-src-components-workspace-shell-tsx"
primary_target: "apps/web/src/components/workspace-shell.tsx"
related_targets: ["apps/web/src/app"]
---

# Loots app frame (every signed-in module)

Scope: the shared shell and module pages of apps/web (Profile, Engineering, Terms, Memory, Portfolio, Studio). Mode: Operate. Audience: one owner, a full-stack developer, desktop and phone, daily use. Task: keep career details, learn on a roadmap, look up terms, publish a portfolio. Constraints: shadcn default block of globals.css and components/ui untouched, all tokens in the Loots section; colour never carries meaning alone; 4.5:1 text in light and dark.

## Direction contract

THESIS: Loots is a graphite working surface in two themes, light and dark, picked from the system setting (Ken asked for both on 24 Oct 2026): graphite panels split by one-pixel seams, colour spent only on state. It refuses the white SaaS card grid and the paper look of PR #143.

OWN-WORLD: dark: neutral graphite ground; light: cool light grey ground with graphite ink; in both, panels one step off the ground, seams as 1px hairlines instead of shadows; text near-white, muted grey at 4.5:1 or better. State colours only: green Learned, amber In progress, blue for the picked item and focus, red for destructive. Geist for headings and body (one family, as Ken's picked sketch sets it), Geist Mono for numbers. Chapters are told apart by number and name, not hue. Panel heads in small uppercase with tracking; they are the heading, never a label above one.

STORY: the owner opens a module and reads it as a set of persistent panels; status reads from icon, word and one state colour; anything destructive sits apart and stays outlined until focused.

FIRST VIEWPORT: icon rail, section column and page flush on one ground split by 1px seams, a 48px top bar; page title 24px Geist semibold with actions right; on the roadmap, a seamed progress strip, then lanes tiled with 1px seams, topic numbers in mono, the picked row marked by a blue inset edge, and the topic panel docked right.

FORM: Dark Console, the competitive challenger the owner picked on the decision page over the roll (Braun Panel). Signature move: panels tile with 1px seams (gap-px on the border colour), and destructive actions are isolated in their own seamed footer, outline red until focused. seed:8758772bc1f247bd (printed as SEED REFERENCE by the roll, which ran from the course-catalog-redesign worktree). Recorded adaptations: per-item destructive actions (Terms Remove, Memory Reject) stay at their item's end, outlined red and set apart by space, rather than in a shared footer; the topic panel opens when a topic is picked, not by default.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
