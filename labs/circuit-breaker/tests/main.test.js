function fakeService() {
  const service = { up: false, calls: 0 };
  service.fn = async (userId) => {
    service.calls += 1;
    if (!service.up) throw new Error("service unavailable");
    return [`picked for ${userId}`];
  };
  return service;
}
function clock() {
  let time = 1000;
  return {
    now: () => time,
    advance: (ms) => {
      time += ms;
    },
  };
}
const attempt = async (breaker) => {
  try {
    return await breaker.call("u1");
  } catch (error) {
    return error;
  }
};

test("it opens after the threshold and then fails fast", async () => {
  const service = fakeService();
  const time = clock();
  const breaker = createBreaker(service.fn, { failureThreshold: 3, cooldownMs: 10000, now: time.now });
  for (let i = 0; i < 3; i += 1) await attempt(breaker);
  assert.equal(breaker.state(), "open");
  assert.equal(service.calls, 3);
  const error = await attempt(breaker);
  assert.equal(error.name, "BreakerOpenError");
  assert.equal(service.calls, 3, "an open breaker must not call the service");
});

test("a success resets the count of failures", async () => {
  const service = fakeService();
  const breaker = createBreaker(service.fn, { failureThreshold: 3, now: clock().now });
  await attempt(breaker);
  await attempt(breaker);
  service.up = true;
  await attempt(breaker);
  service.up = false;
  await attempt(breaker);
  await attempt(breaker);
  assert.equal(breaker.state(), "closed", "only failures in a row count");
});

test("after the cooldown one trial call decides", async () => {
  const service = fakeService();
  const time = clock();
  const breaker = createBreaker(service.fn, { failureThreshold: 2, cooldownMs: 5000, now: time.now });
  await attempt(breaker);
  await attempt(breaker);
  time.advance(4999);
  assert.equal((await attempt(breaker)).name, "BreakerOpenError", "still cooling down");
  time.advance(1);
  assert.equal(breaker.state(), "half-open");
  await attempt(breaker);
  assert.equal(service.calls, 3, "one trial call went through");
  assert.equal(breaker.state(), "open", "the trial failed, so it opens again");
  time.advance(5000);
  service.up = true;
  assert.deepEqual(await attempt(breaker), ["picked for u1"]);
  assert.equal(breaker.state(), "closed");
});

test("the page falls back to popular items instead of an error", async () => {
  const service = fakeService();
  const breaker = createBreaker(service.fn, { failureThreshold: 1, now: clock().now });
  const popular = ["bestseller"];
  assert.deepEqual(await recommendationsFor(breaker, "u1", popular), popular);
  assert.deepEqual(await recommendationsFor(breaker, "u1", popular), popular, "also while the breaker is open");
  assert.equal(service.calls, 1);
});
