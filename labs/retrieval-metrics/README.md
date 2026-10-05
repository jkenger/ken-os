You changed how documents are chunked. Did search get better? Eyeballing a few queries won't tell you. You have a
labeled set: for each test question, the document ids a good search should find.

`evaluate(results, relevant, k)` takes `results` (question id → ranked doc ids from your search) and `relevant`
(question id → the correct doc ids), and returns `{ recallAtK, precisionAtK, mrr, perQuery }`:

- **Recall@k**: of the relevant docs, the share found in the top `k`.
- **Precision@k**: of the top `k` results, the share that are relevant. Divide by `k`, even when fewer came back.
- **MRR**: one over the position of the first relevant result (1 for first place, 0.5 for second), or 0 if none.
- Each is averaged over the questions. A question with no relevant docs is left out; it can't be scored.
- `perQuery` maps each scored question id to its own `{ recall, precision, reciprocalRank }`.

The starter only checks whether the first result is relevant, and reports that for all three. Then explain which
metric matters most for RAG, where the model reads the top few chunks, and why per-question results matter.
