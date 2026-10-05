function summarizeRun(spans, prices) {
  const llm = spans.filter((span) => span.kind === "llm");
  const input = llm.reduce((sum, span) => sum + span.inputTokens, 0);
  const output = llm.reduce((sum, span) => sum + span.outputTokens, 0);
  const costUsd = llm.reduce((sum, span) => sum + (span.inputTokens * prices[span.model].input + span.outputTokens * prices[span.model].output) / 1e6, 0);
  const steps = spans.filter((span) => span.kind !== "run");
  const durationMs = steps.reduce((sum, span) => sum + (span.end - span.start), 0);
  return { durationMs, tokens: { input, output }, costUsd, byModel: {}, slowest: null, failedTools: [], unpriced: [] };
}
