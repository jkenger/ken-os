function counterIds() {
  let traces = 0, spans = 0;
  return {
    traceId: () => (++traces).toString(16).padStart(32, "a"),
    spanId: () => (++spans).toString(16).padStart(16, "b"),
  };
}
const valid = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

test("a valid header is read", () => {
  assert.deepEqual(extract(valid), { traceId: "4bf92f3577b34da6a3ce929d0e0e4736", parentSpanId: "00f067aa0ba902b7" });
});

test("invalid headers are rejected", () => {
  const bad = [
    "", "nonsense", "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01", "00-4bf92f35-00f067aa0ba902b7-01",
    "00-00000000000000000000000000000000-00f067aa0ba902b7-01", "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7", undefined,
  ];
  for (const header of bad) assert.equal(extract(header), null, `${JSON.stringify(header)} should be rejected`);
});

test("a service continues the caller's trace", () => {
  const span = startSpan({ traceparent: valid }, counterIds());
  assert.equal(span.traceId, "4bf92f3577b34da6a3ce929d0e0e4736");
  assert.equal(span.parentSpanId, "00f067aa0ba902b7");
  assert.ok(/^[0-9a-f]{16}$/.test(span.spanId) && span.spanId !== "00f067aa0ba902b7", "a new span id for this service");
});

test("no header, or a bad one, starts a new trace", () => {
  const ids = counterIds();
  const fresh = startSpan({}, ids);
  assert.equal(fresh.parentSpanId, null);
  assert.ok(/^[0-9a-f]{32}$/.test(fresh.traceId));
  const recovered = startSpan({ traceparent: "garbage" }, ids);
  assert.equal(recovered.parentSpanId, null);
});

test("three services end up in one trace", () => {
  const ids = counterIds();
  const web = startSpan({}, ids);
  const query = childSpan(web, ids);
  const orders = startSpan({ traceparent: inject(web) }, ids);
  const payments = startSpan({ traceparent: inject(orders) }, ids);
  assert.ok(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/.test(inject(web)), `inject wrote ${inject(web)}`);
  assert.equal(query.traceId, web.traceId);
  assert.equal(query.parentSpanId, web.spanId);
  assert.equal(orders.traceId, web.traceId);
  assert.equal(orders.parentSpanId, web.spanId);
  assert.equal(payments.traceId, web.traceId);
  assert.equal(payments.parentSpanId, orders.spanId);
  assert.equal(new Set([web.spanId, query.spanId, orders.spanId, payments.spanId]).size, 4);
});
