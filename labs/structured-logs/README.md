At 2 a.m. you need every log line for one request, and none of them should hold a password. The starter writes lines
like `ERROR Payment failed {"orderId":7}`, which you can read but can't filter, and which print whatever they're given.

Write `createLogger({ write, now, fields })`. It returns `info`, `warn` and `error`, each `(message, extra)`, plus
`child(fields)`. Every call writes exactly one line, a JSON object, through `write(line)`, with:

- `time` from `now()` as an ISO string, `level`, and `msg`.
- The logger's `fields`, then `extra`, merged in. `child(fields)` returns a logger that adds its fields to every line,
  so a request handler can add `requestId` once.
- Secrets replaced by `"[redacted]"` at any depth, including inside arrays: any key named `password`, `token`,
  `secret`, `authorization`, `cookie`, `apiKey` or `card`, in any letter case.
- An `Error` in `extra.error` written as `{ name, message, stack }`. As it is, it would turn into `{}`.

```js
const lines = [];
const logger = createLogger({
  write: (line) => lines.push(line),
  now: () => new Date("2026-10-05T09:30:00Z"),
  fields: { service: "checkout" },
});
logger.child({ requestId: "req-1" }).info("Signed in", { password: "hunter2" });
JSON.parse(lines[0]);
// → {
//     time: "2026-10-05T09:30:00.000Z",
//     level: "info",
//     msg: "Signed in",
//     service: "checkout",
//     requestId: "req-1",
//     password: "[redacted]"
//   }
```

Then explain which fields every line in a service should carry, and why logging the request body is risky.
