function createBreaker(fn, { failureThreshold = 3, cooldownMs = 10000, now = Date.now } = {}) {
  return {
    call: (...args) => fn(...args),
    state: () => "closed",
  };
}

async function recommendationsFor(breaker, userId, popular) {
  return breaker.call(userId);
}
