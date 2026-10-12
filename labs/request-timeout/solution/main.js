// A timeout protects the caller; cancellation protects everything else. Giving up without telling the work to stop
// leaves it holding connections and slots until it finishes on its own, so under load the timeouts pile up instead of
// relieving pressure. Pass an AbortSignal down, abort it when time runs out, and clear the timer as soon as the task
// settles either way. Pick the timeout from how long the call normally takes (a high percentile), not a round number.
function withTimeout(task, ms) {
  const controller = new AbortController();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(`Timed out after ${ms} ms`);
      error.name = "TimeoutError";
      controller.abort(error);
      reject(error);
    }, ms);
    Promise.resolve()
      .then(() => task(controller.signal))
      .then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
  });
}
