function submitForm(log) {
  log("button disabled");
  setTimeout(() => log("validated"), 0);
  Promise.resolve().then(() => log("saved"));
  log("spinner shown");
}
