Product pages read prices from a slow pricing service, so you put a cache in front of it. The starter keeps values
forever, and when a popular key is missing, a hundred requests at once each call the service (a stampede).

Write `createCache({ load, ttlMs, now })`, returning `{ get(key), invalidate(key) }`:

- `get` returns the cached value while it's younger than `ttlMs` (by `now()`), without calling `load`.
- On a miss it calls `load(key)` once, however many callers are waiting for that key at the same moment; they all get
  the same result.
- A failed load isn't cached: the next `get` tries again.
- `invalidate(key)` drops the value after a write. If a load for that key was already running, its result is
  stale and must not be cached.

Then explain how you'd pick the TTL for prices versus a product description, and what invalidation can and can't
promise when there are several servers.
