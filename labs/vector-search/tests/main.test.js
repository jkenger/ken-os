const docs = [
  { id: "reset-password", vector: [0.9, 0.1, 0.0], meta: { lang: "en" } },
  { id: "billing-long", vector: [3.0, 3.0, 0.0], meta: { lang: "en" } },
  { id: "refunds", vector: [0.1, 0.9, 0.1], meta: { lang: "en" } },
  { id: "reset-password-es", vector: [0.88, 0.12, 0.0], meta: { lang: "es" } },
  { id: "shipping", vector: [0.0, 0.1, 0.9], meta: { lang: "en" } },
];
const ids = (results) => results.map((result) => result.id);

test("cosine similarity ranks by direction, not length", () => {
  const results = search([1, 0, 0], docs, { k: 2, filter: { lang: "en" } });
  assert.equal(results[0].id, "reset-password", "the long billing vector must not win just because it's long");
  assert.ok(
    Math.abs(results[0].score - 0.9939) < 0.001,
    `cosine of reset-password should be about 0.994, got ${results[0].score}`,
  );
});

test("scores stay between -1 and 1", () => {
  for (const result of search([2, 2, 2], docs, { k: 5 }))
    assert.ok(result.score <= 1.0000001 && result.score >= -1.0000001);
});

test("the filter applies before ranking", () => {
  assert.deepEqual(ids(search([1, 0, 0], docs, { k: 1, filter: { lang: "es" } })), ["reset-password-es"]);
  assert.equal(
    search([0, 0, 1], docs, { k: 3, filter: { lang: "en" } }).length,
    3,
    "still k results when enough docs match",
  );
});

test("weak matches are dropped", () => {
  const results = search([0, 0, 1], docs, { k: 5, filter: { lang: "en" }, minScore: 0.5 });
  assert.deepEqual(ids(results), ["shipping"]);
});

test("ties are broken by id", () => {
  const twins = [
    { id: "b", vector: [1, 0], meta: {} },
    { id: "a", vector: [2, 0], meta: {} },
  ];
  assert.deepEqual(ids(search([1, 0], twins, { k: 2 })), ["a", "b"]);
});
