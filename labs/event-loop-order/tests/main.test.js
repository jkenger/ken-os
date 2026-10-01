test("logs the four steps in order", async () => {
  const lines = [];
  submitForm((line) => lines.push(line));
  await wait(20);
  assert.deepEqual(lines, ["button disabled", "spinner shown", "validated", "saved"]);
});

test("only the synchronous steps have run when submitForm returns", () => {
  const lines = [];
  submitForm((line) => lines.push(line));
  assert.deepEqual(lines, ["button disabled", "spinner shown"]);
});
