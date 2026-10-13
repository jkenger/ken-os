// The model only proposes tool calls; your code decides whether and how they run. Treat the arguments as untrusted
// input: parse them defensively and validate before acting. Errors the model caused (bad JSON, an unknown tool, a
// failing tool) go back to it as tool results so it can recover, instead of crashing the request. Cap the number of
// steps so a confused model can't loop forever. Read-only tools can run freely; anything that spends money, sends
// messages or changes data should wait for a person's approval.
async function runTools(callModel, tools, messages, { maxSteps = 5 } = {}) {
  const history = [...messages];
  for (let step = 1; step <= maxSteps; step += 1) {
    const reply = await callModel(history);
    if (!reply.toolCalls || !reply.toolCalls.length) return { answer: reply.content, steps: step };
    history.push({ role: "assistant", toolCalls: reply.toolCalls });
    for (const call of reply.toolCalls) {
      history.push({ role: "tool", toolCallId: call.id, content: JSON.stringify(await runOne(tools, call)) });
    }
  }
  const error = new Error(`Stopped after ${maxSteps} model calls without a final answer`);
  error.name = "StepLimitError";
  throw error;
}

async function runOne(tools, call) {
  const tool = Object.prototype.hasOwnProperty.call(tools, call.name) ? tools[call.name] : null;
  if (!tool) return { error: `There is no tool called ${call.name}` };
  let args;
  try {
    args = JSON.parse(call.arguments || "{}");
  } catch {
    return { error: "The arguments weren't valid JSON" };
  }
  try {
    return await tool(args);
  } catch (error) {
    return { error: `The tool failed: ${error.message}` };
  }
}
