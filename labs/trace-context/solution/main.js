// A trace is a tree of spans sharing one trace id. Each service reads the caller's traceparent, keeps the trace id,
// records the caller's span as its parent, starts its own span, and sends its own span id downstream. Validate the
// header strictly (version, lengths, lower-case hex, not all zeros), and on a bad one start a new trace rather than
// failing the request: tracing must never break the work it observes. Put the trace id in every log line too, so
// you can jump from a slow span to its logs.
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

function extract(header) {
  const match = typeof header === "string" ? TRACEPARENT.exec(header) : null;
  if (!match) return null;
  const [, traceId, spanId] = match;
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) return null;
  return { traceId, parentSpanId: spanId };
}

function startSpan(headers, ids) {
  const parent = extract(headers && headers.traceparent);
  return parent
    ? { traceId: parent.traceId, spanId: ids.spanId(), parentSpanId: parent.parentSpanId }
    : { traceId: ids.traceId(), spanId: ids.spanId(), parentSpanId: null };
}

function childSpan(span, ids) {
  return { traceId: span.traceId, spanId: ids.spanId(), parentSpanId: span.spanId };
}

function inject(span) {
  return `00-${span.traceId}-${span.spanId}-01`;
}
