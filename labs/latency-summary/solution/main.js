// Users feel the slow requests, so report percentiles: p50 is the typical request, p95 and p99 are the tail that
// generates complaints and timeouts. An average blends a few 4-second requests into a comfortable number. Count only
// 5xx as errors: they're the service's fault. Store histograms (cumulative bucket counts) rather than averages,
// because buckets from many servers can be added together and percentiles estimated from the total, while averages
// of averages and percentiles of percentiles are both wrong.
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function summarize(requests) {
  const count = requests.length;
  const sorted = requests.map((request) => request.ms).sort((a, b) => a - b);
  const errors = requests.filter((request) => request.status >= 500).length;
  return {
    count,
    errorRate: count ? errors / count : 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: count ? sorted[sorted.length - 1] : 0,
  };
}

function bucketCounts(durations, bounds) {
  return [
    ...bounds.map((bound) => ({ le: bound, count: durations.filter((ms) => ms <= bound).length })),
    { le: "+Inf", count: durations.length },
  ];
}
