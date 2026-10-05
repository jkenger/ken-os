// Cost and latency are mostly decided by which model runs and how many tokens it reads. Answer from a cache when you
// can, try the small model first, and escalate only when it isn't confident, under a budget that degrades gracefully
// instead of failing. Only cache answers you'd stand behind. Other levers: shorter prompts and fewer retrieved chunks;
// provider prompt caching for a long shared prefix; streaming so the first words arrive fast even when the whole
// answer doesn't; and batch APIs, cheaper and slower, for work nobody is waiting on.
const normalize = (question) => question.trim().toLowerCase().replace(/\s+/g, " ");

function createAnswerer({ small, large, costOf, dailyBudgetUsd }) {
  const cache = new Map();
  let total = 0;
  const charge = (model, reply) => {
    const cost = costOf(model, reply);
    total += cost;
    return cost;
  };

  return {
    async answer(question) {
      const key = normalize(question);
      if (cache.has(key)) return { text: cache.get(key), model: "cache", costUsd: 0 };

      const quick = await small(question);
      let costUsd = charge("small", quick);
      if (quick.confident) {
        cache.set(key, quick.text);
        return { text: quick.text, model: "small", costUsd };
      }
      if (total >= dailyBudgetUsd) return { text: quick.text, model: "small", costUsd, degraded: true };

      const careful = await large(question);
      costUsd += charge("large", careful);
      cache.set(key, careful.text);
      return { text: careful.text, model: "large", costUsd };
    },
    spent: () => total,
  };
}
