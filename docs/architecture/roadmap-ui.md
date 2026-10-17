# Roadmap screen: layout and look

The Engineering roadmap was redesigned on 17 Oct 2026 (branch `feat/roadmap-redesign`). This page records the
conventions that came out of it, so the next screen can reuse them instead of inventing its own. It covers what was
built and proved on this screen only; it is not a full design system.

## What the screen is

- **Header.** The roadmap title (with the roadmap switcher), then one row of actions grouped by role: the view switch
  (Lanes, Graph) and Search reviews, a divider, then Claude's actions (Re-plan, Claude setup) as quiet buttons, and one
  primary button, Continue topic, which opens the topic you're on.
- **Progress line.** Four cells in one bordered strip: learned out of total with a bar and a percentage, Now (the
  current topic), Next (the next unfinished topic, from `nextTopic`), and the roadmap's size. Every number comes from
  `RoadmapView`. There are no time estimates, because the data has none.
- **Lanes** (the default view). One card per chapter in roadmap order, in a grid that fits as many 15.5rem columns as
  the width allows and wraps, so no sideways scrolling. Each card has the chapter mark, title, "x of y learned", a thin
  bar, and its topics as full-width rows.
- **Graph.** The goal heads a column of chapters in roadmap order. An open chapter shows its topics in a group to its
  right, two per row. Lines show only what the data has: roadmap order and which chapter a topic is in. Layout lives in
  `features/engineering-lab/roadmap-layout.ts` and is unit tested.
- **Topic panel.** From 1280px it docks to the right of the roadmap (`TopicSheet` with `docked`), so the roadmap stays
  visible and clickable; Escape or the close button closes it. Below 1280px it is the same content in a Sheet. Lanes
  and Graph share the selected topic, and the open topic lives in the address.

## Colours

Tokens are in the Loots section at the end of `apps/web/src/app/globals.css`, each with a light and a dark value and
a `-soft` fill for chips and tiles. Names avoid the old Studio names that `shadcn-default.test.ts` blocks (no
`status-*`, `tint`, `canvas`).

| Token                           | Use                                                                                                       | Never                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `topic-learned`, `topic-active` | Status icons and the status chip for Learned and In progress                                              | Decoration, chapter identity |
| `chapter-1` to `chapter-6`      | Chapter mark, chapter bar, the dot on a graph group. Picked by roadmap position with `chapterTone(index)` | Status of any kind           |
| shadcn tokens                   | Everything else: surfaces, text, borders, the primary button                                              |                              |

Not started and Skipped use `muted-foreground`. Status is never colour alone: each status has its own icon shape
(filled check, half circle, dashed ring, skip arrow) and its word in the accessible name.

Chapter colour follows roadmap position, not the chapter's area, because a planned roadmap's chapters often share one
area ("Added by Claude").

## Type, spacing, shape

- Headings use `font-heading`: page title `text-2xl md:text-3xl` bold, panel title `text-xl` bold, lane title 15px
  semibold. Section labels inside panels are `text-xs font-semibold text-muted-foreground`.
- Numbers that line up (chapter number, percentage, step numbers) use `font-mono text-xs`.
- Page padding `px-4 md:px-7`, `gap-5` between page blocks, `gap-3.5` between lanes.
- Cards and strips are `rounded-xl border bg-card` with no shadow. Rows inside are `rounded-lg`. Only the selected graph
  topic gets a shadow.
- Selected means a dark outline (`ring-foreground` or `border-foreground`), never a colour fill, so it reads apart from
  status colours and from the focus ring.

## Components

Shared within the roadmap folder (`components/engineering/roadmap/`):

| Component                                                          | What it is                                                 | Reuse it when                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------ |
| `StatusIcon`, `StatusLabel`, `StatusChip` (`status.tsx`)           | A topic status as icon, icon plus word, or soft chip       | Anything that shows a topic's status |
| `ChapterMark`, `ChapterBar`, `chapterClasses` (`chapter-mark.tsx`) | A chapter's numbered tile, progress bar and accent classes | Anything that lists chapters         |
| `RoadmapProgress`                                                  | The progress strip                                         | Roadmap pages only                   |

Roadmap-only on purpose: `RoadmapLanes`, `RoadmapGraph` and its node components, `TopicSheet`. They hold roadmap
behaviour and would not survive being made generic.

Not extracted yet, though they repeat: the bordered strip of cells (`RoadmapProgress`, `RoadmapSummary`) and the
docked-or-sheet panel. Extract them into `components/engineering/kit.tsx` (or a shared folder) the second time another
screen needs one, not before.

## Rules for the next screen

- Build controls from `components/ui` only; `shadcn-primitives.test.ts` fails on a raw `button` or a hand-built widget.
- A new colour is a token in the Loots section with a light and dark value and an `@theme inline` entry, then a
  class. Never a hex class (the guard test blocks it). Check text contrast in both themes: 4.5:1 for body text.
- Keep status colours and chapter (domain) colours separate, and keep an icon or word next to every colour.
- Keep data honest: no invented estimates, resources, prerequisites or states. Show a section only when the data has it.
- Put layout maths in a pure function next to the feature and test it; keep components thin.
- Check the screen at phone width (cards stack, the panel becomes a sheet), at 1280px and wider (panel docks), and with
  reduced motion.

## Gaps this redesign could not close

These need a data-model change first, so the screen does not fake them:

- **Prerequisites between topics.** The roadmap stores chapters and topic order only. A real dependency graph needs a
  `prerequisites` list per topic (or per roadmap edge) in `lab_roadmaps`, and `save_roadmap` to accept it.
- **Time estimates and difficulty.** Topics have no duration or difficulty.
- **Learning resources and tasks.** The topic panel shows what exists: what to explain, Learn and Practice steps,
  status, sessions, the review sheet and notes.
- **Blocked.** There is no blocked status; the four statuses are Not started, In progress, Learned, Skipped.
