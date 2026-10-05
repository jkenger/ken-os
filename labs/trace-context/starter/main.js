function extract(header) {
  const [version, traceId, spanId] = String(header).split("-");
  return { traceId, parentSpanId: spanId };
}

function startSpan(headers, ids) {
  return { traceId: ids.traceId(), spanId: ids.spanId(), parentSpanId: null };
}

function childSpan(span, ids) {
  return { traceId: ids.traceId(), spanId: ids.spanId(), parentSpanId: null };
}

function inject(span) {
  return `${span.traceId}-${span.spanId}`;
}
