import assert from "node:assert/strict";
import test from "node:test";
import { filterTree, kebab, pascal, treeOrder, type StudioComponent } from "./manifest";
import { studioManifest } from "./manifest.generated";

const component = (id: string, name: string, wraps?: string): StudioComponent => ({
  id,
  name,
  kind: id.startsWith("ui/") ? "primitive" : "wrapper",
  file: "",
  exports: [name],
  variants: [],
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
