// 50 candidates; the fake reranker prefers ids whose number ends in 7, then ties everything else at 0.1.
const candidates = Array.from({ length: 50 }, (_, i) => ({ id: `doc-${i + 1}`, text: `text ${i + 1}` }));
function fakeScorer() {
  const calls = [];
  const scorer = async (query, batch) => {
    calls.push(batch.map((candidate) => candidate.id));
    return batch.map((candidate) => (candidate.id.endsWith("7") ? 0.9 - Number(candidate.id.slice(4)) / 1000 : 0.1));
  };
  return { calls, scorer };
}

test("only the shortlist is scored, in batches", async () => {
  const { calls, scorer } = fakeScorer();
  await rerank("q", candidates, scorer, { shortlist: 20, batchSize: 8, keep: 5 });
  assert.equal(calls.length, 3, "20 candidates in batches of 8 is 3 calls");
  assert.ok(calls.every((batch) => batch.length <= 8));
  assert.deepEqual(calls.flat(), candidates.slice(0, 20).map((candidate) => candidate.id), "candidates past the shortlist are never scored");
});

test("results are reordered by the reranker's scores", async () => {
  const { scorer } = fakeScorer();
  const results = await rerank("q", candidates, scorer, { shortlist: 20, batchSize: 8, keep: 3 });
  assert.deepEqual(results.map((result) => result.id), ["doc-7", "doc-17", "doc-1"]);
  assert.ok(Math.abs(results[0].score - 0.893) < 1e-9);
});

test("ties keep the first-stage order", async () => {
  const { scorer } = fakeScorer();
  const results = await rerank("q", candidates, scorer, { shortlist: 6, batchSize: 4, keep: 4 });
  assert.deepEqual(results.map((result) => result.id), ["doc-1", "doc-2", "doc-3", "doc-4"]);
});
