// Two stages: a cheap search narrows thousands of documents to a shortlist, then an expensive model that reads the
// question and each candidate together reorders that shortlist. Cost and latency grow with the shortlist, so batch the
// calls and pick its size with your retrieval metrics: grow it until recall at the shortlist stops improving. Keep the
// first-stage order as the tie-breaker, so equal scores don't shuffle results between runs.
async function rerank(query, candidates, scorer, { shortlist = 20, batchSize = 8, keep = 5 } = {}) {
  const pool = candidates.slice(0, shortlist);
  const scored = [];
  for (let start = 0; start < pool.length; start += batchSize) {
    const batch = pool.slice(start, start + batchSize);
    const scores = await scorer(query, batch);
    batch.forEach((candidate, i) => scored.push({ id: candidate.id, score: scores[i], rank: start + i }));
  }
  return scored
    .sort((a, b) => b.score - a.score || a.rank - b.rank)
    .slice(0, keep)
    .map(({ id, score }) => ({ id, score }));
}
