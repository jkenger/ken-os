The dashboard says checkout averages 180 ms, while support says checkout is slow. Both are true: most requests are
fast and some are very slow, and an average hides the slow ones. Write two functions over a list of requests, each
`{ ms, status }`:

`summarize(requests)` returns `{ count, errorRate, p50, p95, p99, max }`:

- Percentiles use the nearest-rank method: sort the durations, and pN is the value at position `ceil(N / 100 * count)`,
  counting from 1. So p50 of `[10, 20, 30, 40]` is 20.
- `errorRate` is the share of requests with a status of 500 or above, from 0 to 1.
- With no requests, every number is 0.

`bucketCounts(durations, bounds)` returns cumulative buckets, the way Prometheus histograms store them: for each bound
in order, `{ le: bound, count }` counting durations at or below it, then `{ le: "+Inf", count }` for all of them.

Then explain why a histogram, rather than a stored average, lets you compute percentiles across many servers.
