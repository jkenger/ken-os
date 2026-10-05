function buildPrompt(question, chunks, { maxTokens, countTokens }) {
  const context = chunks.map((chunk) => chunk.text).join("\n");
  return { prompt: `${context}\n\nQuestion: ${question}`, used: chunks.map((chunk) => chunk.id) };
}

function checkCitations(answer, used) {
  return { cited: [], unknown: [] };
}
