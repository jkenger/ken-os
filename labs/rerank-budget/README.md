First-stage search is fast but rough. A reranker reads the question and a candidate together and scores how well it
answers, much more accurately and much more slowly. So rerank a shortlist, not everything.

`rerank(query, candidates, scorer, { shortlist = 20, batchSize = 8, keep = 5 })`:

- `candidates` come from first-stage search, best first, each `{ id, text }`.
- Score only the first `shortlist` candidates, by calling `await scorer(query, batch)` with batches of at most
  `batchSize` candidates. It returns one score per candidate in the batch, in order.
- Return the best `keep` as `{ id, score }`, highest score first. When scores tie, the earlier first-stage rank wins.

The starter scores every candidate one call at a time. Then explain the latency and cost trade-off between shortlist
size and quality, and how you'd choose `shortlist` with your retrieval metrics.
