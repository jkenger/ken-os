function summarize(requests) {
  const count = requests.length;
  const average = count ? requests.reduce((sum, request) => sum + request.ms, 0) / count : 0;
  const errors = requests.filter((request) => request.status !== 200).length;
  return { count, errorRate: count ? errors / count : 0, p50: average, p95: average, p99: average, max: average };
}

function bucketCounts(durations, bounds) {
  return bounds.map((bound) => ({ le: bound, count: durations.filter((ms) => ms === bound).length }));
}
