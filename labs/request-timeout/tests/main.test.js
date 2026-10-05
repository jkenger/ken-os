// A task that takes `ms` to finish, stops early when its signal aborts, and records what happened.
function slowTask(ms, value = "done") {
  const seen = { signal: null, stoppedEarly: false, finished: false };
  const task = (signal) => new Promise((resolve, reject) => {
    seen.signal = signal;
    const timer = setTimeout(() => { seen.finished = true; resolve(value); }, ms);
    if (signal) signal.addEventListener("abort", () => { clearTimeout(timer); seen.stoppedEarly = true; reject(new Error("aborted")); });
  });
  return { seen, task };
}

test("a fast task resolves with its value", async () => {
  const { task } = slowTask(10, 42);
  assert.equal(await withTimeout(task, 200), 42);
});

test("a slow task times out on time with a TimeoutError", async () => {
  const { task } = slowTask(400);
  const started = Date.now();
  let error = null;
  try { await withTimeout(task, 30); } catch (caught) { error = caught; }
  assert.ok(error, "it should reject");
  assert.equal(error.name, "TimeoutError");
  assert.ok(Date.now() - started < 250, "it should give up close to 30 ms, not wait for the task");
});

test("timing out stops the work, not just the wait", async () => {
  const { seen, task } = slowTask(300);
  try { await withTimeout(task, 20); } catch { /* expected */ }
  assert.ok(seen.signal, "the task must receive a signal");
  assert.equal(seen.signal.aborted, true, "the signal must be aborted when time runs out");
  assert.equal(seen.stoppedEarly, true);
  await wait(320);
  assert.equal(seen.finished, false, "the work must not carry on in the background");
});

test("the task's own errors pass through unchanged", async () => {
  const failure = new Error("card declined");
  let error = null;
  try { await withTimeout(async () => { throw failure; }, 100); } catch (caught) { error = caught; }
  assert.equal(error, failure);
});

test("after a fast success the signal is never aborted", async () => {
  const { seen, task } = slowTask(5);
  await withTimeout(task, 40);
  await wait(60);
  assert.equal(seen.signal && seen.signal.aborted, false, "a timer left running would abort a finished task");
});
