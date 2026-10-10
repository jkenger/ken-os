// Clients handle failures in one place when every error has one shape. The status says the class of failure and the
// code says which one; both stay stable, while messages are for people and can change. Anything we didn't expect is a
// 500 with a fixed message: its real message, stack and details go to the logs, never to the caller.
const KNOWN = {
  ValidationError: { status: 400, code: "invalid_input" },
  NotFoundError: { status: 404, code: "not_found" },
  ConflictError: { status: 409, code: "conflict" },
};

function toErrorResponse(error) {
  const known = error && KNOWN[error.name];
  if (!known) return { status: 500, body: { error: { code: "internal", message: "Something went wrong" } } };
  const body = { error: { code: known.code, message: error.message } };
  if (error.name === "ValidationError") {
    body.error.fields = Object.fromEntries((error.issues ?? []).map((issue) => [issue.path, issue.message]));
  }
  return { status: known.status, body };
}
