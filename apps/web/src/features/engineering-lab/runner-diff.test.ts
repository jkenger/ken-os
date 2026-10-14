import assert from "node:assert/strict";
import { test } from "node:test";
import { lineDiff } from "./runner/diff";
import { firstExample, workedExamples } from "./runner/examples";

const readme = `Return the final state.

\`\`\`js
// queueOf comes from the tests
const queue = [5, (n) => n + 1];
getFinalState(0, queue);
// → 6
getFinalState(1, [
  2,
]); // → 2
\`\`\``;

test("Try it starts from the task's first example, without comments", () => {
  assert.equal(firstExample(readme), "const queue = [5, (n) => n + 1];\ngetFinalState(0, queue);");
  assert.equal(firstExample("Task.\n\nProse only."), null);
});

test("each example becomes code that returns the value after its arrow", () => {
  assert.deepEqual(workedExamples(readme), [
    {
      input: "// queueOf comes from the tests\nconst queue = [5, (n) => n + 1];\nreturn (getFinalState(0, queue));",
      expected: "6",
    },
    {
      input:
        "// queueOf comes from the tests\nconst queue = [5, (n) => n + 1];\ngetFinalState(0, queue);\nreturn (getFinalState(1, [\n  2,\n]));",
      expected: "2",
    },
  ]);
});

test("lines that match stay, lines that differ show as expected then got", () => {
  assert.deepEqual(lineDiff("[\n  1,\n  2\n]", "[\n  1,\n  3\n]"), [
    { kind: "same", text: "[" },
    { kind: "same", text: "  1," },
    { kind: "expected", text: "  2", changed: [2, 3] },
    { kind: "got", text: "  3", changed: [2, 3] },
    { kind: "same", text: "]" },
  ]);
});

test("a changed field is narrowed to the part of the line that differs", () => {
  const [expected, got] = lineDiff("{ id: 2, qty: 4 }", "{ id: 2, qty: 13 }");
  assert.deepEqual(expected, { kind: "expected", text: "{ id: 2, qty: 4 }", changed: [14, 15] });
  assert.deepEqual(got, { kind: "got", text: "{ id: 2, qty: 13 }", changed: [14, 16] });
});

test("extra or missing lines show on one side only", () => {
  assert.deepEqual(lineDiff("a\nb", "a\nb\nc"), [
    { kind: "same", text: "a" },
    { kind: "same", text: "b" },
    { kind: "got", text: "c" },
  ]);
  assert.deepEqual(lineDiff("a\nb", "b"), [
    { kind: "expected", text: "a" },
    { kind: "same", text: "b" },
  ]);
});
