function setup(dailyBudgetUsd = 1) {
  const calls = [];
  const small = async (question) => {
    calls.push(["small", question]);
    return /refund|contract/i.test(question) ? { text: "Not sure.", confident: false } : { text: `Small: ${question.trim()}`, confident: true };
  };
  const large = async (question) => {
    calls.push(["large", question]);
    return { text: `Large: ${question.trim()}`, confident: true };
  };
  const costOf = (model) => (model === "large" ? 0.4 : 0.01);
  return { calls, answerer: createAnswerer({ small, large, costOf, dailyBudgetUsd }) };
}

test("an easy question stays on the small model", async () => {
  const { calls, answerer } = setup();
  const result = await answerer.answer("What are your hours?");
  assert.deepEqual(result, { text: "Small: What are your hours?", model: "small", costUsd: 0.01 });
  assert.deepEqual(calls.map(([model]) => model), ["small"]);
});

test("an unsure small answer escalates, and the cost includes both calls", async () => {
  const { answerer } = setup();
  const result = await answerer.answer("Can I get a refund on a custom order?");
  assert.equal(result.model, "large");
  assert.equal(Math.round(result.costUsd * 100), 41);
  assert.equal(Math.round(answerer.spent() * 100), 41);
});

test("repeated questions come from the cache, however they're typed", async () => {
  const { calls, answerer } = setup();
  await answerer.answer("What are your hours?");
  const again = await answerer.answer("  What are your HOURS? ");
  assert.deepEqual(again, { text: "Small: What are your hours?", model: "cache", costUsd: 0 });
  assert.equal(calls.length, 1);
});

test("once the budget is spent, unsure answers degrade instead of escalating", async () => {
  const { calls, answerer } = setup(0.4);
  await answerer.answer("Can I get a refund on a custom order?");
  const result = await answerer.answer("Can you review this contract clause?");
  assert.equal(result.model, "small");
  assert.equal(result.degraded, true);
  assert.equal(calls.filter(([model]) => model === "large").length, 1);
  const retry = await answerer.answer("Can you review this contract clause?");
  assert.ok(retry.model !== "cache", "an unsure answer is not cached");
});
