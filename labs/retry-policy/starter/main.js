async function retry(fn, { retries = 3, baseMs = 100, maxMs = 2000, sleep, random = Math.random } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= retries) throw error;
      await sleep(baseMs);
      attempt += 1;
    }
  }
}
