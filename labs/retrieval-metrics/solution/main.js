// Retrieval is measurable before any model is involved: label which documents answer each test question, run the
// search, and score the ranking. Recall@k asks whether the right documents were found at all within what the model
// will read; precision@k asks how much of that is noise; MRR asks how high the first good one sits. For RAG, recall at
// the number of chunks you pass in matters most, because the model can't use what it never sees. Keep per-question
// scores: averages hide the questions that regressed.
function evaluate(results, relevant, k) {
  const perQuery = {};
  for (const [id, wanted] of Object.entries(relevant)) {
    if (!wanted || !wanted.length) continue;
    const top = (results[id] || []).slice(0, k);
    const hits = top.filter((doc) => wanted.includes(doc)).length;
    const firstHit = top.findIndex((doc) => wanted.includes(doc));
    perQuery[id] = { recall: hits / wanted.length, precision: hits / k, reciprocalRank: firstHit === -1 ? 0 : 1 / (firstHit + 1) };
  }
  const scores = Object.values(perQuery);
  const mean = (key) => (scores.length ? scores.reduce((sum, score) => sum + score[key], 0) / scores.length : 0);
  return { recallAtK: mean("recall"), precisionAtK: mean("precision"), mrr: mean("reciprocalRank"), perQuery };
}
