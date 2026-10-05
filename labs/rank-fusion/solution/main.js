// Scores from different searches live on different scales, so don't add them; combine positions instead. Reciprocal
// rank fusion gives each result 1 / (k + rank) per list and sums them: agreement between searches wins, and k (often
// 60) keeps a single first place from dominating. Then diversify, so one long article split into many chunks doesn't
// take every slot. Query rewriting (several phrasings, searched and fused) raises recall for vague questions at the
// cost of extra searches and latency.
function fuse(rankings, { k = 60, limit = 5 } = {}) {
  const scores = new Map();
  for (const ranking of rankings) {
    ranking.forEach((id, index) => scores.set(id, (scores.get(id) || 0) + 1 / (k + index + 1)));
  }
  return [...scores]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, limit);
}

function bestPerArticle(results) {
  const seen = new Set();
  return results.filter((result) => {
    const article = result.id.split("#")[0];
    if (seen.has(article)) return false;
    seen.add(article);
    return true;
  });
}
