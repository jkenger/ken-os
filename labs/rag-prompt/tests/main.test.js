const countTokens = (text) => text.split(/\s+/).filter(Boolean).length;
const chunks = [
  { id: "c1", text: "Refunds are issued within 5 business days of approval." },
  { id: "c2", text: "Refunds are issued within 5 business days of approval." },
  { id: "c3", text: "Orders over 200 dollars need a manager's approval before a refund is issued, which can take up to three extra business days depending on the region and the payment method used." },
  { id: "c4", text: "Store credit never expires." },
];

test("chunks are labeled and the question comes last", () => {
  const { prompt, used } = buildPrompt("How long do refunds take?", chunks, { maxTokens: 500, countTokens });
  assert.ok(prompt.includes("[c1] Refunds are issued within 5 business days"), "each chunk is labeled [id] text");
  assert.ok(prompt.trimEnd().endsWith("How long do refunds take?"), "the question is the last thing the model reads");
  assert.deepEqual(used, ["c1", "c3", "c4"], "the duplicate c2 is skipped");
});

test("the model is told to stay grounded and admit gaps", () => {
  const { prompt } = buildPrompt("Anything?", chunks, { maxTokens: 500, countTokens });
  assert.ok(/only/i.test(prompt) && /source/i.test(prompt), "answer only from the sources");
  assert.ok(prompt.includes("I don't know"), "say I don't know when the sources don't cover it");
  assert.ok(prompt.includes("[id]") || /cite/i.test(prompt), "cite sources by id");
});

test("the prompt stays within budget, skipping a chunk too big to fit", () => {
  const { prompt, used } = buildPrompt("How long do refunds take?", chunks, { maxTokens: 60, countTokens });
  assert.ok(countTokens(prompt) <= 60, `the prompt is ${countTokens(prompt)} tokens, over the 60 budget`);
  assert.deepEqual(used, ["c1", "c4"], "c3 doesn't fit, but the smaller c4 after it does");
});

test("citations are checked against the sources used", () => {
  assert.deepEqual(checkCitations("Within 5 days [c1]. Credit never expires [c4].", ["c1", "c4"]), { cited: ["c1", "c4"], unknown: [] });
  assert.deepEqual(checkCitations("It takes a week [c9].", ["c1"]), { cited: ["c9"], unknown: ["c9"] });
});
