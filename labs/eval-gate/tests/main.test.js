const cases = [
  { id: "r1", input: "Can I return shoes after 20 days?", expected: "yes", tags: ["returns"] },
  { id: "r2", input: "Can I return a sale item?", expected: "no", tags: ["returns"] },
  { id: "s1", input: "Do you ship to Canada?", expected: "yes", tags: ["shipping"] },
  { id: "s2", input: "Is shipping free over $50?", expected: "yes", tags: ["shipping"] },
  { id: "s3", input: "Do you ship on Sundays?", expected: "no", tags: ["shipping"] },
  { id: "b1", input: "Can I pay with PayPal?", expected: "yes", tags: ["billing"] },
];
const grade = (output, expected) => output.trim().toLowerCase().startsWith(expected);
const answers = (table) => async (input) => {
  const item = cases.find((entry) => entry.input === input);
  const answer = table[item.id];
  if (answer instanceof Error) throw answer;
  return answer;
};
const oldPrompt = answers({
  r1: "Yes, within 30 days.",
  r2: "No, sale items are final.",
  s1: "Yes.",
  s2: "Yes.",
  s3: "Yes, every day.",
  b1: "Yes.",
});
const newPrompt = answers({
  r1: "Yes, within 30 days.",
  r2: "No.",
  s1: "No, US only.",
  s2: "No.",
  s3: "No.",
  b1: new Error("model timed out"),
});

test("a case that throws is a failure, not a crash", async () => {
  const results = await runEval(cases, newPrompt, grade);
  assert.equal(results.length, 6);
  const billing = results.find((result) => result.id === "b1");
  assert.equal(billing.pass, false);
  assert.ok(String(billing.error).includes("timed out"));
});

test("the report breaks the pass rate down by tag", async () => {
  const summary = report(await runEval(cases, oldPrompt, grade));
  assert.equal(summary.total, 6);
  assert.equal(summary.passed, 5);
  assert.deepEqual(summary.byTag.returns, { total: 2, passed: 2, passRate: 1 });
  assert.deepEqual(summary.byTag.shipping, { total: 3, passed: 2, passRate: 2 / 3 });
});

test("the gate names regressions and blocks a category that got worse", async () => {
  const baseline = await runEval(cases, oldPrompt, grade);
  const candidate = await runEval(cases, newPrompt, grade);
  const verdict = gate(baseline, candidate, { maxDrop: 0.2 });
  assert.equal(verdict.ok, false);
  assert.deepEqual([...verdict.regressions].sort(), ["b1", "s1", "s2"]);
  assert.ok(verdict.tagDrops.includes("shipping") && verdict.tagDrops.includes("billing"));
  assert.ok(!verdict.tagDrops.includes("returns"));
});

test("a small overall drop can still hide a broken category", async () => {
  const many = [
    ...cases,
    ...Array.from({ length: 20 }, (_, index) => ({
      id: `g${index}`,
      input: `general ${index}`,
      expected: "yes",
      tags: ["general"],
    })),
  ];
  const all = (fail) => async (input) =>
    fail.some((word) => input.includes(word))
      ? "no"
      : (cases.find((entry) => entry.input === input)?.expected ?? "yes");
  const baseline = await runEval(many, all([]), grade);
  const candidate = await runEval(many, all(["PayPal"]), grade);
  const verdict = gate(baseline, candidate, { maxDrop: 0.1 });
  assert.ok(verdict.passRateChange > -0.1, "the overall drop is small");
  assert.equal(verdict.ok, false, "but billing went from 100% to 0%");
  assert.deepEqual(verdict.tagDrops, ["billing"]);
});

test("an equal or better run passes", async () => {
  const baseline = await runEval(cases, oldPrompt, grade);
  const verdict = gate(baseline, baseline, { maxDrop: 0 });
  assert.deepEqual(verdict, { ok: true, passRateChange: 0, regressions: [], tagDrops: [] });
});
