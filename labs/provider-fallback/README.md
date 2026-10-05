Model providers have outages, rate limits and slow days. The starter calls the first provider and fails with it.

`generate(providers, prompt, { timeoutMs })` tries providers in order. Each provider is `{ name, call }`, where
`call(prompt, { signal })` resolves to `{ text, finishReason }` or throws an error that may have a `status`.

- Move to the next provider when a call takes longer than `timeoutMs` (abort it through `signal`), fails with status
  `429` or `500` and up, fails with no status (a network error), or returns empty text.
- Don't move on when the request itself is the problem: a `400` is thrown straight away, since every provider would
  reject it. A `finishReason` of `content_filter` is returned as `{ ok: false, reason: "content_filter", provider }`
  rather than shopped around until some provider allows it.
- On success, return `{ ok: true, text, provider, attempts }`, where `attempts` lists `{ provider, outcome }` for each
  try (`"timeout"`, `"status 503"`, `"empty"`, `"network"`, `"ok"`).
- When every provider fails, throw an error named `AllProvidersFailed` with the `attempts` attached.

Then explain why outputs can differ between providers, and what to check before adding one as a fallback.
