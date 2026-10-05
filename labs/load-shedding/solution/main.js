// A server has a fixed amount of capacity (connections, memory, CPU). Running everything at once past that point makes
// all of it slow or failing. Limit concurrency to what the resource can handle, queue a little to absorb bursts, and
// past that refuse quickly (load shedding) so the client can retry later or elsewhere. An unbounded queue just turns
// overload into timeouts. With several servers, each limits itself, and a shared resource such as the database needs
// a limit sized for all of them together.
function createLimiter({ maxConcurrent, maxQueue }) {
  let running = 0;
  const queue = [];

  function next() {
    while (running < maxConcurrent && queue.length) {
      const { task, resolve, reject } = queue.shift();
      running += 1;
      const done = (settle) => (result) => { running -= 1; settle(result); next(); };
      Promise.resolve().then(task).then(done(resolve), done(reject));
    }
  }

  function run(task) {
    if (running >= maxConcurrent && queue.length >= maxQueue) {
      const error = new Error("Too busy. Try again shortly");
      error.name = "OverloadedError";
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      next();
    });
  }

  return { run, active: () => running, waiting: () => queue.length };
}
