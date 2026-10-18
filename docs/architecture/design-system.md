# Loots design foundations

Status: first milestone closed 18 Oct 2026. Validated on two screens: the Engineering roadmap (`roadmap-ui.md`), where
it came from, and Terms, where it was tried without changing the layout (PR #115). The lesson: Loots shares
**interaction rules and tokens**, not layouts. This page is the contract for feature work, not a component library.
Build features first, and move a pattern in here only when a second real screen needs it. The base is shadcn's default
setup (`design-system-shadcn-setup.md`); Loots adds to it and never edits it.

## Shared rules

Every module follows these.

### Tokens

Loots tokens live in the "Loots" section at the end of `apps/web/src/app/globals.css`, each with a light and a dark
value and an `@theme inline` entry, so they are Tailwind classes (`text-topic-active`, `ring-selected`).

| Role             | Token                                                     | Use                                                                        |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Surfaces         | shadcn `background`, `card`, `muted`                      | Page, panels and cards, quiet fills and tracks                             |
| Borders and text | shadcn `border`, `ring`, `foreground`, `muted-foreground` | Every line and every word                                                  |
| Selection        | `selected`                                                | The picked item's outline or ring, and lines touching it                   |
| Topic status     | `topic-learned`, `topic-active`, each with `-soft`        | Learned and In progress icons and chips. Not started and Skipped use muted |

`selected` points at `topic-active` today, so selection and In progress share a hue. Components name `selected`, so
the two can be split without touching status.

### Surfaces

A panel or card is `rounded-xl border bg-card` with no shadow (`panel` in `components/surfaces.ts`). Rows inside are
`rounded-lg`, or divided with `divide-y` in a list. Quiet fills are `bg-muted`.

### Selection

- The picked item gets an outline in `selected` on a card surface, never a fill alone.
- A card or button with its own border takes `selectedSurface`: a soft border and halo. A row in a divided `panel` list
  takes `selectedRow`: an inset outline at full strength. Both are in `components/surfaces.ts`.
- The state is also in the markup: `aria-pressed` on a toggle button (roadmap topics), `aria-current` on the item a
  link opened (Terms).
- When the outline is the only visual cue, it must reach 3:1 against the card. `selectedRow` does (6.7:1 light, 8.9:1
  dark). The roadmap's softer `selectedSurface` is backed by `aria-pressed` and the topic panel it opens.
- Keep what was picked in the address when a link or a reload should reopen it (`?topic=` on the roadmap, `#term-` on
  Terms).

### Accessibility

- Status is never colour alone: each state has its own icon shape and its word, in the accessible name too.
- Text reaches 4.5:1 in both themes.
- Controls come from `components/ui`, which bring focus rings and keyboard handling; `shadcn-primitives.test.ts` fails
  on a raw control or a hand-built widget.
- A panel that docks closes on Escape wherever focus is, unless Escape is closing a dialog or menu first.

### Width

Size grids inside a page that can sit beside a docked panel with container queries (`@container`, `@lg:`), not window
breakpoints, since the panel takes width the window doesn't know about. Every screen works at 390px with no sideways
scroll.

### Type details

Section labels `text-xs font-semibold text-muted-foreground`; numbers that line up `font-mono text-xs`; headings
`font-heading`.

## Module choices

Each module decides these for itself. Match the module you are in; change one only as part of real work on that page,
never as a sweep.

| Choice           | Roadmap                                        | Terms, Memory                 |
| ---------------- | ---------------------------------------------- | ----------------------------- |
| Page padding     | `px-4 md:px-7`                                 | `px-5 sm:px-8 lg:px-10`       |
| Page title       | `font-heading text-2xl md:text-3xl` bold       | `text-3xl md:text-4xl` bold   |
| Detail layout    | A docked panel or sheet for the picked topic   | Everything inline in the list |
| Grouping colours | `chapter-1` to `chapter-6` by roadmap position | None                          |
| Progress display | A strip of cells (`gap-px bg-border`)          | None                          |

Tried on Terms and not used there: `DockedPanel` (a panel would be a redesign) and the status set (terms have no
lifecycle). Both stay proven on the roadmap only. The chapter accents become a general role (say `category`) only when
a second module needs ordered groups, keeping their values.

## Shared components

| Component                                                 | Where                                                   | States and props                                                                                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panel`, `selectedSurface`, `selectedRow`                 | `components/surfaces.ts`                                | Class strings for a panel, a selected bordered item and a selected list row                                                                                                                                         |
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
3. Keep status, selection and grouping colours apart, and keep an icon or word next to every colour. A state shown
   only by an outline needs 3:1 against its surface.
4. Share a component when a second screen needs the same anatomy and behaviour, not before. Move it out of its feature
   folder then, and add it here. A layout difference between modules is not a reason to share or to align.
5. Keep layout maths in pure, tested functions next to the feature, and keep components thin.
