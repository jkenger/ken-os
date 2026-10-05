// Retry only what might succeed next time: timeouts, rate limits, server errors and dropped connections. A 400 or a 404
// will fail the same way forever. Exponential backoff gives an overloaded service room to recover; full jitter (a
// random wait up to the window) stops many clients from retrying in lockstep, which matters more than the exact curve.
// A server's Retry-After beats any guess. And because a retried request may already have succeeded the first time,
// anything retried must be idempotent.
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_CODES = new Set(["ECONNRESET", "ETIMEDOUT"]);

function isRetryable(error) {
  return Boolean(error) && (RETRYABLE_STATUS.has(error.status) || RETRYABLE_CODES.has(error.code));
}

async function retry(fn, { retries = 3, baseMs = 100, maxMs = 2000, sleep, random = Math.random } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (!isRetryable(error) || attempt >= retries) throw error;
      const delay = typeof error.retryAfterMs === "number"
        ? error.retryAfterMs
        : random() * Math.min(maxMs, baseMs * 2 ** attempt);
      await sleep(delay);
    }
  }
}
