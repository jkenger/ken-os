const failWith = (status, message = `HTTP ${status}`) => async () => { const error = new Error(message); if (status) error.status = status; throw error; };
const answer = (text, finishReason = "stop") => async () => ({ text, finishReason });
function slow(log) {
  return (prompt, { signal } = {}) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ text: "too late", finishReason: "stop" }), 400);
    signal?.addEventListener("abort", () => { clearTimeout(timer); log.push("aborted"); });
  });
}

test("falls back past rate limits, outages, network errors and empty replies", async () => {
  const result = await generate([
    { name: "alpha", call: failWith(429) },
    { name: "beta", call: failWith(503) },
    { name: "gamma", call: failWith(undefined, "fetch failed") },
    { name: "delta", call: answer("   ") },
    { name: "epsilon", call: answer("Hello!") },
  ], "Say hello", { timeoutMs: 100 });
  assert.equal(result.ok, true);
  assert.equal(result.text, "Hello!");
  assert.equal(result.provider, "epsilon");
  assert.deepEqual(result.attempts.map((attempt) => attempt.outcome), ["status 429", "status 503", "network", "empty", "ok"]);
});

test("a slow provider is cut off and aborted", async () => {
  const log = [];
  const started = Date.now();
  const result = await generate([{ name: "alpha", call: slow(log) }, { name: "beta", call: answer("Fast answer") }], "Hi", { timeoutMs: 50 });
  assert.equal(result.provider, "beta");
  assert.equal(result.attempts[0].outcome, "timeout");
  assert.ok(Date.now() - started < 300, "it should not wait for the slow provider");
  assert.deepEqual(log, ["aborted"]);
});

test("a bad request is not retried elsewhere", async () => {
  let betaCalled = false;
  await assert.rejects(generate([
    { name: "alpha", call: failWith(400, "prompt is too long") },
    { name: "beta", call: async () => { betaCalled = true; return { text: "x", finishReason: "stop" }; } },
  ], "Hi", { timeoutMs: 100 }));
  assert.equal(betaCalled, false);
});

test("a content filter refusal is returned, not shopped around", async () => {
  let betaCalled = false;
  const result = await generate([
    { name: "alpha", call: answer("", "content_filter") },
    { name: "beta", call: async () => { betaCalled = true; return { text: "x", finishReason: "stop" }; } },
  ], "Hi", { timeoutMs: 100 });
  assert.deepEqual(result, { ok: false, reason: "content_filter", provider: "alpha" });
  assert.equal(betaCalled, false);
});

test("when every provider fails, the error lists each attempt", async () => {
  let error = null;
  try {
    await generate([{ name: "alpha", call: failWith(500) }, { name: "beta", call: failWith(429) }], "Hi", { timeoutMs: 100 });
  } catch (caught) { error = caught; }
  assert.ok(error);
  assert.equal(error.name, "AllProvidersFailed");
  assert.deepEqual(error.attempts.map((attempt) => attempt.provider), ["alpha", "beta"]);
});
