const prices = { "big-model": { input: 3, output: 15 }, "small-model": { input: 0.25, output: 1.25 } };
const spans = [
  { id: "run", parentId: null, kind: "run", name: "answer_question", start: 0, end: 4200 },
  { id: "a", parentId: "run", kind: "llm", name: "plan", model: "big-model", inputTokens: 2000, outputTokens: 300, start: 0, end: 1500 },
  { id: "b", parentId: "run", kind: "tool", name: "search_docs", start: 1500, end: 2700 },
  { id: "c", parentId: "run", kind: "tool", name: "get_order", start: 1500, end: 2100, error: "timeout" },
  { id: "d", parentId: "run", kind: "llm", name: "answer", model: "small-model", inputTokens: 6000, outputTokens: 400, start: 2700, end: 4200 },
];

test("duration is wall-clock time, not the sum of overlapping steps", () => {
  assert.equal(summarizeRun(spans, prices).durationMs, 4200);
});

test("tokens and cost add up per model and overall", () => {
  const summary = summarizeRun(spans, prices);
  assert.deepEqual(summary.tokens, { input: 8000, output: 700 });
  assert.deepEqual(summary.byModel["big-model"], { calls: 1, inputTokens: 2000, outputTokens: 300, costUsd: 0.0105 });
  assert.deepEqual(summary.byModel["small-model"], { calls: 1, inputTokens: 6000, outputTokens: 400, costUsd: 0.002 });
  assert.equal(summary.costUsd, 0.0125);
});

test("the slowest step and failed tools are named", () => {
  const summary = summarizeRun(spans, prices);
  assert.equal(summary.slowest.durationMs, 1500);
  assert.ok(["plan", "answer"].includes(summary.slowest.name));
  assert.deepEqual(summary.failedTools, ["get_order"]);
});

test("a model with no price is listed instead of turning the cost into NaN", () => {
  const withNew = [...spans, { id: "e", parentId: "run", kind: "llm", name: "check", model: "new-model", inputTokens: 100, outputTokens: 10, start: 4200, end: 4300 }];
  const summary = summarizeRun(withNew, prices);
  assert.equal(summary.costUsd, 0.0125);
  assert.deepEqual(summary.unpriced, ["new-model"]);
  assert.equal(summary.tokens.input, 8100);
  assert.equal(summary.durationMs, 4300);
});
