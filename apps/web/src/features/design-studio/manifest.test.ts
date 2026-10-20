import assert from "node:assert/strict";
import test from "node:test";
import { filterTree, kebab, layoutGraph, pascal, routeEdge, treeOrder, type StudioComponent } from "./manifest";
import { studioManifest } from "./manifest.generated";

const component = (id: string, name: string, wraps?: string, uses: string[] = []): StudioComponent => ({
  id,
  name,
  kind: id.startsWith("ui/") ? "primitive" : "wrapper",
  file: "",
  exports: [name],
  variants: [],
  uses,
  tokens: [],
  ...(wraps ? { wraps } : {}),
});

test("pascal and kebab convert between slugs and names", () => {
  assert.equal(pascal("dropdown-menu"), "DropdownMenu");
  assert.equal(kebab("SectionTitle"), "section-title");
  assert.equal(kebab("selectedRow"), "selected-row");
});

test("treeOrder nests wrappers under their primitive, A to Z", () => {
  const rows = treeOrder([
    component("ui/card", "Card"),
    component("kit/notice", "Notice"),
    component("surfaces/panel", "panel", "ui/card"),
    component("ui/badge", "Badge"),
    component("kit/badge", "Badge", "ui/badge"),
    component("kit/lost", "Lost", "ui/missing"),
  ]);
  assert.deepEqual(
    rows.map((row) => `${row.depth}:${row.component.id}`),
    ["0:ui/badge", "1:kit/badge", "0:ui/card", "1:surfaces/panel", "0:kit/lost", "0:kit/notice"],
  );
});

test("filterTree keeps a parent whose wrapper matches", () => {
  const rows = treeOrder([component("ui/card", "Card"), component("surfaces/panel", "panel", "ui/card")]);
  assert.deepEqual(
    filterTree(rows, "PAN").map((row) => row.component.id),
    ["ui/card", "surfaces/panel"],
  );
  assert.equal(filterTree(rows, " ").length, 2);
  assert.equal(filterTree(rows, "zzz").length, 0);
});

test("the generated manifest has unique ids and wraps point at primitives", () => {
  const ids = studioManifest.components.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of studioManifest.components) if (c.wraps) assert.ok(ids.includes(c.wraps), `${c.id} wraps ${c.wraps}`);
  assert.ok(ids.includes("ui/button"));
});

test("layoutGraph places nodes in tree order on a five-column grid", () => {
  const names = ["Alert", "Badge", "Button", "Card", "Dialog", "Input"];
  const { nodes, area } = layoutGraph(names.map((name) => component(`ui/${kebab(name)}`, name)));
  assert.deepEqual(
    nodes.map((node) => [node.component.name, node.x, node.y]),
    [
      ["Alert", 32, 64],
      ["Badge", 320, 64],
      ["Button", 608, 64],
      ["Card", 896, 64],
      ["Dialog", 1184, 64],
      ["Input", 32, 300],
    ],
  );
  assert.deepEqual(area, { width: 1456, height: 64 + 180 * 2 + 56 + 32 });
});

test("layoutGraph draws uses and wraps edges, skipping components it doesn't have", () => {
  const { edges } = layoutGraph([
    component("ui/button", "Button"),
    component("ui/dialog", "Dialog", undefined, ["ui/button", "ui/missing"]),
    component("kit/badge", "Badge", "ui/badge"),
    component("ui/badge", "Badge"),
  ]);
  assert.deepEqual(
    edges.map(({ id, source, target, kind }) => ({ id, source, target, kind })),
    [
      { id: "ui/dialog>ui/button", source: "ui/dialog", target: "ui/button", kind: "uses" },
      { id: "kit/badge>ui/badge", source: "kit/badge", target: "ui/badge", kind: "wraps" },
    ],
  );
});

test("routeEdge runs through the gaps between nodes", () => {
  // Neighbours in a row: straight across between facing sides.
  assert.equal(routeEdge({ x: 320, y: 64 }, { x: 32, y: 64 }), "M320 154 H272");
  // Same row, further apart: over the row through the gap above it.
  assert.equal(routeEdge({ x: 32, y: 64 }, { x: 608, y: 64 }), "M152 64 V36 H728 V64");
  // A row up and to the right: up, along the column gap right of the source, then across and down into the target.
  assert.equal(routeEdge({ x: 32, y: 300 }, { x: 896, y: 64 }), "M152 300 V272 H296 V36 H1016 V64");
  // Spread and lane offsets.
  assert.equal(
    routeEdge({ x: 320, y: 300 }, { x: 32, y: 64 }, { start: 5, end: -10, lane: 4 }),
    "M445 300 V276 H300 V40 H142 V64",
  );
});

test("the generated manifest's uses point at other primitives", () => {
  const ids = studioManifest.components.map((c) => c.id);
  for (const c of studioManifest.components)
    for (const used of c.uses) assert.ok(ids.includes(used) && used !== c.id, `${c.id} uses ${used}`);
  const sidebar = studioManifest.components.find((c) => c.id === "ui/sidebar");
  assert.ok(sidebar?.uses.includes("ui/sheet"));
});
