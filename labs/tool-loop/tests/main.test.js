function scripted(replies) {
  const sent = [];
  const callModel = async (messages) => {
    sent.push(messages.map((message) => ({ ...message })));
    if (!replies.length) return { toolCalls: [{ id: "again", name: "get_weather", arguments: '{"city":"Manila"}' }] };
    return replies.shift();
  };
  return { sent, callModel };
}
const tools = {
  get_weather: async ({ city }) => ({ city, tempC: 31 }),
  get_time: async ({ zone }) => ({ zone, time: "14:05" }),
  broken: async () => {
    throw new Error("database is down");
  },
};
const ask = [{ role: "user", content: "Weather and time in Manila?" }];

test("runs every tool call, sends results back, and returns the final answer", async () => {
  const { sent, callModel } = scripted([
    {
      toolCalls: [
        { id: "c1", name: "get_weather", arguments: '{"city":"Manila"}' },
        { id: "c2", name: "get_time", arguments: '{"zone":"Asia/Manila"}' },
      ],
    },
    { content: "31°C and 14:05 in Manila." },
  ]);
  const result = await runTools(callModel, tools, ask);
  assert.deepEqual(result, { answer: "31°C and 14:05 in Manila.", steps: 2 });
  const second = sent[1];
  assert.equal(second[1].role, "assistant");
  assert.equal(second[1].toolCalls.length, 2);
  assert.deepEqual(
    second.slice(2).map((message) => [message.role, message.toolCallId]),
    [
      ["tool", "c1"],
      ["tool", "c2"],
    ],
  );
  assert.deepEqual(JSON.parse(second[2].content), { city: "Manila", tempC: 31 });
});

test("the model's mistakes become tool results, not crashes", async () => {
  const { sent, callModel } = scripted([
    {
      toolCalls: [
        { id: "c1", name: "get_weather", arguments: "{city: Manila}" },
        { id: "c2", name: "launch_rockets", arguments: "{}" },
        { id: "c3", name: "broken", arguments: "{}" },
      ],
    },
    { content: "Sorry, I couldn't get that." },
  ]);
  const result = await runTools(callModel, tools, ask);
  assert.equal(result.answer, "Sorry, I couldn't get that.");
  const results = sent[1].filter((message) => message.role === "tool").map((message) => JSON.parse(message.content));
  assert.equal(results.length, 3);
  assert.ok(
    results.every((item) => typeof item.error === "string" && item.error.length > 0),
    "each failure is reported as { error }",
  );
});

test("a model that keeps calling tools is stopped", async () => {
  const { callModel } = scripted([]);
  let error = null;
  try {
    await runTools(callModel, tools, ask, { maxSteps: 3 });
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, "it should stop");
  assert.equal(error.name, "StepLimitError");
});

test("the caller's messages aren't changed", async () => {
  const { callModel } = scripted([
    { toolCalls: [{ id: "c1", name: "get_time", arguments: '{"zone":"UTC"}' }] },
    { content: "14:05" },
  ]);
  const original = [{ role: "user", content: "Time?" }];
  await runTools(callModel, tools, original);
  assert.equal(original.length, 1);
});
