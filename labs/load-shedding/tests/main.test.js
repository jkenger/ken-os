// Tasks we finish by hand, recording how many run at the same time.
function harness() {
  const state = { running: 0, peak: 0, started: [], finishers: new Map() };
  state.task = (name) => () => new Promise((resolve, reject) => {
    state.running += 1;
    state.peak = Math.max(state.peak, state.running);
    state.started.push(name);
    state.finishers.set(name, {
      ok: () => { state.running -= 1; resolve(name); },
      fail: () => { state.running -= 1; reject(new Error(`${name} failed`)); },
    });
  });
  return state;
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("no more than maxConcurrent run at once, and the rest start in order", async () => {
  const h = harness();
  const limiter = createLimiter({ maxConcurrent: 2, maxQueue: 10 });
  const results = ["a", "b", "c", "d"].map((name) => limiter.run(h.task(name)));
  await tick();
  assert.deepEqual(h.started, ["a", "b"]);
  assert.equal(limiter.active(), 2);
  assert.equal(limiter.waiting(), 2);
  h.finishers.get("a").ok(); await tick();
  assert.deepEqual(h.started, ["a", "b", "c"]);
  h.finishers.get("b").ok(); h.finishers.get("c").ok(); await tick();
  h.finishers.get("d").ok();
  assert.deepEqual(await Promise.all(results), ["a", "b", "c", "d"]);
  assert.equal(h.peak, 2);
});

test("a full queue turns work away at once", async () => {
  const h = harness();
  const limiter = createLimiter({ maxConcurrent: 1, maxQueue: 1 });
  limiter.run(h.task("a"));
  limiter.run(h.task("b"));
  let error = null;
  limiter.run(h.task("c")).catch((caught) => { error = caught; });
  await tick();
  assert.ok(error, "the third task should be refused at once, not queued or started");
  assert.equal(error.name, "OverloadedError");
  await tick();
  assert.deepEqual(h.started, ["a"], "the refused task never starts");
});

test("a failing task frees its place and reports to its own caller", async () => {
  const h = harness();
  const limiter = createLimiter({ maxConcurrent: 1, maxQueue: 5 });
  const first = limiter.run(h.task("a"));
  const second = limiter.run(h.task("b"));
  await tick();
  h.finishers.get("a").fail();
  await assert.rejects(first);
  await tick();
  assert.deepEqual(h.started, ["a", "b"], "the next task starts after a failure too");
  h.finishers.get("b").ok();
  assert.equal(await second, "b");
  assert.equal(limiter.active(), 0);
});
