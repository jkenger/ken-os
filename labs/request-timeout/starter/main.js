function withTimeout(task, ms) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
  return Promise.race([task(undefined), timeout]);
}
