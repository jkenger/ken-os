const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${label}: expected ${expected}, got ${actual}`);

test("an id found by both searches beats one found by a single search", () => {
  const keyword = ["err-504#1", "timeouts#2", "billing#1"];
  const vector = ["timeouts#2", "retries#1", "err-504#1"];
  const ids = fuse([keyword, vector], { k: 60, limit: 5 }).map((result) => result.id);
  assert.deepEqual(ids.slice(0, 2).sort(), ["err-504#1", "timeouts#2"], "ids in both lists come first");
  assert.deepEqual(ids, ["timeouts#2", "err-504#1", "retries#1", "billing#1"]);
});

test("scores follow 1 / (k + rank)", () => {
  const results = fuse(
    [
      ["a", "b"],
      ["b", "c"],
    ],
    { k: 60 },
  );
  const score = Object.fromEntries(results.map((result) => [result.id, result.score]));
  close(score.b, 1 / 62 + 1 / 61, "b is 2nd in one list and 1st in the other");
  close(score.a, 1 / 61, "a is 1st in one list");
  close(score.c, 1 / 62, "c is 2nd in one list");
});

test("limit and ties", () => {
  const results = fuse(
    [
      ["z", "y"],
      ["y", "z"],
    ],
    { k: 60, limit: 1 },
  );
  assert.deepEqual(
    results.map((result) => result.id),
    ["y"],
    "y and z tie, so the id breaks it",
  );
});

test("one article can't fill every slot", () => {
  const results = [
    { id: "guide#3", score: 0.05 },
    { id: "guide#1", score: 0.04 },
    { id: "faq#2", score: 0.03 },
    { id: "guide#7", score: 0.02 },
    { id: "blog#1", score: 0.01 },
  ];
  assert.deepEqual(
    bestPerArticle(results).map((result) => result.id),
    ["guide#3", "faq#2", "blog#1"],
  );
});
