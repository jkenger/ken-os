import assert from "node:assert/strict";
import { test } from "node:test";
import { diffLines } from "@ken-os/domain";

test("a skipped line shows as missing without shifting the lines after it", () => {
  // The owner's answer from the first live test.
  const rows = diffLines(
    ["outer start", "inner start", "body", "inner end", "outer end", "script end", "timer"],
    ["outer start", "body", "outer end", "script end", "timer"],
  );
  assert.deepEqual(rows.filter((row) => row.kind !== "match").map((row) => [row.text, row.kind, row.moved]), [
    ["inner start", "missing", false],
    ["inner end", "missing", false],
  ]);
  assert.equal(rows.filter((row) => row.kind === "match").length, 5);
});

test("a line in the wrong place is marked moved, not as never printed", () => {
  const rows = diffLines(["sync", "micro", "timer"], ["sync", "timer", "micro"]);
  const timer = rows.filter((row) => row.text === "timer");
  assert.deepEqual(timer.map((row) => [row.kind, row.moved]), [["extra", true], ["missing", true]]);
});

test("a line that never printed is extra and not moved", () => {
  const rows = diffLines(["a"], ["a", "b"]);
  assert.deepEqual(rows.at(-1), { text: "b", kind: "extra", moved: false });
});

test("spacing differences don't count as mistakes", () => {
  assert.ok(diffLines(["x  y"], [" x y "]).every((row) => row.kind === "match"));
});
