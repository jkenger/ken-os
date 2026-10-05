function createLogger({ write, now, fields = {} }) {
  const log = (level) => (message, extra = {}) => write(`${level.toUpperCase()} ${message} ${JSON.stringify({ ...fields, ...extra })}`);
  return {
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    child: (more) => createLogger({ write, now, fields: { ...fields, ...more } }),
  };
}
