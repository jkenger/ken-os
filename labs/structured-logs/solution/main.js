// A log line is data for a search engine, not prose. One JSON object per event, with the same field names everywhere,
// lets you ask "every line for request req-123" or "every error in checkout". Carry context through a child logger
// instead of repeating it: service, requestId, userId. Redact by key name before writing, at any depth, because the
// thing that leaks is the object you didn't think about (a request body, a headers map). Errors need converting:
// JSON.stringify of an Error is {}.
const SECRET_KEYS = new Set(["password", "token", "secret", "authorization", "cookie", "apikey", "card"]);

function clean(value) {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEYS.has(key.toLowerCase()) ? "[redacted]" : clean(item)]));
  }
  return value;
}

function createLogger({ write, now, fields = {} }) {
  const log = (level) => (message, extra = {}) => {
    write(JSON.stringify({ time: now().toISOString(), level, msg: message, ...clean(fields), ...clean(extra) }));
  };
  return {
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    child: (more) => createLogger({ write, now, fields: { ...fields, ...more } }),
  };
}
