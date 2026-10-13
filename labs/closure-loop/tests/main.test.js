test("each handler returns its own label", () => {
  const handlers = makeHandlers(["a", "b", "c"]);
  assert.deepEqual(
    handlers.map((handler) => handler()),
    ["clicked a", "clicked b", "clicked c"],
  );
});

test("counters keep separate counts", () => {
  const first = createCounter();
  const second = createCounter();
  first.increment();
  first.increment();
  second.increment();
  assert.equal(first.read(), 2);
  assert.equal(second.read(), 1);
});
