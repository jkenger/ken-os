test("attempt 0 waits 1000 ms", () => {
  assert.equal(retryDelay(0), 1000);
});

test("attempt 1 waits 2000 ms", () => {
  assert.equal(retryDelay(1), 2000);
});

test("attempt 2 waits 4000 ms", () => {
  assert.equal(retryDelay(2), 4000);
});

test("attempt 8 is capped at 30000 ms", () => {
  assert.equal(retryDelay(8), 30000);
});
