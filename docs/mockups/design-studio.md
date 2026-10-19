# Design Studio: mockup brief

Status: drawn 19 Oct 2026 in the [Design Studio mockups](https://claude.ai/artifact/SJTbQ5ZZaMPnw7UpvY8H8c) canvas; the handoff README is in project files, `design-studio-mockups/`. The open questions it raised are settled in the spec's "Decided after the mockups". The UI half of [design-studio.md](../architecture/design-studio.md), which holds the decisions this brief
draws (three panels, build-time manifest, metadata only for other libraries, inspector first, drafts and export). This
brief says which frames, states and words to draw. Code follows the chosen mockups.

## Handoff: what to return

This brief is written for another agent to draw from. When the mockups are done, hand back all of the following. A
frame that can't be drawn as written still comes back, with a note saying why.

1. **The design canvas link**: one canvas with an artboard per frame, named by its frame id, at the widths in Ground
   rules, plus the dark frames named. The canvas is the reference for building. Do not export or render PNGs; that is only for an outside agent that cannot open the canvas.
2. **`design-studio-mockups/README.md`** in project files, with:
   - **Frames**: a table of every frame id, its artboard, and Done, Changed or Skipped.
   - **Changes from this brief**: each place the copy, layout or behaviour differs from what is written here, and why.
   - **Proposals**: any new token or component the frames needed, named as a proposal with what it is for (see
     "Adding a token or component" in `design-system.md`). None is fine.
   - **Open questions**: decisions the owner has to make before code starts, each with the option you recommend.
3. **A short summary** in the reply that hands the work back: which frames to look at first, and the open questions.

Do not change code, `globals.css` or this brief. Changes to the brief go under "Changes from this brief"; the owner
folds the agreed ones in.

## Ground rules for every frame

- **Look:** Loots as it is. shadcn's default setup plus the Loots tokens and shared rules in
  [design-system.md](../architecture/design-system.md): `panel` surfaces with no shadow, `selected` for the picked item, status never
  colour alone. Build from `components/ui` (Button, Badge, Tabs, ToggleGroup, Switch, Input, NativeSelect, Collapsible,
  Command, Dialog, Sheet, Tooltip, Skeleton) and the shared `DockedPanel`. Anything that needs a new token or component
  is named as a proposal in the frame's notes, not slipped in.
- **Words:** app language. Names, actions and states. No sentences in the frame, no taglines, no em dashes, no emoji.
  Copy below is final unless a frame shows it doesn't fit.
- **Sizes:** desktop at 1440 and 1280 wide, tablet at 1024, phone at 390. Light theme, plus the dark frames named
  below.
- **Real data:** draw the 30 components in `apps/web/src/components/ui` today, the Loots wrappers in
  `components/surfaces.ts` and `components/engineering/kit.tsx`, the shadcn/ui catalogue, and one registry built on
  shadcn as the example third library (Magic UI is fine). No lorem ipsum, no made-up component names.
- **The studio shows components; it is not one.** Previews inside nodes are the real components. Studio chrome (tree,
  toolbar, inspector) uses the same primitives, so make the boundary clear: previews sit on their own surface inside a
  node, never loose on the canvas.

## Layout

```text
┌ app sidebar ┐┌ Design Studio ─────────────────────────────────────────── Changed 3 · Export ┐
│ (icons only ││┌ Components ────┐┌ toolbar: Find · Light|Dark · Fit · − 100% + ┐┌ Inspector ─┐│
│  on /studio)│││ Find… (/)      ││                                             ││ Button     ││
│             │││ Library ▾ All  ││   ┌ This repo ────────────────────────┐     ││ This repo  ││
│             │││ Installed|All  ││   │ [Button]──▶[Dialog]  [Card]  …    │     ││ ui/button  ││
│             │││ ☐ Changed      ││   └───────────────────────────────────┘     ││ Preview|   ││
│             │││ ▾ This repo 30 ││   ┌ shadcn/ui ────────────────────────┐     ││ Look|Tokens││
│             │││   Button •     ││   │ [Calendar] [Chart] …              │     ││ …controls  ││
│             │││     ↳ Loots…   ││   └───────────────────────────────────┘     ││            ││
│             │││ ▸ shadcn/ui n  ││                                             ││ Draft saved││
│             │││ ▸ Magic UI n   ││                                             ││ Reset      ││
└─────────────┘└└────────────────┘└─────────────────────────────────────────────┘└────────────┘┘
```

- **App sidebar** folds to icons on `/studio` so the three panels get the width. The owner can still open it. Annotate
  this as a proposal; it is the first module to do it.
- **Components panel** (left, about 280px): a `panel`, full height, scrolls on its own.
- **Canvas** (centre, the rest): React Flow, like the roadmap graph.
- **Inspector** (right, about 360px): `DockedPanel`, docked from 1280px, a right Sheet below.
- **Header row:** page title "Design Studio" (`PageHeading`), then on the right a **Changed** count badge and
  **Export** (outline). Export is disabled with a tooltip "No changes" when there are no drafts.

## Frames

### A. Workspace

| Frame | State                                                                                                               | Copy                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| A1    | First open, nothing picked. Canvas at 100% on the top row of This repo. Inspector open on Theme (see D1)            | Title "Design Studio"; Export disabled |
| A2    | Button picked from the tree: tree row and graph node both selected, canvas pans to the node, inspector shows Button | Address `/studio?c=ui/button`          |
| A3    | Three drafts exist                                                                                                  | Badge "Changed 3"; Export enabled      |
| A4    | Dark frame of A2, with the canvas preview in dark too                                                               | Same                                   |

### B. Components panel (the tree)

| Frame | State                                                                                                                                                                                                                    | Copy                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| B1    | Default. Search field, then filters: Library (NativeSelect), Installed or All (ToggleGroup, All by default), Changed (Switch). Then the library branches as Collapsibles with a count; This repo open, the others closed | "Find a component", "Library", "All libraries", "Installed", "All", "Changed" |
| B2    | This repo open: components A to Z. A wrapper sits under the primitive it wraps, indented, with a small outline badge                                                                                                     | Badge "Loots"                                                                 |
| B3    | A row with a draft: a dot after the name, with "Changed" in its accessible name and in a tooltip                                                                                                                         | Tooltip "Changed"                                                             |
| B4    | shadcn/ui open with All: installed ones show a check icon and "Installed"; the rest show nothing extra                                                                                                                   | "Installed"                                                                   |
| B5    | Selected row: `selectedRow` outline, `aria-current`                                                                                                                                                                      |                                                                               |
| B6    | Search with no match                                                                                                                                                                                                     | "No components match" / button **Clear filters**                              |
| B7    | Changed on with no drafts                                                                                                                                                                                                | "No changes yet"                                                              |

Rows are links (they set `?c=`), one line each: icon for the kind (primitive, wrapper, not installed), name, then the
dot. Long names truncate with the full name on hover.

### C. Canvas (the graph)

Each library is a quiet area (`bg-muted/40`, rounded, heading with the library name and count), laid out top to bottom
in tree order. Inside, nodes sit in rows. Edges are dependencies: an arrow from a component to each component it uses.

| Frame | State                                                                                                                                                                                         | Copy                                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| C1    | Installed node: a `panel` card about 240 × 180. Header line with the name and the dot if changed; below, the live preview on a `bg-background` inset, the default variant with sample content | Name only, e.g. "Button"                           |
| C2    | Wrapper node: same as C1 with the "Loots" badge in the header and a dashed edge to its primitive                                                                                              | "Loots"                                            |
| C3    | Not-installed node: a smaller card (240 × 96), no preview. Name, one-line description cut at two lines, a "Not installed" outline badge, and the dependency count                             | "Not installed", "Uses 3"                          |
| C4    | Selected node: `selectedSurface`, `aria-pressed`; edges touching it drawn in `selected`, others fade to `border`                                                                              |                                                    |
| C5    | Hover on a node: its edges darken, the rest stay                                                                                                                                              |                                                    |
| C6    | Toolbar above the canvas, left to right: **Find a component** (opens the CommandDialog, also `/`), preview theme ToggleGroup, **Fit**, zoom out, zoom level, zoom in                          | "Find a component", "Light", "Dark", "Fit", "100%" |
| C7    | Zoomed out under 50%: previews swap to a name-only card so the canvas stays fast and readable                                                                                                 | Names only                                         |
| C8    | Filters leave nothing on the canvas                                                                                                                                                           | "No components match" / **Clear filters**          |
| C9    | A component whose preview throws: the node keeps its header and shows a destructive line inside the inset                                                                                     | "Preview failed"                                   |

The preview theme switch changes the canvas previews only, not the studio chrome. Previews are interactive: a
Switch flips, an Input takes text. Overlays (Dialog, Sheet, Popover, Tooltip, DropdownMenu) show their open state
statically inside the node instead of opening over the page. Clicking a node's header selects it; clicking inside the
preview uses the component.

### D. Inspector

`DockedPanel` with the component's badges, title and facts, then Tabs. Every change re-renders the node on the canvas
at once.

| Frame | State                                                                                                                                                                                                                              | Copy                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| D1    | Nothing picked: Theme. The Loots and shadcn tokens in groups (Surfaces, Text and borders, Selection, Status, Chapters), each a swatch, the name in mono and the value in an Input. The Light and Dark values side by side          | Title "Theme"; groups as named; "Light", "Dark"                                         |
| D2    | Installed component, **Preview** tab: controls built from its variants and props. Enums as ToggleGroup (variant, size), booleans as Switch (disabled), text as Input (label). These change the preview only and never make a draft | Tabs "Preview", "Look", "Tokens"; facts "This repo", `components/ui/button.tsx` in mono |
| D3    | **Look** tab: the parts of the component that can be restyled (radius, padding, gap, font weight, colours by token), each with a control. A line at the top names where the edit goes                                              | "Saved as a Loots wrapper"                                                              |
| D4    | **Tokens** tab: only the tokens this component uses, same rows as D1, with the reach of a change                                                                                                                                   | "Used by 14 components"                                                                 |
| D5    | Sticky footer while editing: save status on the left, **Reset** (ghost) on the right                                                                                                                                               | "Saving…" / "Draft saved" / "Couldn't save · Retry"; "Reset"                            |
| D6    | Wrapper picked: as D2 to D5, with a fact naming what it wraps; the name links to the primitive                                                                                                                                     | "Wraps Button"                                                                          |
| D7    | Not installed: no tabs. Description, **Uses** (component names as links that select them), **Add** with the install command in a mono InputGroup and a copy button, and a **Docs** link                                            | "Uses", "Add", "Copy", "Docs"; toast "Copied"                                           |
| D8    | Reset pressed with a draft: a confirm Dialog                                                                                                                                                                                       | Title "Reset Button?", line "Removes its draft", buttons **Cancel** and **Reset**       |

Preview controls (D2) never create a draft; only Look and Tokens do. Make that visible: D2 has no save status in the
footer, D3 and D4 do.

### E. Drafts and export

| Frame | State                                                                                                                                                                | Copy                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| E1    | Export pressed: a Dialog, wide. A list of drafts grouped **Tokens** and **Components**, each row with the name, what changed in a few words, and **Discard** (ghost) | Title "Export changes"; "Tokens", "Components", "Discard"                                           |
| E2    | Below the list, Tabs **Patch** and **Claude**. Patch: the diff in a read-only code block with **Copy patch**                                                         | "Patch", "Copy patch"; toast "Patch copied"                                                         |
| E3    | Claude tab: one line to paste in Claude Code, in a mono InputGroup with copy                                                                                         | "Claude", "Apply my studio drafts", "Copy"                                                          |
| E4    | A draft that has been applied and merged: it leaves the list; the tree dot goes                                                                                      | Not a frame, annotate                                                                               |
| E5    | **Discard all** at the dialog's bottom left, with a confirm Dialog                                                                                                   | "Discard all"; confirm title "Discard 3 changes?", buttons **Cancel** and **Discard** (destructive) |

### F. Live edit storyboard

One wide desktop frame in three steps: the owner changes `radius` in Tokens, every installed node on the canvas updates
at once, and the footer reads "Draft saved". Show the affected nodes briefly ringed (`ring-selected/40`, gone after a
second) so the reach of a token change is visible. This shows the feel; it's not a separate screen.

### G. Smaller screens

| Frame | Width | Layout                                                                                                                                                                     |
| ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1    | 1280  | All three panels; canvas narrower. Inspector docked                                                                                                                        |
| G2    | 1024  | Components panel and canvas; inspector opens as a right Sheet when something is picked                                                                                     |
| G3    | 390   | No canvas. A **Components** button opens the tree in a left Sheet; the page shows the picked component's live preview full width, with the inspector tabs stacked below it |

Phones get no graph, as the roadmap's phones open on Lanes: a canvas of live components is not usable at 390px.

### H. AI tab, on file only

One low-detail desktop frame: the inspector with a fourth tab "Ask" holding a plain chat built from shadcn's AI
components. Labelled "Later · not planned". Enough to judge whether a chat fits in a 360px inspector, nothing more.

## Behaviour to show or annotate

- One selection drives the tree, the canvas, the inspector and the address (`?c=<library>/<name>`), so a link or a
  reload reopens it.
- Drafts save 1 second after the last change. "Draft saved" stays until the next change.
- Escape closes the inspector wherever focus is, unless it is closing a dialog or menu first (the `DockedPanel` rule).
- Keyboard: tree rows are links in tab order; arrow keys move within the tree; `/` opens Find a component, ignored
  while typing in a field; Ctrl or Cmd + K stays with the app search. Canvas nodes are Tab stops, edges are not.
- The canvas opens at 100% on the picked component, else on the top row of This repo. Fit is one click away.
- Status and state are never colour alone: the draft dot has the word in its name, Not installed and Loots are words
  in badges, the selected node also carries `aria-pressed`.
- Studio chrome sizes its insides with container queries, since the docked inspector takes width the window doesn't
  know about.
