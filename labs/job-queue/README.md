Slow work, like sending email or resizing images, goes into a `jobs` table and workers pick it up. Several workers run
at once. Write the four queue functions so that:

- `enqueue(db, type, payload)` adds a pending job and returns it.
- `claimNext(db, workerId)` takes the oldest pending job whose `run_after` has passed, marks it `running`, records
  `locked_by` and `locked_at`, adds one to `attempts`, and returns it, or `null` when there's nothing to do. Two
  workers must never get the same job. A job still `running` 30 seconds after `locked_at` belongs to a worker that
  died: it can be claimed again.
- `complete(db, jobId, workerId)` marks it `done`, but only if that worker still holds it. Return whether it did.
- `fail(db, jobId, workerId, message)` records the error. Under 3 attempts it goes back to `pending` with `run_after`
  pushed out by 2 to the power of `attempts` seconds. At 3 attempts it becomes `dead`, for someone to look at.

```js
await enqueue(db, "email", { to: "ana@example.com" });
const job = await claimNext(db, "w1");
[job.status, job.locked_by, job.attempts];
// → ["running", "w1", 1]
await claimNext(db, "w2");
// → null
```

The starter reads the next job, then updates it, in two steps. Five workers asking at once all read the same job.

Then explain why jobs need to be safe to run twice anyway, and what the 30-second lease trades off.
