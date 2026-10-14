`withTimeout(task, ms)` runs `task(signal)` and gives up after `ms` milliseconds. `task` is any async work that accepts
an `AbortSignal`, the way `fetch(url, { signal })` does.

The starter races the task against a timer. The caller does get an error on time, but the work carries on in the
background, holding a connection or a database slot, and the timer keeps running after a fast success. Make it:

- Reject with an error whose `name` is `TimeoutError` when `ms` passes first.
- Abort the signal at that moment, so the task can stop its work.
- Resolve with the task's value when it finishes first, and clear the timer then.
- Pass the task's own errors through unchanged.

```js
// slowTask comes from the tests: a task that takes ms to finish and stops when its signal aborts
const fast = slowTask(10, 42);
await withTimeout(fast.task, 200);
// → 42
const slow = slowTask(400);
await withTimeout(slow.task, 30).catch((error) => [error.name, slow.seen.stoppedEarly]);
// → ["TimeoutError", true]
```

Then explain why every call to another service needs a timeout, how to pick one, and why a timeout without
cancellation only moves the problem.
