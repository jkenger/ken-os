// The original logged "saved" first because promise callbacks are microtasks, which run as soon as the
// current task finishes, while a setTimeout callback waits for a later task. Chaining keeps both steps
// asynchronous and guarantees saving runs after validation.
function submitForm(log) {
  log("button disabled");
  Promise.resolve()
    .then(() => log("validated"))
    .then(() => log("saved"));
  log("spinner shown");
}
