With tool calling, the model doesn't run anything itself: it replies with the tools it wants called and their
arguments, your code runs them, sends the results back, and the model continues. `runTools(callModel, tools,
messages, { maxSteps = 5 })` runs that loop:

- `callModel(messages)` returns either `{ content }` (the final answer) or `{ toolCalls: [{ id, name, arguments }] }`,
  where `arguments` is a JSON **string** written by the model.
- `tools` maps a name to an async function taking the parsed arguments.
- For each tool call, add the model's turn as `{ role: "assistant", toolCalls }`, then one
  `{ role: "tool", toolCallId, content }` per call, with the result as a JSON string, and call the model again.
- Don't crash on the model's mistakes; tell it instead. Arguments that aren't valid JSON, an unknown tool, or a tool
  that throws each become a tool message `{"error": "..."}` it can react to.
- Return `{ answer, steps }`, where `steps` counts model calls. Past `maxSteps` model calls, throw an error whose `name`
  is `StepLimitError`, so a confused model can't loop forever.

```js
// tools comes from the tests: get_weather returns { city, tempC: 31 }
const replies = [
  { toolCalls: [{ id: "c1", name: "get_weather", arguments: '{"city":"Manila"}' }] },
  { content: "It's 31°C in Manila." },
];
const callModel = async () => replies.shift();
await runTools(callModel, tools, [{ role: "user", content: "Weather in Manila?" }]);
// → { answer: "It's 31°C in Manila.", steps: 2 }
```

The starter runs only the first tool call and never loops. Then explain why tool arguments are untrusted input and
which tools need a person to approve them.
