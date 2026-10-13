// Short-term memory is the conversation itself, and it has to fit the context window. Dropping old turns loses what
// the user said; a running summary keeps the gist for a fraction of the tokens, at the price of a model call and some
// detail. Facts that must never blur (a name, an allergy, a decision) are pinned separately. Long-term memory is the
// same idea stored outside the chat (a database the assistant reads back next session), which adds the questions of
// what is worth saving, how it's retrieved, and how the user can see or delete it.
function createMemory({ maxTokens, keepRecent, countTokens, summarize }) {
  let messages = [];
  let summary = "";
  const facts = [];
  const size = () => messages.reduce((sum, message) => sum + countTokens(message.content), 0);

  return {
    async add(message) {
      messages.push(message);
      if (size() > maxTokens && messages.length > keepRecent) {
        const older = messages.slice(0, messages.length - keepRecent);
        messages = messages.slice(messages.length - keepRecent);
        summary = await summarize(summary, older);
      }
    },
    remember(fact) {
      if (!facts.includes(fact)) facts.push(fact);
    },
    context() {
      const pinned = facts.length
        ? [{ role: "system", content: `Known facts about the user:\n${facts.map((fact) => `- ${fact}`).join("\n")}` }]
        : [];
      const earlier = summary ? [{ role: "system", content: `Summary of earlier conversation: ${summary}` }] : [];
      return [...pinned, ...earlier, ...messages];
    },
  };
}
