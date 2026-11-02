# Design — architecture spec

Status: proposed, 31 Oct 2026. A new product, built from the ground up, not a feature inside Design Studio. The
library choice behind it was decided separately in
[design-studio-mockup-canvas-decision.md](design-studio-mockup-canvas-decision.md): adapt the already-adopted React
Flow (`@xyflow/react`), no new dependency. The screens are drawn from
[the mockup brief](../mockups/design.md).

Design is a private workspace for composing UI mockups from Loots' own real components, in Loots itself. It replaces
the Figma MCP server and the Paper MCP server, both of which gate and rate-limit the mockup workflow (see
`docs/mockups/job-finder.md`, `docs/mockups/design-studio.md`). A named frame at a fixed size (desktop 1440x900,
phone 390 wide) holds real, live components dragged onto it, resized and repositioned, with their text and props
editable. Claude Code can build and edit a frame programmatically; the owner can open the same frame and adjust it by
hand. Export is a JSON description of the frame, for Claude to read back, and a live page existing agent screenshot
tooling can review — not a code patch.

## Relationship to Design Studio

Design Studio (`apps/web/src/features/design-studio`, `docs/architecture/design-studio.md`) keeps doing exactly what
it does today: catalogue every real component, render it live, let the owner tune tokens and variants, export the
edit as a code patch. Design does not touch its code, its routes, or its tables, and does not import from it.

This is deliberate, not an oversight: Design is being built as a different direction, so it can be designed cleanly
for its own job rather than inheriting Design Studio's shape. Once Design's first slice (below) covers mockup
composition at a usable level, the plan is for Design to take over Design Studio's catalogue/inspection job too and
for Design Studio to be retired. That migration is not designed here; it is a later decision, made once Design has an
MVP to migrate to.

## Decisions

| Question               | Decision                                                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where it lives         | A private module inside `apps/web`, behind the owner session, route `/design`. No new app or service, no shared code with Design Studio.                                                                                                                                                                              |
| Library                | `@xyflow/react` (React Flow), already a dependency. See the solution decision for why every alternative (tldraw, Excalidraw, GrapesJS, Craft.js, react-moveable/react-selecto, Konva) was ruled out.                                                                                                                  |
| Root object            | A `Frame`: named, fixed size, the mockup-brief concept of a named frame made real.                                                                                                                                                                                                                                    |
| Edit unit              | A `Placement`: one component instance on one frame, its own id (not the component's id, since one frame can hold several instances of the same component).                                                                                                                                                            |
| Catalogue              | Design reads the same raw sources Design Studio's manifest script does (`components.json`, `components/ui`, registry JSON), through its own generated manifest. No shared module, so Design never carries fields (theme tokens, CSS slot, wrapper source lines) that exist only for Design Studio's Look-editing job. |
| Two drivers, one model | Claude Code edits placements through an API route; the owner edits the same placements by dragging and resizing in the browser. Both read and write the same `Frame`/`Placement` rows, never two different shapes.                                                                                                    |
| Export                 | A JSON scene (frame, its placements, their props and text) for Claude to read back. No code-patch generation: a composed frame is not a change to existing source, it is an arrangement of instances.                                                                                                                 |
| Review                 | No new mechanism. The composed frame is a normal live page; the agent's existing live-browser screenshot tooling (already used elsewhere in this project) reviews it, the same way the earlier decision already settled.                                                                                              |
| Scope                  | Trimmed to what the existing mockup briefs actually use: named frames, real components, text edits, a shared token/colour reference, screenshot review. No multiplayer collaboration, no FigJam-style diagramming, no Code-Connect-style variant mapping.                                                             |

Rejected: sharing Design Studio's `manifest.ts`, `drafts.ts` or `studio-graph.tsx` (see "Relationship to Design
Studio" above); any of the external canvas libraries in the solution decision; generating real page/route code from a
composed frame (out of scope, a much larger problem than mockup composition).

## Module design

Using the deep-module standard: a small interface hiding real behaviour, tested through that interface, placed at a
clean seam.

### Catalogue

`features/design/catalogue.ts`, built by its own generation script (`scripts/generate-design-manifest.ts`), run the
same way Design Studio's manifest script is, from the same raw sources.

```ts
type DesignComponent = {
  id: string; // "ui/button"
  name: string; // "Button"
  file: string;
  exports: string[];
  variants: { name: string; options: string[]; defaultOption?: string }[];
};
```

Deliberately smaller than Design Studio's `StudioComponent`: no `tokens`, `slot`, `scoped` or `source` fields, because
Design never edits a component's own look or generates a patch against its source. The deletion test: if Design
never needs a field, it does not carry it, even though a very similar-looking type already exists one folder over.

Interface: `treeOrder`, `filterTree` (ordering and search for the component picker) — the same _shape_ of logic
Design Studio's catalogue already proved out, re-derived for Design's smaller type rather than imported.

### Frame

`features/design/frames.ts`: `{ id, name, width, height }`. Table `design_frames`, one row per frame, owner-scoped.

### Placement

`features/design/placements.ts`: `{ id, frameId, componentId, x, y, width, height, props?, text? }`. Table
`design_placements`, one row per placed instance.

`parsePlacement(input, catalogue)` validates `componentId` against the Catalogue, position and size as finite numbers
within the frame's bounds, and `props` against the component's own variant options — the same validation discipline
Design Studio's `parseDraft` uses, applied to a different shape.

Why identity is the placement's own id, not the component's: a mockup frame routinely holds several instances of one
component (three buttons on one screen). A model keyed by `(frame, component)` breaks the moment that happens, so
placement identity is its own id from the start.

### Canvas

`components/design/design-canvas.tsx`, React Flow inside its own `ReactFlowProvider`:

- **`FrameNode`**: named, resizable via the built-in `<NodeResizer />`, holds placed components as children.
- **`PlacedComponentNode`**: renders the real component live (Design's own small preview-props registry, written by
  hand like Design Studio's `previews.tsx` but owned by Design), `draggable: true`, `parentId` set to its frame,
  `extent: "parent"` — React Flow v12's native, documented grouping and resize behaviour, switched on for this node
  type.

A toolbar: Add frame, pan/zoom, Fit. No Find-and-dependency-graph machinery; that is Design Studio's job, not this
one.

### Tree / palette

`components/design/design-tree.tsx`: the component picker, built on the Catalogue above. Picking a component adds it
to the open frame at a default size, rather than opening an inspector.

### Workspace

`components/design/design-workspace.tsx`, route `/design`: frame list/switcher, the tree, the canvas, and a small
inspector for the selected placement (position, size, text overrides, and the same kind of variant control Design
Studio's Look editing already has, reused as a pattern, not as shared code).

### Export and API

A `scene(frame, placements)` function renders the JSON Claude reads and writes. `/api/design/frames` and
`/api/design/placements`, guarded the same way Design Studio's routes are (owner session, origin check): Claude edits
through these routes; the owner edits by dragging, which calls the same routes from the browser.

## Data model

|                   | Shape                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `Frame`           | `{ id, name, width, height }`, table `design_frames`                                          |
| `Placement`       | `{ id, frameId, componentId, x, y, width, height, props?, text? }`, table `design_placements` |
| `DesignComponent` | `{ id, name, file, exports, variants }`, generated, not persisted                             |

No table or type is shared with Design Studio's `design_studio_drafts`, `StudioComponent` or `StudioManifest`.

## Build order

Each step its own PR, matching Design Studio's existing convention:

1. **Catalogue and tree.** The generation script, `DesignComponent`, `/design` with the component picker and a single
   frame with no placements yet.
2. **Canvas.** `FrameNode` and `PlacedComponentNode`, drag and resize, the placements table and its API route, the
   owner adding and arranging components by hand.
3. **Claude-driven editing.** The same API route read and written programmatically, a scene export Claude can request
   and act on.
4. **Multiple frames.** The frame list/switcher, named frames at device-size presets (desktop 1440x900, phone 390
   wide).

Later, not in these steps: taking over Design Studio's catalogue/inspection job once this MVP is in use; anything
beyond what the existing mockup briefs use (collaboration, diagramming, code generation from a frame).

## Acceptance criteria

- A frame created by Claude through the API, and the same frame opened by the owner in the browser, show identically:
  same components, same positions, same text.
- Dragging or resizing a placed component in the browser persists across a refresh and re-renders the real,
  interactive component, not a snapshot.
- A frame with three placements of the same component (three buttons) round-trips correctly; no placement overwrites
  another.
- Nothing in Design's code imports from `apps/web/src/features/design-studio` or `apps/web/src/components/design-studio`.
- `/api/design/placements` rejects a request without the owner's session or a valid origin, the same as Design
  Studio's drafts route.

## Open questions

- Whether `/design` is its own sidebar entry or stays unlisted until the MVP is further along.
- The exact device-size presets beyond desktop 1440x900 and phone 390 wide.
