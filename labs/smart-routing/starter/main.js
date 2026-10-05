function createAnswerer({ small, large, costOf, dailyBudgetUsd }) {
  let total = 0;
  return {
    async answer(question) {
      const reply = await large(question);
      const costUsd = costOf("large", reply);
      total += costUsd;
      return { text: reply.text, model: "large", costUsd };
    },
    spent: () => total,
  };
}
