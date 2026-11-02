# Design: mockup brief

Status: drafted 31 Oct 2026, not yet drawn. Spec: [design.md](../architecture/design.md). Design is a new product,
built from the ground up, not a feature inside Design Studio; this brief does not reuse
[design-studio.md](design-studio.md)'s frames, only its format.

## Handoff: what to return

This brief is written for another agent to draw from. When the mockups are done, hand back all of the following. A
frame that can't be drawn as written still comes back, with a note saying why.

1. **The design canvas link**: one canvas with an artboard per frame, named by its frame id, at the widths in Ground
   rules. The canvas is the reference for building. Do not export or render PNGs; that is only for an outside agent
   that cannot open the canvas.
2. **A README** in project files, with:
   - **Frames**: a table of every frame id, its artboard, and Done, Changed or Skipped.
   - **Changes from this brief**: each place the copy, layout or behaviour differs from what is written here, and why.
   - **Proposals**: any new token or component the frames needed. None is fine.
   - **Open questions**: decisions the owner has to make before code starts, each with the option you recommend.
3. **A short summary** in the reply that hands the work back: which frames to look at first, and the open questions.

Do not change code, `globals.css` or this brief. Changes to the brief go under "Changes from this brief"; the owner
folds the agreed ones in.

## Ground rules for every frame

- **Look:** Loots as it is. shadcn's default setup plus the Loots tokens and shared rules in
  [design-system.md](../architecture/design-system.md). Build from `components/ui` (Button, Badge, Input,
  NativeSelect, Tabs, Dialog, Tooltip) and the shared `DockedPanel`. Anything that needs a new token or component is
  named as a proposal, not slipped in.
- **Words:** app language. Names, actions and states. No sentences in the frame, no taglines, no em dashes, no emoji.
- **Sizes:** desktop at 1440 and 1280 wide, tablet at 1024, phone at 390. Light theme, plus the dark frame named
  below.
- **Real data:** a frame named "Desktop / New" at 1440x900 and a frame named "Phone / Posting" at 390 wide, each
  holding real `components/ui` components (Button, Badge, Input), not placeholder boxes. No lorem ipsum.
- **Design shows components; it is not one.** A placed component on the canvas is the real thing, live. Design's own
  chrome (frame list, palette, inspector) uses the same primitives as everything else in Loots, so the boundary
  between "the tool" and "the thing being composed" stays clear.

## Layout

```text
┌ app sidebar ┐┌ Design ───────────────────────────────────────────── 2 frames · Add frame ┐
│ (icons only ││┌ Frames ──┐┌ Palette ──┐┌ toolbar: Add component · Fit · − 100% + ┐┌ Inspector ─┐│
│  on /design)│││ Desktop/ ││ Find…     ││                                          ││ Button     ││
│             │││  New  •  ││ Button    ││  ┌ Desktop / New ─ 1440 x 900 ─────┐     ││ x 240 y 80 ││
│             │││ Phone/   ││ Badge     ││  │  [Button] [Badge]               │     ││ w 96 h 36  ││
│             │││  Posting ││ Input     ││  └──────────────────────────────────┘     ││ Variant ▾  ││
│             │││ + Add    ││ …         ││                                          ││ Text …     ││
└─────────────┘└└──────────┘└───────────┘└──────────────────────────────────────────┘└────────────┘┘
```

- **App sidebar** folds to icons on `/design`, the same proposal Design Studio already made for `/studio`.
- **Frames panel** (far left, about 200px): every named frame, a dot on the one open, **Add frame**.
- **Palette** (left, about 240px): the component picker, search only, no library/installed/changed filters (Design
  has one catalogue, not several libraries).
- **Canvas** (centre, the rest): React Flow, the open frame as a resizable area holding its placed components.
- **Inspector** (right, about 320px): the selected placement's position, size, variant and text, or nothing selected.
- **Header row:** page title "Design", a frame count, **Add frame**.

## Frames

### A. Workspace

| Frame | State                                        | Copy                                                          |
| ----- | -------------------------------------------- | ------------------------------------------------------------- |
| A1    | First open, no frames yet                    | Title "Design"; empty canvas, "No frames yet" / **Add frame** |
| A2    | One frame open, nothing placed               | Frame name in the Frames panel and the canvas header          |
| A3    | A frame with components placed, one selected | Inspector shows the selection                                 |
| A4    | Dark frame of A3                             | Same                                                          |

### B. Frames panel

| Frame | State                                                                                            | Copy                                              |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| B1    | Default: a list of named frames, each with its size in small type, the open one marked           | "1440 × 900"                                      |
| B2    | **Add frame**: a small Dialog, name and a size choice (Desktop 1440×900, Phone 390 wide, Custom) | Title "Add frame"; "Name", "Size"; button **Add** |
| B3    | A frame renamed in place (double-click or an inline edit action)                                 |                                                   |

### C. Palette

| Frame | State                                                                                              | Copy                  |
| ----- | -------------------------------------------------------------------------------------------------- | --------------------- |
| C1    | Default: search field, then every component A to Z, one line each with an icon                     | "Find a component"    |
| C2    | No match                                                                                           | "No components match" |
| C3    | Clicking or dragging a row adds the component to the open frame at a default size, centred in view |                       |

### D. Canvas

| Frame | State                                                                                                                     | Copy          |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ------------- |
| D1    | The open frame as a labelled, resizable area with a visible edge, its name in a small header tab above it                 | Frame name    |
| D2    | A placed component: the real component, live, with a thin selectable outline; drag to move, corner handles to resize      |               |
| D3    | Selected placement: `selected` ring, the inspector opens on it                                                            |               |
| D4    | Two placements of the same component side by side (proves identity is per-placement, not per-component)                   |               |
| D5    | Toolbar: **Add component** (focuses the palette search), Fit, zoom out, zoom level, zoom in                               | "Fit", "100%" |
| D6    | Resizing the frame itself (not a placement): the handle sits on the frame's own edge, distinct from a placement's handles |               |
| D7    | A placement dragged outside the frame's edge: it snaps back inside, since a placement belongs to its frame                |               |

### E. Inspector

| Frame | State                                                                                                                                                                                  | Copy                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| E1    | Nothing selected: the open frame's own facts (name, size) and a **Delete frame** action                                                                                                | "1440 × 900"; **Delete frame**                                                                              |
| E2    | A placement selected: name, Position (X, Y), Size (W, H) as number inputs, Variant (if the component has one) as a ToggleGroup, Text (if the component takes text content) as an Input | "Position", "Size", "Variant", "Text"                                                                       |
| E3    | Delete frame pressed with placements inside: a confirm Dialog                                                                                                                          | Title "Delete frame?", line "Removes its 4 components too", buttons **Cancel** and **Delete** (destructive) |

### F. Smaller screens

| Frame | Width | Layout                                                                                                       |
| ----- | ----- | ------------------------------------------------------------------------------------------------------------ |
| F1    | 1280  | All three side panels, canvas narrower                                                                       |
| F2    | 1024  | Frames and Palette collapse into one left Sheet; inspector opens as a right Sheet when something is selected |
| F3    | 390   | No canvas. A message that composing needs a wider screen, with a link back; Design is a desktop tool for now |

## Behaviour to show or annotate

- One selection drives the canvas and the inspector; nothing selected shows the open frame's own facts instead.
- Dragging and resizing save as soon as the pointer is released, no separate save step.
- A placement cannot leave its frame (D7); a frame can be resized freely.
- Status and identity are never colour alone: the selected ring always has `aria-pressed` alongside it.

## Open questions

- Whether Claude-authored frames show any marker distinguishing them from owner-edited ones, or look identical.
- Whether the palette groups components at all once the catalogue grows past what fits in one flat list.

## Decided

None yet; this brief has not been drawn.
