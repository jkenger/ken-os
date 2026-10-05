function setup(fields) {
  const lines = [];
  const logger = createLogger({ write: (line) => lines.push(line), now: () => new Date("2026-10-05T09:30:00.000Z"), fields });
  const parsed = () => lines.map((line) => {
    try { return JSON.parse(line); } catch { throw new Error(`Not a JSON line: ${line}`); }
  });
  return { lines, logger, parsed };
}

test("each call writes one JSON line with time, level and message", () => {
  const { lines, logger, parsed } = setup({ service: "checkout" });
  logger.info("Order placed", { orderId: 7, totalCents: 2500 });
  assert.equal(lines.length, 1);
  assert.ok(!lines[0].includes("\n"), "one event, one line");
  assert.deepEqual(parsed()[0], { time: "2026-10-05T09:30:00.000Z", level: "info", msg: "Order placed", service: "checkout", orderId: 7, totalCents: 2500 });
});

test("a child logger adds its fields to every line", () => {
  const { logger, parsed } = setup({ service: "checkout" });
  const request = logger.child({ requestId: "req-123" });
  request.warn("Slow payment", { ms: 2400 });
  request.child({ userId: 9 }).info("Done");
  const [first, second] = parsed();
  assert.equal(first.requestId, "req-123");
  assert.equal(first.level, "warn");
  assert.equal(second.requestId, "req-123");
  assert.equal(second.userId, 9);
  assert.equal(second.service, "checkout");
});

test("secrets are redacted at any depth", () => {
  const { lines, logger, parsed } = setup({});
  logger.info("Login", {
    user: { email: "ana@example.com", Password: "hunter2" },
    headers: { Authorization: "Bearer abc", cookie: "sid=1" },
    attempts: [{ token: "t-1", ok: false }],
    apiKey: "sk-123",
    card: "4242 4242 4242 4242",
  });
  const line = parsed()[0];
  assert.equal(line.user.email, "ana@example.com");
  assert.equal(line.user.Password, "[redacted]");
  assert.equal(line.headers.Authorization, "[redacted]");
  assert.equal(line.headers.cookie, "[redacted]");
  assert.equal(line.attempts[0].token, "[redacted]");
  assert.equal(line.apiKey, "[redacted]");
  assert.equal(line.card, "[redacted]");
  for (const secret of ["hunter2", "Bearer abc", "sid=1", "t-1", "sk-123", "4242"]) {
    assert.ok(!lines[0].includes(secret), `"${secret}" must never reach the log`);
  }
});

test("errors keep their name, message and stack", () => {
  const { logger, parsed } = setup({});
  const failure = new TypeError("card is undefined");
  logger.error("Payment failed", { orderId: 7, error: failure });
  const line = parsed()[0];
  assert.equal(line.level, "error");
  assert.equal(line.error.name, "TypeError");
  assert.equal(line.error.message, "card is undefined");
  assert.ok(typeof line.error.stack === "string" && line.error.stack.length > 0);
});
