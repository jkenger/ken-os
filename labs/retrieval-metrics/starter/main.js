function evaluate(results, relevant, k) {
  const questions = Object.keys(results);
  const hits = questions.filter((id) => (relevant[id] || []).includes(results[id][0])).length;
  const rate = questions.length ? hits / questions.length : 0;
  return { recallAtK: rate, precisionAtK: rate, mrr: rate, perQuery: {} };
}
