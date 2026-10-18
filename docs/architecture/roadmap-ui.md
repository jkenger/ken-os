# Roadmap screen: layout and look

The Engineering roadmap was redesigned on 17 Oct 2026 (`feat/roadmap-redesign`, then `feat/topic-panel-modes` for the
topic panel). This page records the conventions that came out of it, so the next screen can reuse them instead of
inventing its own. It covers what was built and proved on this screen only; it is not a full design system.

## What the screen is

- **Header.** The roadmap title (with the roadmap switcher), then three actions: Search reviews as an icon button with
  a tooltip, Claude setup as a quiet button, and one primary button, Continue topic, which opens the topic you're on.
  The view switch (Lanes, Graph) sits just above the roadmap it changes, not in the header (17 Oct 2026, when the
  header row got too crowded). Re-plan was taken off the header on 17 Oct 2026 until it is redesigned;
  `replanMessage` stays in `features/engineering-lab/ask-claude.ts`, unused.
- **Setup checklist.** Shown until setup is done (`setupChecklist` in `features/engineering-lab/claude-setup.ts`),
  above the progress line. With no roadmap planned it opens with all four steps. Once a roadmap is planned it starts
  folded to one row: the count, the next step and that step's action, with Show steps for the rest, so the roadmap sits
  near the top (18 Oct 2026). The roadmap never waits on setup.
- **Progress line.** Four cells in one bordered strip: learned out of total with a bar and a percentage, Now (the
  current topic), Next (the next unfinished topic, from `nextTopic`), and the roadmap's size. Every number comes from
  `RoadmapView`. There are no time estimates, because the data has none.
- **Lanes.** One card per chapter in roadmap order, in a grid that fits as many 15.5rem columns as
  the width allows and wraps, so no sideways scrolling. Each card has the chapter mark, title, "x of y learned", a thin
  bar, and its topics as full-width rows.
- **Graph** (the default view; phones open on Lanes unless you picked Graph before). Redrawn on 18 Oct 2026 as a dependency map: every
  chapter is a tinted area (its chapter colour) holding all its topics, four to a row; areas run left to right in
  roadmap order and wrap to a new row. Topic cards show the status icon, the title (up to two lines, then cut, with the
  full title on hover) and the status word. Arrows run
  from topic to topic inside a chapter, a dashed arrow joins chapters side by side, and prerequisites Claude saved
  curve between topics; lines touching the open topic are drawn in `selected`. It opens on the row holding the open
  topic's chapter (else the current chapter, else the first), fitted across and pinned to the top. Where that fit would
  be under 75% (below about 1600px, or beside the docked panel), it opens at 75% with that chapter at the left edge
  instead, and the rest is a pan away. Edges are not Tab stops. The view switch row carries the status legend (`StatusLegend`, from 1024px) and **Find a topic** (`TopicFind`, also opened with /; Ctrl or Cmd + K stays with the module search), in line with the Lanes and Graph tabs, for both views. Layout lives in `features/engineering-lab/roadmap-layout.ts` and
  is unit tested.
- **Topic panel.** From 1280px it docks to the right of the roadmap (`TopicSheet` with `docked`), so the roadmap stays
  visible and clickable; Escape (wherever focus is, unless it is closing a dialog or menu first) or the close button
  closes it. Below 1280px it is the same content in a Sheet. Both come from the shared `DockedPanel`. Lanes
  and Graph share the selected topic, and the open topic lives in the address. It has two modes:
  - **Overview**, beside the graph: status, chapter, description, task progress, Next in path, and **Open in lanes**.
  - **Detail**, beside the lanes: Tasks, Mastery criteria (the topic's points: Claude's criteria once written), Status, Link chat and
    Sessions in the Topic tab; the review sheet and notes in the Review tab. A review opened from search always shows
    Detail. The main button is the first task left to do, or Next topic once the topic is finished.
- **Tasks.** The same three for every topic, from `topicTasks` in `features/engineering-lab/topic-steps.ts`: **Read**
  (done once Claude has started), **Build** (done when an exercise run passed; waits when there is no exercise), and
  **Explain** (done when the topic is Learned with your own words). Nobody ticks them by hand.

## Colours

Tokens are in the Loots section at the end of `apps/web/src/app/globals.css`, each with a light and a dark value and
a `-soft` fill for chips and tiles. Names avoid the old Studio names that `shadcn-default.test.ts` blocks (no
`status-*`, `tint`, `canvas`).

| Token                           | Use                                                                                                    | Never                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `topic-learned`, `topic-active` | Status icons and the status chip for Learned and In progress                                           | Decoration, chapter identity |
| `selected`                      | The picked topic in Lanes and Graph (`selectedSurface`) and the graph lines touching it                | Status of any kind           |
| `chapter-1` to `chapter-6`      | Chapter mark, chapter bar, the tinted graph area. Picked by roadmap position with `chapterTone(index)` | Status of any kind           |
| shadcn tokens                   | Everything else: surfaces, text, borders, the primary button                                           |                              |

Not started and Skipped use `muted-foreground`. Status is never colour alone: each status has its own icon shape
(filled check, half circle, dashed ring, skip arrow) and its word in the accessible name.

Chapter colour follows roadmap position, not the chapter's area, because a planned roadmap's chapters often share one
area ("Added by Claude").

## Type, spacing, shape

- Headings use `font-heading`: page title `text-2xl md:text-3xl` bold, panel title `text-xl` bold, lane title 15px
  semibold. Section labels inside panels are `text-xs font-semibold text-muted-foreground`.
- Numbers that line up (chapter number, percentage, step numbers) use `font-mono text-xs`.
- Page padding `px-4 md:px-7`, `gap-5` between page blocks, `gap-3.5` between lanes.
- Cards and strips are `rounded-xl border bg-card` with no shadow. Rows inside are `rounded-lg`. Graph topic cards are the
  exception: `rounded-xl` with `shadow-xs`, so they sit above their tinted area.
- Selected means a soft `selected` border and ring on a card surface (`selectedSurface` in `components/engineering/kit.tsx`),
  in Lanes and Graph alike, matching the lit graph arrows; the icon and word still carry the status.

## Components

Shared within the roadmap folder (`components/engineering/roadmap/`):

| Component                                                          | What it is                                                 | Reuse it when                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------ |
| `StatusIcon`, `StatusLabel`, `StatusChip` (`status.tsx`)           | A topic status as icon, icon plus word, or soft chip       | Anything that shows a topic's status |
| `ChapterMark`, `ChapterBar`, `chapterClasses` (`chapter-mark.tsx`) | A chapter's numbered tile, progress bar and accent classes | Anything that lists chapters         |
| `RoadmapProgress`                                                  | The progress strip                                         | Roadmap pages only                   |
| `DockedPanel`, `useDocked` (`components/docked-panel.tsx`)         | The docked-or-sheet side panel `TopicSheet` fills          | Any screen with a picked-item panel  |

Roadmap-only on purpose: `RoadmapLanes`, `RoadmapGraph` and its node components, `TopicSheet`. They hold roadmap
behaviour and would not survive being made generic.

Not extracted yet, though it repeats: the bordered strip of cells (`RoadmapProgress`, `RoadmapSummary`). Extract it the
first time another screen needs one, not before. Shared tokens, components and the rules for adding more are in
`docs/architecture/design-system.md`.

## Rules for the next screen

- Build controls from `components/ui` only; `shadcn-primitives.test.ts` fails on a raw `button` or a hand-built widget.
- A new colour is a token in the Loots section with a light and dark value and an `@theme inline` entry, then a
  class. Never a hex class (the guard test blocks it). Check text contrast in both themes: 4.5:1 for body text.
- Keep status colours and chapter (domain) colours separate, and keep an icon or word next to every colour.
- Keep data honest: no invented estimates, resources, prerequisites or states. Show a section only when the data has it.
- Put layout maths in a pure function next to the feature and test it; keep components thin.
- Check the screen at phone width (cards stack, the panel becomes a sheet), at 1280px and wider (panel docks), and with
  reduced motion.

## Topic panel: what comes next

Agreed 17 Oct 2026: only what the reference mockup and the current build show, nothing beyond them.

1. **Done:** the two modes on today's data, Graph by default, Re-plan button removed.
2. **Done, Claude's material:** storage and connector tools so Claude, the only writer, adds per topic a description, an
   estimate ("~25 min"), difficulty (Easy, Medium, Hard), prerequisites (graph arrows; "Waiting on" is advice, not a
   lock; loops are refused), related topics on the same roadmap, learning resources (links checked on save), task
   wording, and mastery criteria. Roadmap-wide fields come when a roadmap is planned, topic detail when a topic starts.
   Claude can correct its own material; there are no edit forms. A topic without it shows "Not planned yet" and Ask
   Claude to plan it.
3. **Done, retire as replaced** (changed 17 Oct 2026 from removing everything at once, because material is written as
   each topic starts, so "every topic has Claude's version" could take weeks): once Claude writes a topic's material,
   its mastery criteria become the topic's points and its description the topic's line, everywhere.
   `requireAnyTopic` in `any-topic.ts` applies it (`withMaterial` in `topic-material.ts`), so `get_topic`'s p1, p2…,
   review sheets (which must cover the new criteria), the Review tab and the panel all follow. Topics Claude hasn't
   written keep the old material as the fallback. A review sheet saved on the old points no longer lines up after the
   switch; Claude rewrites it the next time it works on the topic.
4. **Later, final cleanup:** delete `points.yaml`, the `gap` lines and the built-in labs once no active topic falls
   back to them. Sessions, review sheets, notes, evidence, status history and done exercises stay.

How release 2 works:

- **Plans** are rows in `lab_topic_plans`, one per topic on a roadmap. `save_topic_plan` sends any number of topics;
  fields left out keep their value, so the same tool plans a roadmap and corrects one topic. `mergePlans` refuses a
  topic, prerequisite or related topic that isn't on the roadmap, a topic pointing at itself, and loops.
- **Material** is one row per owner and topic in `lab_topic_material`, replaced whole by `save_topic_material`. Every
  resource link is fetched first (`brokenLinks`, HEAD then GET), and the save is refused if one doesn't load.
- **On screen:** Overview adds the estimate and difficulty, Prerequisites with "Waiting on", and Related objectives;
  Detail adds Learning resources, Claude's task wording and its mastery criteria (else the topic's points), or "Not
  planned yet" with Ask Claude to plan it. The graph draws prerequisites as curved arrows between shown topics.
- **Claude** reads its plans in `get_roadmap` and its material in `get_topic`. The Project instructions changed on 17
  Oct 2026, so Claude setup shows Out of date until they're pasted again.
- **Teaching from the material:** the instructions also tell Claude to follow a topic's tasks in order once it has
  material: Read from its resources (quoting the page, not memory), Build with `save_exercise` when it fits in code,
  then the own-words check. This second change landed the same day, still dated 2026-10-17, so Claude setup can't flag
  it; paste the instructions again by hand.

Dropped for good: the quiz, a one-click complete, actual-time tracking, and the "Claude" topic tag.

## What the screen does not do

Release 2 (above) added prerequisites, estimates, difficulty and resources, all written by Claude. What is still out, on
purpose or for want of data:

- **Blocked.** There is no blocked status; the four are Not started, In progress, Learned, Skipped. A prerequisite not
  yet learned shows as "Waiting on" in the panel, as advice: any topic can be opened and worked on.
- **Prerequisites on the graph** are drawn only between topics on the roadmap shown. A curve from a row above runs from
  the right edge of its card, so it can be a long diagonal; it passes under the cards.
- **A Now mark on the graph.** Lanes marks the current topic Now; the graph shows only its In progress icon.
- **Time spent.** Estimates are Claude's plan; nothing tracks actual time.
- **Back** leaves the page: opening a topic replaces the address entry rather than adding one.
- **A theme switch.** Every token has a dark value, but the app has no way to turn dark mode on yet.
