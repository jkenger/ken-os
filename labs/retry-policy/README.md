`retry(fn, options)` calls `fn(attempt)` (attempt 0 is the first try) and tries again when it fails. The starter
retries every error after the same fixed pause. When a provider is overloaded, every client retrying in step makes it
worse, and retrying a bad request can never succeed. Make it:

- Retry only errors worth retrying: `status` 408, 429, 500, 502, 503 or 504, or `code` `ECONNRESET` or `ETIMEDOUT`.
  Anything else is thrown at once.
- Wait longer each time, with full jitter: a random time between 0 and `min(maxMs, baseMs * 2 ** attempt)`, using
  `random()`, so clients spread out.
- Honour `retryAfterMs` on the error when the server sent one; wait exactly that instead.
- Stop after `retries` retries and throw the last error.

Options: `retries` (default 3), `baseMs` (100), `maxMs` (2000), `sleep(ms)` and `random()`. The tests pass a fake
`sleep` and `random`, so nothing really waits. Then explain why retries need idempotency, and why jitter matters
more than the exact formula.
