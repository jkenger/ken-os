// Embeddings put similar meanings in similar directions, so compare direction: cosine similarity divides the dot
// product by both lengths. A raw dot product rewards long vectors (often long documents) regardless of topic. Apply
// metadata filters before ranking, or a filter after a top-k cut can leave you with nothing. A minimum score keeps the
// search from always returning something. Nearest neighbours can still be confidently wrong: exact names, codes and
// rare terms are where keyword search, or both combined, does better.
function cosine(a, b) {
  let dot = 0, lengthA = 0, lengthB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    lengthA += a[i] * a[i];
    lengthB += b[i] * b[i];
  }
  return lengthA && lengthB ? dot / (Math.sqrt(lengthA) * Math.sqrt(lengthB)) : 0;
}

function search(query, docs, { k = 3, filter = {}, minScore = 0 } = {}) {
  return docs
    .filter((doc) => Object.entries(filter).every(([key, value]) => doc.meta && doc.meta[key] === value))
    .map((doc) => ({ id: doc.id, score: cosine(query, doc.vector) }))
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, k);
}
