function buildMessages({ system, history, documents, question }, { budget, countTokens }) {
  const all = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: documents.map((doc) => doc.text).join("\n") },
    { role: "user", content: question },
  ];
  const kept = [];
  let used = 0;
  for (const message of all) {
    const size = countTokens(message.content);
    if (used + size > budget) break;
    kept.push(message);
    used += size;
  }
  return kept;
}
