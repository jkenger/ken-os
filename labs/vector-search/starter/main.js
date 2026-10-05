function search(query, docs, { k = 3, filter = {}, minScore = 0 } = {}) {
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  return docs
    .map((doc) => ({ id: doc.id, score: dot(query, doc.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
