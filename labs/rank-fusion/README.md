Vector search misses exact terms like error codes; keyword search misses paraphrases. Hybrid search runs both and
combines them. Their scores can't be added: a keyword score of 12.4 and a cosine of 0.81 are on different scales. Rank
positions can be combined, though.

Write `fuse(rankings, { k = 60, limit = 5 })`. `rankings` is a list of ranked id lists, one per search. Using
**reciprocal rank fusion**, each id scores the sum of `1 / (k + rank)` over the lists it appears in, with rank 1 for
first place. Return up to `limit` results as `{ id, score }`, best first, ties broken by id.

Many results are chunks of the same article, shaped `"article#chunk"`. Also write `bestPerArticle(results)`, which
keeps only the best-scoring chunk of each article, in order, so one long article can't fill every slot.

The starter appends the vector results after the keyword ones. Then explain when query rewriting helps (several
phrasings searched and fused) and what it costs.
