// 95 fast requests and 5 very slow ones: the average looks fine, the tail doesn't.
const traffic = [
  ...Array.from({ length: 95 }, (_, i) => ({ ms: 50 + i, status: 200 })),
  { ms: 2400, status: 200 }, { ms: 3100, status: 504 }, { ms: 2800, status: 200 }, { ms: 4000, status: 503 }, { ms: 2900, status: 200 },
];

test("percentiles use the nearest rank", () => {
  const summary = summarize([{ ms: 40, status: 200 }, { ms: 10, status: 200 }, { ms: 30, status: 200 }, { ms: 20, status: 200 }]);
  assert.equal(summary.count, 4);
  assert.equal(summary.p50, 20);
  assert.equal(summary.p95, 40);
  assert.equal(summary.max, 40);
});

test("the tail shows up even when the average looks fine", () => {
  const summary = summarize(traffic);
  assert.equal(summary.p50, 99);
  assert.equal(summary.p95, 144);
  assert.equal(summary.p99, 3100);
  assert.equal(summary.max, 4000);
});

test("only server errors count toward the error rate", () => {
  const summary = summarize([
    { ms: 10, status: 200 }, { ms: 10, status: 201 }, { ms: 10, status: 404 }, { ms: 10, status: 500 }, { ms: 10, status: 503 },
  ]);
  assert.equal(summary.errorRate, 0.4, "a 404 is the client's mistake; a 201 is a success");
});

test("no requests means zeros, not NaN", () => {
  assert.deepEqual(summarize([]), { count: 0, errorRate: 0, p50: 0, p95: 0, p99: 0, max: 0 });
});

test("buckets are cumulative and end with +Inf", () => {
  assert.deepEqual(bucketCounts([20, 80, 120, 250, 900, 3000], [100, 250, 1000]), [
    { le: 100, count: 2 }, { le: 250, count: 4 }, { le: 1000, count: 5 }, { le: "+Inf", count: 6 },
  ]);
});
