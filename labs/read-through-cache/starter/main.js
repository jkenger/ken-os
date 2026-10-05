function createCache({ load, ttlMs, now }) {
  const values = new Map();
  return {
    async get(key) {
      if (values.has(key)) return values.get(key);
      const value = await load(key);
      values.set(key, value);
      return value;
    },
    invalidate(key) {
      values.delete(key);
    },
  };
}
