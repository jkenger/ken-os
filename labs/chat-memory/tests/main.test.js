const countTokens = (text) => text.split(/\s+/).filter(Boolean).length;
function fakeSummarizer() {
  const calls = [];
  const summarize = async (previous, older) => {
    calls.push({ previous, older: older.map((message) => message.content) });
    const topics = older.map((message) => message.content.split(" ")[0]).join(", ");
    return previous ? `${previous}; then ${topics}` : `talked about ${topics}`;
  };
  return { calls, summarize };
}
const turns = [
  "Hello there, I am planning a trip to Japan next spring.",
  "Great choice. Spring is cherry blossom season in most of Japan.",
  "Budget is about two thousand dollars for two weeks.",
  "That works if you stay in hostels and use a rail pass.",
  "Kyoto first, then Osaka, then Tokyo at the end.",
  "That route works well with a seven day rail pass.",
];
async function fill(memory) {
  for (const [index, content] of turns.entries()) await memory.add({ role: index % 2 ? "assistant" : "user", content });
}

test("older turns are folded into a summary and recent turns stay word for word", async () => {
  const { calls, summarize } = fakeSummarizer();
  const memory = createMemory({ maxTokens: 40, keepRecent: 2, countTokens, summarize });
  await fill(memory);
  const context = memory.context();
  assert.ok(calls.length >= 1, "summarize should be called when over budget");
  const summary = context.find((message) => message.role === "system" && message.content.startsWith("Summary of earlier conversation:"));
  assert.ok(summary, "the context starts with the summary");
  assert.ok(summary.content.includes("Hello"), "the first turn survives in the summary");
  assert.deepEqual(context.slice(-2).map((message) => message.content), turns.slice(-2));
});

test("the summary rolls forward instead of starting over", async () => {
  const { calls, summarize } = fakeSummarizer();
  const memory = createMemory({ maxTokens: 30, keepRecent: 1, countTokens, summarize });
  await fill(memory);
  assert.ok(calls.length >= 2, "expected more than one summarize call");
  assert.equal(calls[0].previous, "");
  assert.ok(calls[1].previous.length > 0, "later calls get the previous summary");
  const summarized = calls.flatMap((call) => call.older);
  assert.equal(new Set(summarized).size, summarized.length, "no message is summarized twice");
});

test("pinned facts come first and are never summarized away", async () => {
  const { summarize } = fakeSummarizer();
  const memory = createMemory({ maxTokens: 30, keepRecent: 1, countTokens, summarize });
  memory.remember("The user's name is Ana.");
  memory.remember("The user's name is Ana.");
  memory.remember("The user is vegetarian.");
  await fill(memory);
  const [facts] = memory.context();
  assert.equal(facts.role, "system");
  assert.ok(facts.content.includes("Ana") && facts.content.includes("vegetarian"));
  assert.equal(facts.content.split("Ana").length - 1, 1, "duplicate facts are stored once");
});

test("under budget, nothing is summarized", async () => {
  const { calls, summarize } = fakeSummarizer();
  const memory = createMemory({ maxTokens: 1000, keepRecent: 2, countTokens, summarize });
  await fill(memory);
  assert.equal(calls.length, 0);
  assert.deepEqual(memory.context().map((message) => message.content), turns);
});
