function failing(errors, value = "ok") {
  const calls = [];
  return {
    calls,
    fn: async (attempt) => {
      calls.push(attempt);
      if (calls.length <= errors.length) throw errors[calls.length - 1];
      return value;
    },
  };
}
const httpError = (status, extra = {}) => Object.assign(new Error(`HTTP ${status}`), { status }, extra);
const recorder = () => { const delays = []; return { delays, sleep: async (ms) => { delays.push(ms); } }; };

test("succeeds after transient failures, waiting longer each time", async () => {
  const { calls, fn } = failing([httpError(503), httpError(503)]);
  const { delays, sleep } = recorder();
  assert.equal(await retry(fn, { sleep, random: () => 1 }), "ok");
  assert.deepEqual(calls, [0, 1, 2]);
  assert.deepEqual(delays, [100, 200], "the wait doubles: 100, then 200");
});

test("the wait is capped at maxMs", async () => {
  const { fn } = failing(Array.from({ length: 6 }, () => httpError(500)));
  const { delays, sleep } = recorder();
  await retry(fn, { retries: 6, sleep, random: () => 1 });
  assert.deepEqual(delays, [100, 200, 400, 800, 1600, 2000]);
});

test("jitter spreads the wait across the window", async () => {
  const { fn } = failing([httpError(429), httpError(429)]);
  const { delays, sleep } = recorder();
  await retry(fn, { sleep, random: () => 0.5 });
  assert.deepEqual(delays, [50, 100]);
});

test("a request that can never succeed isn't retried", async () => {
  for (const status of [400, 401, 403, 404, 422]) {
    const { calls, fn } = failing([httpError(status)]);
    const { sleep } = recorder();
    await assert.rejects(() => retry(fn, { sleep, random: () => 1 }));
    assert.equal(calls.length, 1, `a ${status} must not be retried`);
  }
});

test("network resets are retried", async () => {
  const reset = Object.assign(new Error("socket hang up"), { code: "ECONNRESET" });
  const { calls, fn } = failing([reset]);
  const { sleep } = recorder();
  await retry(fn, { sleep, random: () => 1 });
  assert.equal(calls.length, 2);
});

test("Retry-After from the server wins", async () => {
  const { fn } = failing([httpError(429, { retryAfterMs: 1500 })]);
  const { delays, sleep } = recorder();
  await retry(fn, { sleep, random: () => 1 });
  assert.deepEqual(delays, [1500]);
});

test("gives up after the last retry with the last error", async () => {
  const errors = [httpError(503), httpError(502), httpError(504), httpError(500)];
  const { calls, fn } = failing(errors);
  const { sleep } = recorder();
  let thrown = null;
  try { await retry(fn, { retries: 3, sleep, random: () => 1 }); } catch (error) { thrown = error; }
  assert.equal(calls.length, 4);
  assert.equal(thrown && thrown.status, 500, "the error from the final try is the one thrown");
});
