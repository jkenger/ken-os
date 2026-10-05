// A cache trades freshness for speed, so every entry needs an age limit chosen from how stale the data may be: seconds
// for a price, hours for a description. Share one in-flight load per key so a cold popular key causes one call, not a
// stampede. Never cache failures. Invalidate on write, and guard against the race where a load that started before
// the write finishes after it: a per-key version number lets that stale result be thrown away. Across several servers,
// invalidation is best effort, which is why the TTL is the real guarantee.
function createCache({ load, ttlMs, now }) {
  const values = new Map();
  const inFlight = new Map();
  const versions = new Map();

  async function get(key) {
    const cached = values.get(key);
    if (cached && now() - cached.storedAt < ttlMs) return cached.value;
    if (inFlight.has(key)) return inFlight.get(key);
    const version = versions.get(key) ?? 0;
    const loading = Promise.resolve()
      .then(() => load(key))
      .then((value) => {
        if ((versions.get(key) ?? 0) === version) values.set(key, { value, storedAt: now() });
        return value;
      })
      .finally(() => { if (inFlight.get(key) === loading) inFlight.delete(key); });
    inFlight.set(key, loading);
    return loading;
  }

  function invalidate(key) {
    values.delete(key);
    inFlight.delete(key);
    versions.set(key, (versions.get(key) ?? 0) + 1);
  }

  return { get, invalidate };
}
