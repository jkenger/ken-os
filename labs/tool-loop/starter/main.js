async function runTools(callModel, tools, messages, { maxSteps = 5 } = {}) {
  const reply = await callModel(messages);
  if (reply.content !== undefined) return { answer: reply.content, steps: 1 };
  const call = reply.toolCalls[0];
  const result = await tools[call.name](JSON.parse(call.arguments));
  return { answer: JSON.stringify(result), steps: 1 };
}
