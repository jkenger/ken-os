function fuse(rankings, { k = 60, limit = 5 } = {}) {
  const seen = [];
  for (const ranking of rankings) for (const id of ranking) if (!seen.includes(id)) seen.push(id);
  return seen.slice(0, limit).map((id, index) => ({ id, score: 1 / (index + 1) }));
}

function bestPerArticle(results) {
  return results;
}
