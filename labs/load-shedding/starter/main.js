function createLimiter({ maxConcurrent, maxQueue }) {
  let running = 0;
  return {
    async run(task) {
      running += 1;
      try { return await task(); } finally { running -= 1; }
    },
    active: () => running,
    waiting: () => 0,
  };
}
