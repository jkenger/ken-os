# Design canvas

Source of the Design mockups canvas, drawn from [design.md](../design.md) (frames A1 to F3). Live canvas:
https://claude.ai/artifact/W948F2EcSYvrjWsZsgzCJh

- `canvas.json` lists every frame (`boards`) with its position and title, in `order`.
- `Main.dc.html` is the hand-back README the brief asks for: frames table, changes from the brief, proposals, and the
  decisions the owner took on 2 Nov 2026 (no open questions left).
- `Workspace.dc.html` is the shared Design workspace. Every frame file (`A1.dc.html` to `F2.dc.html`) imports it with
  a `variant` prop, and the per-frame state (selection, zoom, dialogs, placements) lives in its `renderVals()`.
  `F3.dc.html` (phone) stands alone.
- The files need the canvas runtime (`support.js`) to render, so read them as source rather than opening them in a
  browser. Tokens are the Loots console values from `apps/web/DESIGN.md`, light, with A4 in dark.
