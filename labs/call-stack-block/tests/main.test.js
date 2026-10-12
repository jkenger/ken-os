const numbers = (count) => Array.from({ length: count }, (_, index) => index);

test("returns every result in order", async () => {
  assert.deepEqual(await processInChunks(numbers(5), (n) => n * 2, 2), [0, 2, 4, 6, 8]);
});

test("a timer gets a turn before the work is done", async () => {
  let processed = 0;
  let seenByTimer = null;
  setTimeout(() => {
    seenByTimer = processed;
  }, 0);
  await processInChunks(
    numbers(1000),
    (n) => {
      processed += 1;
      return n;
    },
    100,
  );
  assert.ok(seenByTimer !== null, "the timer never ran while the work was going");
  assert.ok(seenByTimer < 1000, `the timer only ran after all ${seenByTimer} items`);
});

test("the timer runs right after the first chunk", async () => {
  let processed = 0;
  let seenByTimer = null;
  setTimeout(() => {
    seenByTimer = processed;
  }, 0);
  await processInChunks(
    numbers(500),
    (n) => {
      processed += 1;
      return n;
    },
    100,
  );
  assert.equal(seenByTimer, 100);
});

test("an empty list returns an empty list", async () => {
  assert.deepEqual(await processInChunks([], (n) => n, 10), []);
});
