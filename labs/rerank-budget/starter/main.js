async function rerank(query, candidates, scorer, { shortlist = 20, batchSize = 8, keep = 5 } = {}) {
  const scored = [];
  for (const candidate of candidates) {
    const [score] = await scorer(query, [candidate]);
    scored.push({ id: candidate.id, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, keep);
}
