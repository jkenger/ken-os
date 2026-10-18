# Loots design foundations

Status: started 18 Oct 2026 from the Engineering roadmap, the first screen built and reviewed as a reference
(`roadmap-ui.md`). This page lists what is shared today and the rules for adding more. It is not a component catalogue:
everything here is something a real screen already uses. The base is shadcn's default setup
(`design-system-shadcn-setup.md`); Loots adds to it and never edits it.

## Tokens

Loots tokens live in the "Loots" section at the end of `apps/web/src/app/globals.css`, each with a light and a dark
value and an `@theme inline` entry, so they are Tailwind classes (`text-topic-active`, `bg-chapter-2-soft`).

| Role             | Token                                                     | Use                                                                        |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Surfaces         | shadcn `background`, `card`, `muted`                      | Page, panels and cards, quiet fills and tracks                             |
| Borders and text | shadcn `border`, `ring`, `foreground`, `muted-foreground` | Every line and every word; graph lines use `ring`                          |
| Topic status     | `topic-learned`, `topic-active`, each with `-soft`        | Learned and In progress icons and chips. Not started and Skipped use muted |
| Selection        | `selected`                                                | The picked item: its border and ring, and lines touching it                |
| Chapter accents  | `chapter-1` to `chapter-6`, each with `-soft`             | Telling chapters apart, by roadmap position (`chapterTone`)                |

`selected` points at `topic-active` today, so selection and In progress share a hue. Components name `selected`, so
the two can be split without touching status.

The chapter accents stay Engineering's: no other screen numbers its groups yet. Rename them to a general role (say
`category`) when a second module needs ordered groups, keeping the values so the roadmap looks the same.

## Shared conventions

- **Panel:** `rounded-xl border bg-card`, no shadow (`panel` in `components/engineering/kit.tsx`). Rows inside are
  `rounded-lg`.
- **Selected item:** `selectedSurface` in `kit.tsx`: a soft `selected` border and ring on a card surface, never a fill
  alone, with the item's own icon and word left to carry its state.
- **Strip of cells:** cells on `bg-card` in a grid with `gap-px bg-border` inside a rounded border, so the gaps draw
  the lines (`RoadmapProgress`, `RoadmapSummary`).
- **Type:** headings `font-heading` (page title `text-2xl md:text-3xl` bold, panel title `text-xl` bold); section labels
  `text-xs font-semibold text-muted-foreground`; numbers that line up `font-mono text-xs`.
- **Spacing:** page `px-4 md:px-7`, `gap-5` between page blocks.
- **Width:** size grids inside a page that can sit beside a docked panel with container queries (`@container`, `@lg:`),
  not window breakpoints, since the panel takes width the window doesn't know about.
- **Status:** never colour alone. Each state has its own icon shape and its word, in the accessible name too.

## Shared components

| Component                                                 | Where                                                   | States and props                                                                                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DockedPanel`, `useDocked`                                | `components/docked-panel.tsx`                           | Docked beside the page from 1280px, a right Sheet below. Open or closed; Escape and the close button close it. Badges, title, description (or a screen-reader fallback), facts, body with an optional sticky footer |
| `StatusIcon`, `StatusLabel`, `StatusChip`, `StatusLegend` | `components/engineering/roadmap/status.tsx`             | Not started, In progress, Learned, Skipped: icon only, icon and word, soft chip, the four as pills                                                                                                                  |
| `ChapterMark`, `ChapterBar`, `chapterClasses`             | `components/engineering/roadmap/chapter-mark.tsx`       | A numbered tile, a progress bar and accent classes for chapter 1 to 6 (then repeating)                                                                                                                              |
| `PageHeading`, `Pill`                                     | `components/page-heading.tsx`, `components/ui/pill.tsx` | The module page heading; a short status label on the Badge variants (exercise results)                                                                                                                              |

The status set describes a topic's status (`TopicStatus` in `@ken-os/domain`). Another module with its own lifecycle
reuses the pattern (icon shape plus word, soft chip, legend) with its own states, rather than mapping onto topic states.

## shadcn primitives to use directly

Everything in `components/ui`: Button, Badge, Tabs, Sheet, Dialog, Command and CommandDialog, ToggleGroup, Progress,
Collapsible, Tooltip, DropdownMenu, Input, InputGroup, Textarea, Skeleton and the toaster. Use them as shipped; change
a look with a variant or a class at the call site, or in one Loots wrapper, never by editing the primitive.
`shadcn-primitives.test.ts` fails on a raw control or a hand-built widget.

## Patterns worth reusing

- **Docked-or-sheet panel** for the item you picked: `DockedPanel`.
- **Quick find:** a CommandDialog opened by a field and by `/`, ignoring the key while typing in a field, leaving
  Ctrl or Cmd + K to the module search (`TopicFind`). Copy the pattern; the component is topic-specific.
- **Folded checklist:** a setup list that opens in full until its main step is done, then folds to one row with the
  next step's action (`SetupChecklist`).
- **Selection in the address:** one `selected` state drives every view and the URL, so a link or reload reopens it.

## Engineering only

These hold roadmap behaviour and stay in `components/engineering/roadmap/` and `features/engineering-lab/`:
`RoadmapGraph` and its nodes, `roadmap-layout.ts`, `RoadmapLanes`, `TopicSheet` and its content (tasks, criteria,
prerequisites, review), `RoadmapProgress`, `RoadmapSummary`, `RoadmapSwitcher`, `TopicFind`, `SetupChecklist` and
`ClaudeSetup`. So do the graph's one-off values: the `text-[0.6875rem]` and `text-[0.8125rem]` card sizes, the
uppercase area headings, the graph height, the cards' `shadow-xs` and the `/60` area tint.

## Adding a token or component

1. Use a shadcn token or primitive if one fits.
2. A new colour is a role, not a hue: name it for what it means, add light and dark values and an `@theme inline` entry
   in the Loots section, and check 4.5:1 text contrast in both themes. No hex classes; the guard test blocks old
   Studio names (`status-*`, `tint`, `canvas` and others).
3. Keep status, selection and grouping colours apart, and keep an icon or word next to every colour.
4. Share a component when a second screen needs the same anatomy and behaviour, not before. Move it out of its feature
   folder then, and add it here.
5. Keep layout maths in pure, tested functions next to the feature, and keep components thin.
