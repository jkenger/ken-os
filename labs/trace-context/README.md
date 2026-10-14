A checkout request goes from the web app to the orders service to the payments service. To see it as one trace, each
service must pass the trace on in a `traceparent` header (the W3C Trace Context format):

```
00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
version-trace id (32 hex)----------span id (16 hex)-flags
```

The starter starts a new trace in every service, so the three halves never connect. Write, using `ids.traceId()` and
`ids.spanId()` for new ids:

- `extract(header)` returns `{ traceId, parentSpanId }` from a valid header, or `null`. A valid header has version
  `00`, a 32-character and a 16-character lower-case hex id, neither all zeros, and two hex flag characters.
- `startSpan(headers, ids)` continues the trace from `headers.traceparent` when it's valid: the same `traceId`, a new
  `spanId`, and `parentSpanId` set to the caller's span. Otherwise it starts a new trace with `parentSpanId: null`.
- `childSpan(span, ids)` returns a span inside the same trace, whose parent is `span`.
- `inject(span)` returns the header to send downstream: `00-<traceId>-<spanId>-01`.

```js
// counterIds comes from the tests: predictable ids instead of random ones
const header = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
startSpan({ traceparent: header }, counterIds());
// → { traceId: "4bf92f3577b34da6a3ce929d0e0e4736", spanId: "bbbbbbbbbbbbbbb1", parentSpanId: "00f067aa0ba902b7" }
extract("not a header");
// → null
```

Then explain how a trace id in every log line connects logs and traces, and why a bad header starts a new trace
instead of failing the request.
