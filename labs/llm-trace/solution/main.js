// A trace of an AI run answers the questions logs can't: which step was slow, which call cost the most, which tool
// failed. Record on each model span the model, token counts, latency, finish reason and the prompt version, and keep
// raw prompts and outputs out by default (they carry personal data) or behind redaction and short retention. Time is
// wall clock because steps overlap. Price per model from a table you keep current, and surface missing prices instead
// of hiding them. At high volume, keep every failed or slow run and a sample of the rest.
const round = (value) => Math.round(value * 1e6) / 1e6;

function summarizeRun(spans, prices) {
  const durationMs = Math.max(...spans.map((span) => span.end)) - Math.min(...spans.map((span) => span.start));
  const tokens = { input: 0, output: 0 };
  const byModel = {};
  const unpriced = [];
  let cost = 0;

  for (const span of spans.filter((item) => item.kind === "llm")) {
    tokens.input += span.inputTokens;
    tokens.output += span.outputTokens;
    const entry = byModel[span.model] ?? (byModel[span.model] = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 });
    entry.calls += 1;
    entry.inputTokens += span.inputTokens;
    entry.outputTokens += span.outputTokens;
    const price = prices[span.model];
    if (!price) {
      if (!unpriced.includes(span.model)) unpriced.push(span.model);
      continue;
    }
    const spanCost = (span.inputTokens * price.input + span.outputTokens * price.output) / 1e6;
    entry.costUsd = round(entry.costUsd + spanCost);
    cost += spanCost;
  }
  for (const model of unpriced) byModel[model].costUsd = null;

  const steps = spans.filter((span) => span.kind !== "run");
  const slowestSpan = steps.reduce((best, span) => (!best || span.end - span.start > best.end - best.start ? span : best), null);
  return {
    durationMs,
    tokens,
    costUsd: round(cost),
    byModel,
    slowest: slowestSpan ? { name: slowestSpan.name, durationMs: slowestSpan.end - slowestSpan.start } : null,
    failedTools: steps.filter((span) => span.kind === "tool" && span.error).map((span) => span.name),
    unpriced,
  };
}
