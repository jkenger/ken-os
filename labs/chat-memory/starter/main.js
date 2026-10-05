function createMemory({ maxTokens, keepRecent, countTokens, summarize }) {
  let messages = [];
  const size = () => messages.reduce((sum, message) => sum + countTokens(message.content), 0);
  return {
    async add(message) {
      messages.push(message);
      while (size() > maxTokens) messages.shift();
    },
    remember() {},
    context() {
      return [...messages];
    },
  };
}
