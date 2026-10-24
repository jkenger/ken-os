---
name: Loots
description: Private developer workspace on the shadcn default, with a few Loots tokens for status, selection and chapters.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.147 0.004 49.3)"
  card: "oklch(1 0 0)"
  primary: "oklch(0.214 0.009 43.1)"
  primary-foreground: "oklch(0.986 0.002 67.8)"
  secondary: "oklch(0.96 0.002 17.2)"
  muted: "oklch(0.96 0.002 17.2)"
  muted-foreground: "oklch(0.547 0.021 43.1)"
  border: "oklch(0.922 0.005 34.3)"
  ring: "oklch(0.714 0.014 41.2)"
  destructive: "oklch(0.577 0.245 27.325)"
  topic-learned: "oklch(0.5 0.12 152)"
  topic-learned-soft: "oklch(0.955 0.03 152)"
  topic-active: "oklch(0.48 0.14 262)"
  topic-active-soft: "oklch(0.955 0.022 262)"
  chapter-1: "oklch(0.45 0.07 150)"
  chapter-2: "oklch(0.45 0.08 258)"
  chapter-3: "oklch(0.47 0.09 48)"
  chapter-4: "oklch(0.45 0.06 190)"
  chapter-5: "oklch(0.45 0.08 318)"
  chapter-6: "oklch(0.47 0.08 85)"
typography:
  page-title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  panel-title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
  body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
  eyebrow:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.05em"
  numeric:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
  lane-title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.375
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
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  3xl: "1.375rem"
  4xl: "1.625rem"
spacing:
  page-x-roadmap: "1rem / 1.75rem from md"
  page-x-list: "1.25rem / 2rem from sm / 2.5rem from lg"
  block-gap: "1.25rem"
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
    backgroundColor: "{colors.muted}"
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
  panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
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

**Creative North Star: "The Quiet Workbench"**

Loots is one person's bench, not a storefront. The frame is the untouched shadcn Luma default on a warm taupe neutral, kept on purpose as the base to build on, and Loots adds to it one deliberate change at a time. The tools stay quiet and in the same place every visit; colour is spent only where it carries meaning: a topic's status, the item you picked, and which chapter a topic belongs to.

Density is moderate and work-focused: small body text (14px), compact controls (36px), bordered panels without shadows, and short app-language labels. Personality lives in content (Claude's answers, lessons, term explanations), never in the chrome. Loots shares interaction rules and tokens across modules, not layouts; each module keeps its own page padding and title size.

The source of truth is code: shadcn tokens in `src/app/globals.css` (left exactly as `shadcn init` wrote them) and the labelled Loots section at its end. `docs/architecture/design-system.md` and `docs/architecture/roadmap-ui.md` carry the full rules.

**Key Characteristics:**

- Warm near-black and off-white neutrals (taupe base, hue ~40), no brand accent hue.
- Flat bordered panels; shadows only on floating layers.
- Pill-shaped controls (Luma preset) against softly rounded panels.
- Colour always paired with an icon and a word.
- Full light and dark themes, every Loots token defined in both.

## Colors

A warm, almost colourless neutral base, with three small families of meaning colour layered on top.

### Primary

- **Warm Ink** (primary): the main button, the primary badge, and the dark mark in the sidebar. Inverts to a pale stone in dark mode.

### Neutral

- **Paper** (background, card): page and panel surfaces; panels are told apart by border, not by fill.
- **Charcoal Ink** (foreground): all body and heading text.
- **Stone Wash** (secondary, muted): quiet fills, tracks, secondary buttons and badges, hover on ghost and outline controls.
- **Taupe Grey** (muted-foreground): helpers, section labels, Not started and Skipped status. Reaches about 4.8:1 on white; recheck it on any new dark surface.
- **Hairline** (border): every line and divider.
- **Focus Taupe** (ring): focus rings at 30% to 50%.
- **Signal Red** (destructive): destructive actions and Gap badges, used as a 10% tint with red text.

### Tertiary: meaning colours

- **Learned Green** (topic-learned, with -soft fill): Learned status icon and chip.
- **In Progress Blue** (topic-active, with -soft fill): In progress status only. `selected` points at the text ink (foreground) since 24 Oct 2026.
- **Chapter One to Six** (chapter-1 to chapter-6, each with -soft fill): low-chroma mid tones (green, blue, amber, teal, plum, ochre) that tell chapters apart by roadmap position. Lightness ~0.45 in light mode and ~0.8 in dark.

### Named Rules

**The Three Families Rule.** Status, selection and grouping colours never stand in for one another. A chapter colour never means a status; a status colour never decorates.

**The Icon And Word Rule.** No colour carries meaning alone. Every status has its own icon shape (filled check, half circle, dashed ring, skip arrow) and its word, in the accessible name too.

**The Accent Is A Menu Rule.** In Luma, `accent` is near-black. Never put `bg-accent` on a hover or selected state outside a menu.

## Typography

**Display Font:** DM Sans (`--font-heading`, via `next/font`)
**Body Font:** Public Sans (`--font-sans`)
**Label/Mono Font:** Geist Mono (`--font-mono`)

**Character:** A slightly rounder geometric heading face over a plain, government-grade sans for reading; mono only where numbers must line up.

### Hierarchy

- **Page title** (bold, 30px rising to 36px on wide screens in list modules; 24px to 30px on the roadmap, line-height 1, tight tracking): one per page, through `PageHeading`.
- **Panel title** (bold, 20px): docked panel and sheet titles.
- **Card title** (medium, 16px, heading font): shadcn Card titles.
- **Lane title** (semibold, 15px, heading font): the chapter title on each roadmap lane card. Roadmap only.
- **Graph card title** (medium, 13px, up to two lines): topic cards in the roadmap graph. Roadmap only.
- **Graph card meta** (regular, 11px, muted; the area heading is semibold, uppercase, wide tracking): the status word on a graph card and the chapter heading above each area. Roadmap only.
- **Body** (regular, 14px; 16px in inputs on phones to avoid zoom): everything else.
- **Label** (semibold, 12px, muted-foreground): section labels inside panels.
- **Eyebrow** (semibold, 12px, uppercase, wide tracking, muted): the module name above a page title.
- **Numeric** (Geist Mono 12px): chapter numbers, percentages, step numbers, counts.

### Named Rules

**The Mono For Alignment Rule.** Mono is for numbers that line up in a column or strip, never for decoration or code-flavoured styling.

## Layout

A sidebar shell (`workspace-shell.tsx`): an icon rail of modules, a module section list from 1024px, and the page in an inset panel (rounded, bordered, 8px margin from 768px) with a 56px header. Phones get a sheet menu from the header.

Page padding is a module choice: the roadmap uses 16px, then 28px from 768px; Terms and Memory use 20px, 32px from 640px, 40px from 1024px. Page blocks sit 20px apart (`gap-5`).

A picked item opens in `DockedPanel`: docked to the right from 1280px, a right sheet below. Grids that sit beside a docked panel size with container queries (`@container`, `@lg:`), not window breakpoints. Every screen works at 390px with no sideways scroll.

## Elevation & Depth

Flat by default. Panels and cards are bordered card surfaces with no shadow; depth comes from the inset page panel, hairline borders and quiet `muted` fills. Shadows belong only to layers that float: menus, popovers, dialogs and sheets (the primitives' own `shadow-md` to `shadow-2xl`). The one in-page exception is roadmap graph topic cards (`shadow-xs`), so they lift off their tinted chapter area.

### Named Rules

**The Flat Panel Rule.** An in-page panel is `rounded-xl border bg-card` with no shadow. If something casts a shadow, it floats.

## Shapes

Two corner families. Controls are pills: buttons and the shadcn Card at 26px (`rounded-4xl`), inputs and badges at 22px (`rounded-3xl`), from the Luma preset. Loots panels and strips are softly rounded at 14px (`rounded-xl`), rows inside them at 10px (`rounded-lg`), and small sidebar marks at 10px. Radius is left to the preset; never restyle a primitive's corners at the call site.

## Components

### Buttons

Quiet pills that say what they do.

- **Shape:** full pill (26px radius), 36px tall (32px small, 40px large, 24px extra small).
- **Primary:** Warm Ink fill, near-white text, 12px side padding; one per header (for example Continue topic).
- **Hover / Focus:** fill drops to 80%; focus shows a ring-coloured border plus a 3px ring at 30%; pressed nudges down 1px.
- **Outline / Ghost / Secondary:** outline is a hairline pill that fills with Stone Wash on hover; ghost has no border; secondary is a Stone Wash pill. Destructive is a 10% red tint with red text.
- **Label:** a verb and an object ("Run tests", "Add skill").

### Chips (Badges and Status)

- **Style:** 20px pills, 12px medium text. Badge variants carry review states: Solid `default`, Partly there `secondary`, Gap `destructive`, others `outline`.
- **Status chip:** a soft fill in the status colour with the status icon and word (`StatusChip`); Not started and Skipped use muted.

### Cards / Containers

- **Corner Style:** 14px (`panel`).
- **Background:** card (white / dark warm grey).
- **Shadow Strategy:** none (see Elevation).
- **Border:** hairline.
- **Internal Padding:** module choice; rows inside are divided with `divide-y` or rounded 10px.
- **Selected:** a bordered item takes `selectedSurface` (selected border at 55% and a 3px halo at 15%); a row in a divided list takes `selectedRow` (a full-strength 1px inset outline, at least 3:1 against the card). Never a fill alone.

### Inputs / Fields

- **Style:** filled pill (22px radius), `input` at 50% as the fill, no visible border at rest, 36px tall.
- **Focus:** ring-coloured border and a 3px ring at 30%.
- **Error / Disabled:** destructive border and ring; disabled at 50% opacity.

### Navigation

Sidebar icon rail with module marks (32px rounded squares), a section list with semibold heading, and a header search field labelled "Jump to a module…" with a `Kbd` Ctrl K hint. Active items use the sidebar's own states.

### Docked Panel (signature)

The picked-item panel: docked beside the page from 1280px, a right sheet below. Badges, title, description, facts, body and an optional sticky footer. Escape closes it wherever focus is, unless a dialog or menu closes first. The picked item lives in the address.

### Progress Strip (signature)

A bordered strip of cells separated by 1px gaps on the border colour (`gap-px bg-border`): counts and percentages in mono. Roadmap only for now.

## Do's and Don'ts

### Do:

- **Do** build every control from `components/ui`; add a missing one from the registry and use it as shipped.
- **Do** add new colours as role tokens in the Loots section of `globals.css`, with light and dark values and an `@theme inline` entry.
- **Do** check 4.5:1 for text and 3:1 for an outline that is the only cue, in both themes.
- **Do** pair every meaning colour with an icon and a word.
- **Do** keep panels flat and bordered; save shadows for floating layers.
- **Do** write screen copy as names, actions and states, with no em dashes.

### Don't:

- **Don't** edit the shadcn default part of `globals.css` or a primitive in `components/ui` (the only edit is the font line in `sonner.tsx`).
- **Don't** use hex colour classes or old Studio names (`bg-canvas`, `text-quiet`, `shadow-panel`, `font-display`, `status-*`, `tint`); `shadcn-default.test.ts` fails on them.
- **Don't** put `bg-accent` on hover or selected states outside a menu.
- **Don't** use a chapter colour for status, or a status colour for decoration.
- **Don't** add Google Fonts links; fonts load through `next/font`.
- **Don't** align layouts across modules as a sweep; layout differences are module choices.
