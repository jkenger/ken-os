---
name: Loots
description: A private developer workspace on a graphite console, light and dark from the system setting, with colour spent only on state.
colors:
  background: "oklch(0.975 0.002 265)"
  foreground: "oklch(0.22 0.005 265)"
  card: "oklch(0.995 0.001 265)"
  popover: "oklch(0.995 0.001 265)"
  primary: "oklch(0.22 0.005 265)"
  primary-foreground: "oklch(0.985 0.001 265)"
  secondary: "oklch(0.945 0.003 265)"
  muted: "oklch(0.945 0.003 265)"
  muted-foreground: "oklch(0.48 0.008 265)"
  accent: "oklch(0.925 0.004 265)"
  border: "oklch(0.885 0.004 265)"
  input: "oklch(0.885 0.004 265)"
  ring: "oklch(0.52 0.16 262)"
  destructive: "oklch(0.53 0.19 25)"
  sidebar: "oklch(0.955 0.003 265)"
  sidebar-accent: "oklch(0.915 0.004 265)"
  topic-learned: "oklch(0.5 0.13 150)"
  topic-learned-soft: "oklch(0.95 0.035 150)"
  topic-active: "oklch(0.5 0.11 70)"
  topic-active-soft: "oklch(0.955 0.04 85)"
  background-dark: "oklch(0.205 0.004 265)"
  foreground-dark: "oklch(0.93 0.004 100)"
  card-dark: "oklch(0.235 0.005 265)"
  popover-dark: "oklch(0.255 0.006 265)"
  primary-dark: "oklch(0.93 0.004 100)"
  primary-foreground-dark: "oklch(0.205 0.004 265)"
  secondary-dark: "oklch(0.275 0.006 265)"
  muted-dark: "oklch(0.275 0.006 265)"
  muted-foreground-dark: "oklch(0.74 0.006 100)"
  accent-dark: "oklch(0.3 0.007 265)"
  border-dark: "oklch(0.33 0.008 265)"
  input-dark: "oklch(0.33 0.008 265)"
  ring-dark: "oklch(0.76 0.11 262)"
  destructive-dark: "oklch(0.72 0.15 20)"
  sidebar-dark: "oklch(0.18 0.004 265)"
  sidebar-accent-dark: "oklch(0.275 0.006 265)"
  topic-learned-dark: "oklch(0.8 0.13 150)"
  topic-learned-soft-dark: "oklch(0.29 0.04 150)"
  topic-active-dark: "oklch(0.82 0.1 80)"
  topic-active-soft-dark: "oklch(0.3 0.04 80)"
typography:
  page-title:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  panel-title:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  progress-count:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
  panel-head:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  numeric:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  sm: "0.15rem"
  md: "0.2rem"
  lg: "0.25rem"
  xl: "0.35rem"
  3xl: "0.55rem"
  4xl: "0.65rem"
spacing:
  top-bar: "48px"
  page-x-roadmap: "1rem / 1.75rem from md"
  page-x-list: "1.25rem / 2rem from sm / 2.5rem from lg"
  block-gap: "1.25rem"
  seam: "1px"
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
  button-destructive-outline:
    textColor: "{colors.destructive}"
    rounded: "{rounded.4xl}"
    padding: "0 10px"
    height: "32px"
  input:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.3xl}"
    padding: "4px 12px"
    height: "36px"
  badge-now:
    textColor: "{colors.foreground}"
    rounded: "{rounded.3xl}"
    padding: "2px 8px"
    height: "20px"
  status-chip-learned:
    backgroundColor: "{colors.topic-learned-soft}"
    textColor: "{colors.topic-learned}"
    rounded: "{rounded.3xl}"
    height: "20px"
  status-chip-active:
    backgroundColor: "{colors.topic-active-soft}"
    textColor: "{colors.topic-active}"
    rounded: "{rounded.3xl}"
    height: "20px"
  panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
  row-picked:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.4xl}"
  chapter-mark:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.numeric}"
    rounded: "{rounded.md}"
    size: "24px"
---

# Design System: Loots

## Overview

**Creative North Star: "The Console"**

Loots is a graphite working surface in two themes. Light is a cool light grey ground with graphite ink; dark is a neutral graphite ground with near-white text. The theme follows the system setting and there is no switch. The icon rail, the section column and the page sit flush on one ground, split by 1px seams; panels sit one step off the ground and tile against each other with seams instead of shadows. Colour is spent only on state: green for Learned, amber for In progress, blue for the picked item and keyboard focus, red for anything destructive. Everything else is graphite.

Density is a working tool's: a 48px top bar, 14px body, 36px controls, 24px titles. Panels read as persistent instruments the owner returns to daily, not cards on a marketing page. Personality lives in content (Claude's answers, lessons, term explanations), never in the chrome. Loots shares tokens and interaction rules across modules, not layouts; each module keeps its own page padding.

The source of truth is code. The shadcn default block at the top of `src/app/globals.css` stays exactly as `shadcn init` wrote it; every Loots token lives after the "Loots: additions on top of the shadcn default" comment, and the console overrides the shadcn neutrals there, in the "Console (DESIGN.md)" block, rather than in the default block. The white SaaS card grid and the warm paper look are the confirmed rejections.

**Key Characteristics:**

- Cool graphite neutrals (hue 265, chroma under 0.01) in both themes, no brand hue.
- One ground, panels one step off it, 1px seams instead of shadows.
- Colour only on state: green, amber, blue, red; chapters are neutral.
- Geist for everything you read, Geist Mono for every number that lines up.
- Squared corners (4px panels), softly rounded controls.
- Theme from the system setting, set before first paint; every token defined in both themes.

## Colors

Two graphite registers with four state colours and nothing decorative.

### Primary

- **Graphite Ink** (primary; light `oklch(0.22 0.005 265)`, dark `oklch(0.93 0.004 100)`): the one main button in a header (for example Continue topic) and the logo mark. It is the text ink, so the main action reads as weight, not hue.

### Secondary: state colours

- **Console Blue** (ring; also `selected`): the picked item and keyboard focus, never a status. The picked lane row's 2px left edge, the picked graph card's border, the picked term's inset outline, lit graph edges, the focus ring, the caret and text selection (at 30%). 5.56:1 on card in light, 7.73:1 in dark.
- **Learned Green** (topic-learned, with -soft fill): Learned status icon and chip. Text on its soft fill: 4.94:1 light, 7.81:1 dark.
- **In Progress Amber** (topic-active, with -soft fill): In progress status icon and chip. Text on its soft fill: 5.39:1 light, 7.78:1 dark.
- **Signal Red** (destructive): destructive actions and Gap badges. As text on card: 5.74:1 light, 6.29:1 dark.

### Neutral

- **Ground** (background): the page and the flush shell behind every panel.
- **Panel** (card, popover): one step off the ground; a panel is told apart by its seam and this step, never by a shadow.
- **Ink** (foreground): all body and heading text. 16.11:1 on the ground in light, 14.58:1 in dark.
- **Wash** (secondary, muted): quiet fills, progress tracks, the picked row's fill, chapter tiles, search fields.
- **Graphite Grey** (muted-foreground): helpers, panel heads, topic numbers, counts, Not started and Skipped, unlit graph edges. 6.08:1 on the ground, 5.57:1 on muted and 5.08:1 on sidebar-accent in light; 7.77:1 on the ground and 6.44:1 on muted in dark.
- **Seam** (border, input): every 1px line and the colour showing through `gap-px` tiling. About 1.4:1 against its neighbours; decorative, never the only cue.
- **Rail** (sidebar, sidebar-accent): the icon rail and section column; the active section takes sidebar-accent.

Chapters have no colours of their own. `chapter-1` to `chapter-6` and their `-soft` fills still exist as tokens, but in both themes they alias `muted-foreground` and `muted`.

### Named Rules

**The State Only Rule.** Colour appears only where something has a state: Learned, In progress, picked or focused, destructive. A screen with nothing in those states is entirely graphite.

**The Three Families Rule.** Status (green, amber), the picked item and focus (blue) and chapters (number and name on a neutral tile) never stand in for one another. Blue never means a status; a status colour never marks the picked item; chapters are never told apart by hue.

**The Icon And Word Rule.** No colour carries meaning alone. Every status has its own icon shape (filled check, half circle, dashed ring, skip arrow) and its word, in the accessible name too.

**The Accent Is A Menu Rule.** `accent` belongs to menus and command items. In-page hover uses `muted`; a picked row uses the selected inset. Never put `bg-accent` on a hover or picked state outside a menu.

## Typography

**Display Font:** Geist (`--font-heading`, via `next/font`)
**Body Font:** Geist (`--font-sans`)
**Label/Mono Font:** Geist Mono (`--font-mono`, tabular figures on every `.font-mono`)

**Character:** One plain, engineered family for everything you read, with its mono twin only where figures must line up. Hierarchy comes from size, weight and the uppercase panel head, not from a second face.

### Hierarchy

- **Page title** (semibold, 24px, line-height 1.25, tight tracking): one per page, through `PageHeading` or the module's own `h1`, always over a 1px seam (`border-b`) with actions on the right. No label above it; the module name is already in the breadcrumb and the section column.
- **Panel title** (semibold, 20px): the DockedPanel and sheet titles.
- **Section title** (semibold, 18px, over a 1px seam): sections inside a long page (Memory's Handoff, Draft decisions); 16px in a side column.
- **Progress count** (semibold, 20px, Geist with tabular figures): the "0 of 4" count in the progress strip.
- **Body** (regular, 14px; 16px in inputs on phones to avoid zoom): everything else. Lane topic titles are body; the Now topic is semibold.
- **Label** (regular, 12px, muted): meta lines under a title ("Not started · React basics", "Added by Claude").
- **Panel head** (semibold, 11px, uppercase, 0.08em tracking, muted): the heading of its panel or strip cell (PROGRESS, NOW, NEXT, the lane's chapter name).
- **Numeric** (Geist Mono 12px, tabular): topic numbers (1.1), counts (0/4), percentages (0%), chapter numbers (01), saved dates in Terms.

### Named Rules

**The Panel Head Is The Heading Rule.** An uppercase tracked line is the heading of the panel it sits in, set with the `.panel-head` class. It is never a small label stacked above another heading.

**The Mono For Figures Rule.** Mono is for numbers that line up in a column, strip or list, never for words, decoration or code-flavoured styling.

## Layout

A flush console shell (`workspace-shell.tsx`): a 48px icon rail of modules, a 208px section column from 1024px, and the page, all on one ground, split by 1px seams (`border-r`, `border-l`). The top bar is 48px with a seam under it: breadcrumb left; date, Jump to a module (Ctrl K) and Sign out right. The section column's header is also 48px with a seam, so the two lines meet. Phones get a sheet menu from the top bar.

Every page opens with its title over a seam. Page padding is a module choice: the roadmap uses 16px, then 28px from 768px; Terms and Memory use 20px, 32px from 640px, 40px from 1024px. Page blocks sit 20px apart (`gap-5`).

Panels that belong together tile with 1px seams: the container takes the border colour as its fill and `gap-px`, each cell takes `bg-card`. Roadmap lanes wrap in an auto-fill grid of 248px minimum columns, 14px apart.

A picked item opens in `DockedPanel`: docked flush to the right from 1280px, full height under the top bar with a seam on its left; a right sheet below. Grids beside a docked panel size with container queries (`@container`, `@lg:`), not window breakpoints. Every screen works at 390px with no sideways scroll.

## Elevation & Depth

Flat. Depth is tonal and linear: the ground, a panel one lightness step off it, and 1px seams. No in-page surface casts a shadow; every shadcn Card is forced to a 1px seam with `box-shadow: none` by the `[data-slot="card"]` rule. Shadows belong only to layers that float over the page: menus, popovers, dialogs, sheets and toasts, using the primitives' own shadows.

### Named Rules

**The Flat Panel Rule.** An in-page panel is a card fill, a 1px seam and a 4px corner, with no shadow. If something casts a shadow, it floats.

**The Seam Rule.** Panels that belong together are split by a 1px seam (`gap-px` over the border colour), not by gaps and shadows. A seam is decoration at about 1.4:1; anything the owner must notice gets an icon, a word or a state colour as well.

## Shapes

Squared panels, softly rounded controls. The root radius is 4px (`--radius: 0.25rem`) and the whole shadcn scale derives from it. Panels, lanes, cards and the graph canvas use 4px (`rounded-lg`); buttons take 10.4px (`rounded-4xl`) and inputs and badges 8.8px (`rounded-3xl`) from the untouched primitives, which at 36px tall reads as a rounded rectangle, not a pill. Chapter tiles are 3.2px (`rounded-md`). Progress bars are the one full round. Never restyle a primitive's corners at the call site.

## Components

### Buttons

Quiet, rectangular-leaning controls that say what they do.

- **Shape:** softly rounded (10.4px), 36px tall (32px small, 40px large, 24px extra small).
- **Primary:** Graphite Ink fill, inverse text, 12px side padding; one per header.
- **Hover / Focus:** primary drops to 80%; outline and ghost fill with Wash; focus shows a blue border plus a 3px blue ring at 30%; pressed nudges down 1px.
- **Outline / Ghost / Secondary:** outline is a seam-bordered button on the ground (transparent in dark); ghost has no border; secondary is a Wash fill.
- **Destructive per item:** Remove (Terms) and Reject (Memory) are outline buttons in red (border at 40%, red text, 10% red tint on hover), set apart from their neighbours by 24px, at the end of their own item.
- **Label:** a verb and an object ("Continue topic", "Remove").

### Chips (Badges and Status)

- **Style:** 20px badges, 12px medium text, 8.8px corners.
- **Status chip:** a soft fill in the status colour with the status icon and word (`StatusChip`); Not started and Skipped use Wash.
- **Status legend:** outline badges on card, icon in its status colour, word in ink.
- **Now:** a neutral outline badge. It marks where you are, not a status, so it takes no state colour.

### Cards / Containers

- **Corner Style:** 4px.
- **Background:** card, one step off the ground.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px seam.
- **Internal Padding:** module choice; strip cells use 12px by 16px.
- **Lists inside:** rows split by seams (`divide-y`) or tiled with `gap-px`.

### Selection and focus

Picked and focused are drawn differently so they never read alike.

- **Picked row** (`selectedInset`): a Wash fill and a 2px Console Blue edge on the left. Lane topics.
- **Picked bordered item** (`selectedSurface`): the item's border in blue at 70% plus a 1px blue ring at 40%. Graph topic cards.
- **Picked row in a seamed list** (`selectedRow`): a full-strength 1px blue inset outline, rounded at the list's ends. Terms.
- **Focus:** the primitives' blue border and 3px ring around the whole control.

### Inputs / Fields

- **Style:** Wash fill, 8.8px corners, no visible border at rest, 36px tall, search icon at the start.
- **Focus:** blue border and a 3px blue ring at 30%.
- **Error / Disabled:** red border and ring; disabled at 50%.

### Navigation

A 48px icon rail of module icons (32px targets, active on sidebar-accent), a section column with the module name in Geist semibold 16px over a seam and its sections as a list, and the top bar breadcrumb. The page is never a floating inset; it sits flush beside the column.

### Docked Panel (signature)

The picked-item panel: docked flush beside the page from 1280px (384px wide, card fill, seam on the left, sticky under the top bar), a right sheet below. Badges, a 20px semibold title that takes focus once loaded, description, facts, body and an optional sticky footer. Escape closes it wherever focus is, unless a dialog or menu closes first. The picked item lives in the address; it opens when something is picked, not by default.

### Progress Strip (signature)

A row of cells tiled with 1px seams (`gap-px bg-border`), each with a panel head (PROGRESS, NOW, NEXT, ROADMAP) as its heading. The count is Geist 20px semibold with tabular figures; the percentage is mono. Columns follow the strip's own width with container queries: one, two from `@lg`, four from `@3xl`.

### Roadmap Lane (signature)

One panel per chapter. Its head is a neutral 24px chapter tile with the mono number (01), the chapter name as a panel head, and the mono count (0/4) on the right; a muted meta line and a thin progress bar sit under it. Topics are rows reading mono number (1.1), title, an optional Now badge, then the status icon, so the icons line up down the lane.

## Do's and Don'ts

### Do:

- **Do** build every control from `components/ui`; add a missing one from the registry and use it as shipped.
- **Do** add new colours as role tokens in the Loots section of `globals.css`, with light and dark values and an `@theme inline` entry.
- **Do** spend colour only on state: green Learned, amber In progress, blue for the picked item and focus, red for destructive.
- **Do** pair every state colour with an icon and a word.
- **Do** tile related panels with 1px seams (`gap-px` on the border colour) and keep every in-page panel shadowless.
- **Do** set every page title at 24px semibold over a 1px seam, with no label above it.
- **Do** use `.panel-head` (11px semibold uppercase, 0.08em) as the heading of its panel and nowhere else.
- **Do** set topic numbers, counts, percentages and dates in Geist Mono.
- **Do** mark a picked row with the selected inset (Wash fill plus a 2px blue left edge), never with the focus ring's look.
- **Do** measure 4.5:1 for text and 3:1 for an outline that is the only cue, in both themes separately.
- **Do** write screen copy as names, actions and states, with no em dashes.

### Don't:

- **Don't** edit the shadcn default part of `globals.css` or a primitive in `components/ui` (the only edit is the font line in `sonner.tsx`).
- **Don't** use hex colour classes or old Studio names (`bg-canvas`, `text-quiet`, `shadow-panel`, `font-display`, `status-*`, `tint`); `shadcn-default.test.ts` fails on them.
- **Don't** give chapters a hue; they are told apart by number and name on a neutral tile.
- **Don't** use blue for a status or a status colour for the picked item; the Now badge stays neutral.
- **Don't** put `bg-accent` on hover or picked states outside a menu.
- **Don't** put a small uppercase label above a heading; the module name already lives in the breadcrumb.
- **Don't** add a theme switch; the theme follows the system setting.
- **Don't** let a seam be the only cue for anything.
- **Don't** add Google Fonts links; fonts load through `next/font`.
- **Don't** align layouts across modules as a sweep; layout differences are module choices.
