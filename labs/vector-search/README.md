Each help article has an embedding: a vector where articles with similar meaning point in similar directions. A
question is embedded the same way, and search returns the closest articles. The vectors here are tiny, made-up
3-number versions so you can reason about them; real ones have hundreds of numbers.

`search(query, docs, { k, filter, minScore })` takes a query vector and docs shaped `{ id, vector, meta }`, and returns
the top `k` as `{ id, score }`, best first:

- Score by **cosine similarity**: the dot product divided by both vectors' lengths, so only direction counts. The
  starter uses the raw dot product, so a long vector wins whatever it points at.
- `filter` is an object like `{ lang: "en" }`; only docs whose `meta` matches every key are considered, and
  filtering happens before ranking, so you still get `k` results when enough match.
- Drop results scoring below `minScore` (default 0).
- Break ties by `id`, so results are stable.

```js
const docs = [
  { id: "a", vector: [2, 0, 0], meta: {} },
  { id: "b", vector: [1, 1, 0], meta: {} },
];
search([1, 0, 0], docs, { k: 2 });
// → [{ id: "a", score: 1 }, { id: "b", score: 0.7071067811865475 }]
```

Then explain why an embedding search can return something confidently wrong, and when keyword search does better.
