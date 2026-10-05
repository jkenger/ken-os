// When a dependency is down, waiting on it for every request ties up your own capacity and adds load to a service
// trying to recover. A circuit breaker counts failures in a row; past a threshold it opens and fails fast without
// calling, which also gives the service quiet time. After a cooldown it lets one trial call through (half-open): success
// closes it, failure opens it again. Pair it with a fallback so users see something useful, like popular items,
// instead of an error.
function createBreaker(fn, { failureThreshold = 3, cooldownMs = 10000, now = Date.now } = {}) {
  let failures = 0;
  let openedAt = null;
  let trialRunning = false;

  const state = () => {
    if (openedAt === null) return "closed";
    return now() - openedAt >= cooldownMs ? "half-open" : "open";
  };

  async function call(...args) {
    const current = state();
    if (current === "open" || (current === "half-open" && trialRunning)) {
      const error = new Error("The service is unavailable right now");
      error.name = "BreakerOpenError";
      throw error;
    }
    trialRunning = current === "half-open";
    try {
      const result = await fn(...args);
      failures = 0;
      openedAt = null;
      return result;
    } catch (error) {
      failures += 1;
      if (current === "half-open" || failures >= failureThreshold) openedAt = now();
      throw error;
    } finally {
      trialRunning = false;
    }
  }

  return { call, state };
}

async function recommendationsFor(breaker, userId, popular) {
  try {
    return await breaker.call(userId);
  } catch {
    return popular;
  }
}
