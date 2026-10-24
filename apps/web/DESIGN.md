---
name: Loots
description: Private developer workspace set like a printed university course catalog, built on the untouched shadcn default with every Loots token in its own section.
colors:
  oxblood: "oklch(0.36 0.095 22)"
  oxblood-soft: "oklch(0.92 0.03 22)"
  background: "oklch(0.987 0.006 84)"
  foreground: "oklch(0.215 0.018 42)"
  card: "oklch(0.987 0.006 84)"
  popover: "oklch(0.996 0.003 84)"
  primary: "oklch(0.24 0.02 40)"
  primary-foreground: "oklch(0.985 0.006 84)"
  secondary: "oklch(0.945 0.012 78)"
  muted: "oklch(0.945 0.012 78)"
  muted-foreground: "oklch(0.475 0.026 48)"
  border: "oklch(0.885 0.015 72)"
  ring: "oklch(0.52 0.11 24)"
  sidebar: "oklch(0.958 0.013 78)"
  sidebar-accent: "oklch(0.925 0.016 74)"
  rail-foreground: "oklch(0.93 0.025 70)"
  destructive: "oklch(0.577 0.245 27.325)"
  topic-learned: "oklch(0.5 0.12 152)"
  topic-learned-soft: "oklch(0.955 0.03 152)"
  topic-active: "oklch(0.46 0.13 25)"
  topic-active-soft: "oklch(0.945 0.028 22)"
  chapter-1: "oklch(0.45 0.07 150)"
  chapter-2: "oklch(0.45 0.08 258)"
  chapter-3: "oklch(0.47 0.09 48)"
  chapter-4: "oklch(0.45 0.06 190)"
  chapter-5: "oklch(0.45 0.08 318)"
  chapter-6: "oklch(0.47 0.08 85)"
typography:
  page-title:
    fontFamily: "Source Serif 4, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Source Serif 4, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  panel-title:
    fontFamily: "Source Serif 4, serif"
    fontSize: "1.25rem"
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  card-title:
    fontFamily: "Source Serif 4, serif"
    fontSize: "1rem"
    fontWeight: 500
  lane-title:
    fontFamily: "Source Serif 4, serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.375
  chapter-numeral:
    fontFamily: "Source Serif 4, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  step-numeral:
    fontFamily: "Source Serif 4, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
  setup-numeral:
    fontFamily: "Source Serif 4, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
  progress-count:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    fontFeature: "tnum"
  numeric:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum"
  graph-card-title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.375
  graph-card-meta:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
rounded:
  sm: "0.15rem"
  md: "0.2rem"
  lg: "0.25rem"
  xl: "0.35rem"
  3xl: "0.55rem"
  4xl: "0.65rem"
spacing:
  page-x-roadmap: "1rem / 1.75rem from md"
  page-x-list: "1.25rem / 2rem from sm / 2.5rem from lg"
  block-gap: "1.25rem"
  heading-rule-gap: "1.25rem / 1.5rem from md"
  numeral-margin-chapter: "2.25rem"
  numeral-margin-step: "1.625rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.4xl}"
    padding: "0 12px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.4xl}"
    padding: "0 12px"
    height: "36px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.4xl}"
    padding: "0 12px"
    height: "36px"
  input:
    backgroundColor: "{colors.border}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.3xl}"
    padding: "4px 12px"
    height: "36px"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.3xl}"
    padding: "2px 8px"
    height: "20px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  catalog-rail:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.rail-foreground}"
  status-chip-learned:
    backgroundColor: "{colors.topic-learned-soft}"
    textColor: "{colors.topic-learned}"
    rounded: "{rounded.3xl}"
  status-chip-active:
    backgroundColor: "{colors.topic-active-soft}"
    textColor: "{colors.topic-active}"
    rounded: "{rounded.3xl}"
---

# Design System: Loots

## Overview

**Creative North Star: "Course catalog"**

Loots reads like a printed university course catalog: each module is a section of the catalog, each roadmap chapter a course, each topic a numbered part of it. The ground is warm uncoated paper, the text is brown-black ink, and structure comes from hairline rules rather than fills or shadows. The one committed colour is the cover: a deep oxblood that wraps the shell (the module rail on desktop, the menu sheet and a thin strip on phones). Everything else stays paper and ink, so the colour that remains carries meaning: a topic's status, the item you picked, and which chapter a topic belongs to.

Density is moderate and work-focused: 14px body, 36px controls, flat printed sheets, short app-language labels. Headings are a text serif with optical sizes, set semibold over a hairline rule, the way a catalog sets a section head. The signature is the hanging numeral: chapter and step numbers sit in a left margin outside one shared text edge, as a catalog sets its course numbers. Personality lives in content (Claude's answers, lessons, term explanations), never in the frame. Loots shares tokens and interaction rules across modules, not layouts; each module keeps its own page padding.

The source of truth is code. `src/app/globals.css` keeps the shadcn default block exactly as `shadcn init` wrote it; every Loots value, including the Course catalog overrides of the shadcn neutrals, the `.catalog-rail` scope and the card rules, lives in the section after the comment "Loots: additions on top of the shadcn default". Primitives in `components/ui` stay untouched. `docs/architecture/design-system.md` and `docs/architecture/roadmap-ui.md` carry the long-form rules.

**Key Characteristics:**

- Warm paper ground and paper cards (the light card equals the background), brown-black ink, hairline borders; dark mode is warm brown-black, not grey.
- Oxblood is the shell colour and the In progress and selection colour; Learned stays green.
- Source Serif 4 headings, Public Sans body, Geist Mono for small counts and percentages.
- Chapter and step numerals hang in the margin; a hairline rule sits under every heading.
- Flat printed sheets: no shadow, no ring, one hairline edge, a small corner.
- Colour always paired with an icon and a word; full light and dark themes, every Loots token defined in both.

## Colors

Paper and ink with one oxblood cover, plus three small families of meaning colour.

### Primary

- **Oxblood Cover** (oxblood; dark `oklch(0.3 0.075 22)`): the shell. The desktop icon rail through `.catalog-rail`, the phone menu sheet (a `.catalog-rail` wrapper inside the sheet), and a 4px strip above the phone header. Rail text on oxblood measures 9.23:1 light, 11.42:1 dark.
- **Oxblood Wash** (oxblood-soft; dark `oklch(0.36 0.07 22)`): text selection (`::selection`), with foreground text.
- **Oxblood Ring** (ring, sidebar-ring; dark `oklch(0.7 0.1 24)`): focus rings and the text caret.

### Secondary

- **Ink Button** (primary; dark inverts to pale paper `oklch(0.92 0.014 78)`): the main button, the primary badge, the brand mark. Inside the rail the brand mark turns pale paper with oxblood text.

### Tertiary: meaning colours

- **In Progress Oxblood** (topic-active, with -soft fill): In progress status, and through `--selected` the item you picked. Measures 6.42:1 on its soft fill and 7.34:1 on paper (light), 6.97:1 on its soft fill (dark).
- **Learned Green** (topic-learned, with -soft fill): Learned status icon and chip.
- **Chapter One to Six** (chapter-1 to chapter-6, each with -soft fill): low-chroma inks (green, blue, amber, teal, plum, ochre) that tell chapters apart by roadmap position, at lightness about 0.45 in light and 0.8 in dark. They colour the hanging chapter numeral and the chapter bar.
- **Signal Red** (destructive): destructive actions and Gap badges, as a 10% tint with red text.

### Neutral

- **Uncoated Paper** (background, card; dark background `oklch(0.19 0.012 48)`, card `oklch(0.225 0.013 48)`): page and card surfaces. In light the card is the page; cards are told apart by their hairline, not by fill.
- **Brown-Black Ink** (foreground; dark `oklch(0.935 0.012 78)`): all body and heading text. 16.94:1 on paper light, 15.27:1 dark.
- **Paper Wash** (secondary, muted; dark `oklch(0.275 0.014 48)`): quiet fills, tracks, secondary buttons and badges, hover on ghost and outline controls.
- **Faded Ink** (muted-foreground; dark `oklch(0.74 0.022 66)`): helpers, labels, step numerals, Not started and Skipped. 6.49:1 on paper, 5.74:1 on muted, 5.40:1 on sidebar-accent (light); 6.43:1 on muted (dark).
- **Hairline** (border, input; dark ink at 12% and 16%): every rule, edge and divider.
- **Section Column Paper** (sidebar, sidebar-accent; dark `oklch(0.165 0.011 48)`): the module section column beside the rail and its active row.

### Named Rules

**The Cover Rule.** Oxblood belongs to the shell (rail, phone menu sheet, phone strip), to selection of text, and to the focus ring. It never fills a page block or a card. On the page it appears only as the In progress and selected colour.

**The Three Families Rule.** Status, selection and grouping colours never stand in for one another. A chapter colour never means a status; a status colour never decorates. Selection uses its own `--selected` name even though it shares the In progress hue today.

**The Icon And Word Rule.** No colour carries meaning alone. Every status has its own icon shape (filled check, half circle, dashed ring, skip arrow) and its word, in the accessible name too.

**The Accent Is A Menu Rule.** `accent` is the ink colour. Never put `bg-accent` on a hover or selected state outside a menu.

## Typography

**Display Font:** Source Serif 4, optical sizes on (`--font-heading`, via `next/font`)
**Body Font:** Public Sans (`--font-sans`)
**Label/Mono Font:** Geist Mono (`--font-mono`, tabular figures everywhere it is used)

**Character:** A bookish text serif for every heading and numeral that names a part of the catalog, over a plain, government-grade sans for reading; mono only for small figures that line up.

### Hierarchy

- **Page title** (Source Serif 4 semibold, 30px rising to 36px from 768px, line-height 1, tight tracking): one per page, over a hairline rule. Through `PageHeading`, and set the same way on Terms, Memory and Studio. The roadmap title is 24px rising to 30px.
- **Section title** (serif semibold, 24px; 20px in a side column): Memory section heads, each over its own hairline rule.
- **Panel title** (serif, 20px, tight): docked panel and sheet titles.
- **Card title** (serif medium, 16px): shadcn Card titles; the setup checklist heading uses the same face at semibold.
- **Lane title** (serif semibold, 15px): the chapter title on each roadmap lane card.
- **Chapter numeral** (serif semibold, 24px, tabular, in the chapter ink): "01", hung in the lane card's margin.
- **Step numeral** (serif regular, 14px, tabular, Faded Ink): "1.1", hung in the same margin as the chapter numeral.
- **Setup numeral** (serif semibold, 20px, tabular): setup step numbers; a finished step shows a check in Faded Ink.
- **Body** (regular, 14px; 16px in inputs on phones to avoid zoom): everything else.
- **Label** (semibold, 12px, Faded Ink): labels inside panels and progress strip cells.
- **Progress count** (Public Sans semibold, 20px, tabular figures): the "0 of 4" count in the progress strip. Public Sans, not Geist Mono, so a zero never shows a slash at display size.
- **Numeric** (Geist Mono 12px, tabular): percentages and small counts ("0%", "3 of 8" in a graph area).
- **Graph card title and meta** (13px medium; 11px regular): roadmap graph topic cards and their status word.

### Named Rules

**The Serif Names The Part Rule.** The serif sets anything that names or numbers a part of the catalog: titles, section heads, chapter and step numerals, setup steps. Body, controls, badges and labels stay Public Sans; a badge beside a serif title resets to the sans.

**The Mono For Small Figures Rule.** Geist Mono is for small figures that line up (percentages, counts in a strip or area header), never for decoration, and never for a large count, where its slashed zero reads as code.

## Layout

A sidebar shell (`workspace-shell.tsx`): the oxblood icon rail of modules, a paper section column from 1024px with the module name as a 16px serif heading, and the page in an inset paper panel (bordered, 8px margin from 768px) with a 56px header. Phones get the menu as a sheet in the cover colour, and a 4px oxblood strip above the header keeps the shell on screen.

Every page title sits over a hairline rule with 20px below it (24px from 768px) before the first block. Page padding is a module choice: the roadmap uses 16px, then 28px from 768px; Terms and Memory use 20px, 32px from 640px, 40px from 1024px. Page blocks sit 20px apart.

The hanging margin: a roadmap lane card is a two-column grid, a 36px margin column and a shared text column. The chapter numeral sits in the margin; the chapter title, meta and chapter bar share the text edge. Each topic row repeats the margin with a 26px step numeral, then the title, then the status icon closing the row at the right.

A picked item opens in `DockedPanel`: docked to the right from 1280px, a right sheet below. Grids beside a docked panel size with container queries (`@container`, `@lg:`), not window breakpoints. Every screen works at 390px with no sideways scroll.

### Named Rules

**The Hanging Numeral Rule.** In a list of numbered parts, the number hangs in a left margin outside the text edge; text never wraps under it. Exception, recorded: the roadmap graph's area header keeps "01" inline before the area title, because the graph is a computed canvas of node cards with no text column for a numeral to hang against.

## Elevation & Depth

Flat. Depth comes from the inset page panel, hairline rules and edges, and the oxblood rail against paper. Cards carry no shadow and no ring (the Loots section sets `box-shadow: none` on every `[data-slot="card"]`, overriding the primitive's default without editing it). Shadows belong only to layers that float: menus, popovers, dialogs, sheets and the term lookup popover (the primitives' own `shadow-md` to `shadow-2xl`). The one in-page exception is the roadmap graph's topic node cards (`shadow-xs`), so they lift off their tinted chapter area.

### Named Rules

**The Flat Panel Rule.** An in-page panel or card is paper with a 1px hairline edge and the panel corner, no shadow, no ring. If something casts a shadow, it floats.

**The Ruled Heading Rule.** Every heading that starts a block has a hairline rule under it: page titles, Memory section heads, and a card head with content below it. A record card (`data-entry`, as on Memory decisions and work logs) reads as one block and skips the rule.

## Shapes

Small, near-square corners derived from one base radius (`--radius: 0.25rem`, set in the Loots section; the scale in the default block derives from it). Cards and panels at 5.6px (`rounded-xl`), rows inside them at 4px (`rounded-lg`), inputs and badges at 8.8px (`rounded-3xl`), buttons at 10.4px (`rounded-4xl`). Nothing is a full pill except status legend badges at their small height. Radius comes from the scale; never restyle a primitive's corners at the call site.

## Components

### Buttons

Plain ink controls that say what they do.

- **Shape:** softly squared (10.4px), 36px tall (32px small, 40px large, 24px extra small).
- **Primary:** Ink Button fill with paper text, 12px side padding; one per header (for example Continue topic, Connect).
- **Hover / Focus:** fill drops to 80%; focus shows an oxblood ring border plus a 3px ring at 30%; pressed nudges down 1px.
- **Outline / Ghost / Secondary:** outline is a hairline control that fills with Paper Wash on hover; ghost has no border; secondary is Paper Wash. Destructive is a 10% red tint with red text.
- **Label:** a verb and an object ("Run tests", "Copy handoff").

### Chips (Badges and Status)

- **Style:** 20px badges, 12px medium Public Sans. Review states: Solid `default`, Partly there `secondary`, Gap `destructive`, others `outline`.
- **Status chip:** a soft fill in the status colour with the status icon and word (`StatusChip`); Not started and Skipped use muted. The status legend is a row of outline badges on card, each with icon and word.

### Cards / Containers

- **Corner Style:** 5.6px (`rounded-xl`).
- **Background:** card (paper in light, one step above the page in dark).
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px hairline; a card head with content below carries a hairline rule and 16px below it, unless the card is a record (`data-entry`).
- **Internal Padding:** the primitive's own; rows inside divide with `divide-y` or round at 4px.
- **Selected:** a bordered item takes `selectedSurface` (selected border at 55% and a 3px halo at 15%); a row in a divided list takes `selectedRow` (a full-strength 1px inset oxblood outline). Never a fill alone.

### Inputs / Fields

- **Style:** filled (8.8px corners), the hairline colour at 50% as fill, no visible border at rest, 36px tall.
- **Focus:** oxblood ring border and a 3px ring at 30%; caret in the ring colour.
- **Error / Disabled:** destructive border and ring; disabled at 50% opacity.

### Navigation

- **Rail:** the shadcn Sidebar, untouched, rescoped by `.catalog-rail`: oxblood ground, warm pale text, active item at 14% white, pale paper brand mark with oxblood text.
- **Section column:** paper, with the module name as a serif heading and Public Sans rows; the active row takes sidebar-accent.
- **Header:** breadcrumb, date, a search field labelled "Jump to a module…" with a `Kbd` Ctrl K hint, Sign out.
- **Phone:** the rail and sections move into a sheet wrapped in `.catalog-rail`; a 4px oxblood strip sits above the header.

### Lane Card (signature)

A chapter of the roadmap as a catalog entry: the serif chapter numeral in its chapter ink hangs in a 36px margin, title and "0 of 4 learned · area" share the text edge, then the chapter bar. Topic rows repeat the margin with a muted serif step numeral ("1.1"), the title, an optional "Now" chip, and the status icon closing the row.

### Docked Panel (signature)

The picked-item panel: docked beside the page from 1280px, a right sheet below. Badges, serif title, description, facts, body and an optional sticky footer. Escape closes it wherever focus is, unless a dialog or menu closes first. The picked item lives in the address.

### Progress Strip (signature)

A bordered strip of cells separated by 1px gaps on the border colour (`gap-px bg-border`, 5.6px corners): a label per cell, the progress count in Public Sans tabular figures, a progress bar with its percentage in mono, then Now, Next and roadmap totals. Roadmap only.

## Do's and Don'ts

### Do:

- **Do** build every control from `components/ui`; add a missing one from the registry and use it as shipped.
- **Do** add or change colours only in the Loots section of `globals.css`, with light and dark values and an `@theme inline` entry; restyle a primitive from there (as `[data-slot="card"]` and `.catalog-rail` do), never in the primitive.
- **Do** keep oxblood on the shell, text selection, the focus ring, and In progress and selected states.
- **Do** set titles, section heads and part numerals in the serif, semibold, with a hairline rule under each block heading.
- **Do** hang chapter and step numbers in a left margin outside the shared text edge.
- **Do** check 4.5:1 for text and 3:1 for an outline that is the only cue, in both themes, muted text included.
- **Do** pair every meaning colour with an icon and a word.
- **Do** write screen copy as names, actions and states, with no em dashes.

### Don't:

- **Don't** edit the shadcn default part of `globals.css` or a primitive in `components/ui` (the only edit is the font line in `sonner.tsx`).
- **Don't** put a label above a heading; the module name is already in the breadcrumb and the section column.
- **Don't** give a card a shadow or a ring; save shadows for floating layers.
- **Don't** fill a page block or card with oxblood, or use it as decoration.
- **Don't** use Geist Mono for a large count; use Public Sans tabular figures.
- **Don't** use hex colour classes or old Studio names (`bg-canvas`, `text-quiet`, `shadow-panel`, `font-display`, `status-*`, `tint`); `shadcn-default.test.ts` fails on them.
- **Don't** put `bg-accent` on hover or selected states outside a menu.
- **Don't** use a chapter colour for status, or a status colour for decoration.
- **Don't** add Google Fonts links; fonts load through `next/font`.
- **Don't** align layouts across modules as a sweep; layout differences are module choices.
