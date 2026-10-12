const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`);

const results = {
  q1: ["a", "b", "c", "d"],
  q2: ["x", "y", "z"],
  q3: ["m", "n"],
  q4: ["p", "q", "r"],
};
const relevant = {
  q1: ["a", "c"],
  q2: ["z", "w"],
  q3: ["o"],
  q4: [],
};

test("each question gets its own scores", () => {
  const { perQuery } = evaluate(results, relevant, 3);
  close(perQuery.q1.recall, 1, "q1 recall@3 (a and c both in the top 3)");
  close(perQuery.q1.precision, 2 / 3, "q1 precision@3");
  close(perQuery.q1.reciprocalRank, 1, "q1 MRR (a is first)");
  close(perQuery.q2.recall, 0.5, "q2 recall@3 (z found, w missed)");
  close(perQuery.q2.reciprocalRank, 1 / 3, "q2 MRR (first relevant is third)");
  close(perQuery.q3.precision, 0, "q3 precision@3 (nothing relevant)");
  close(perQuery.q3.reciprocalRank, 0, "q3 MRR");
});

test("averages leave out questions with nothing relevant", () => {
  const report = evaluate(results, relevant, 3);
  assert.equal("q4" in report.perQuery, false);
  close(report.recallAtK, (1 + 0.5 + 0) / 3, "recall@3");
  close(report.precisionAtK, (2 / 3 + 1 / 3 + 0) / 3, "precision@3");
  close(report.mrr, (1 + 1 / 3 + 0) / 3, "MRR");
});

test("precision divides by k even when fewer results came back", () => {
  const { perQuery } = evaluate({ q: ["a"] }, { q: ["a"] }, 5);
  close(perQuery.q.precision, 0.2, "one relevant result in a top 5 is 0.2");
});

test("only the top k count", () => {
  const { perQuery } = evaluate({ q: ["x", "y", "a"] }, { q: ["a"] }, 2);
  close(perQuery.q.recall, 0, "a at position 3 doesn't count for recall@2");
  close(perQuery.q.reciprocalRank, 0, "nor for MRR within the top 2");
});
