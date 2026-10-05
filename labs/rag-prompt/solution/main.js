// RAG works when the model answers from what you retrieved instead of from memory. Give it the best chunks that fit
// the budget, labeled so it can cite them, with clear instructions to stay within them and to say "I don't know"
// otherwise, and put the question last where it's read most reliably. Duplicates waste budget. Grounding instructions
// reduce invented answers but can't guarantee none, so check citations after the fact and show users the sources.
const INSTRUCTIONS = [
  "Answer the question using only the sources below.",
  "Cite every source you use as [id].",
  "If the sources don't contain the answer, reply exactly: I don't know.",
].join("\n");

function buildPrompt(question, chunks, { maxTokens, countTokens }) {
  const seen = new Set();
  const lines = [];
  const used = [];
  const assemble = (sourceLines) => `${INSTRUCTIONS}\n\nSources:\n${sourceLines.join("\n")}\n\nQuestion: ${question}`;
  for (const chunk of chunks) {
    if (seen.has(chunk.text)) continue;
    const line = `[${chunk.id}] ${chunk.text}`;
    if (countTokens(assemble([...lines, line])) > maxTokens) continue;
    seen.add(chunk.text);
    lines.push(line);
    used.push(chunk.id);
  }
  return { prompt: assemble(lines), used };
}

function checkCitations(answer, used) {
  const cited = [...new Set([...answer.matchAll(/\[([^\]\s]+)\]/g)].map((match) => match[1]))];
  return { cited, unknown: cited.filter((id) => !used.includes(id)) };
}
