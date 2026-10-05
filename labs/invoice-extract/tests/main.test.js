// A fake model that answers from a script and records what it was sent.
function scripted(replies) {
  const sent = [];
  const callModel = async (messages) => {
    sent.push(messages.map((message) => ({ ...message })));
    if (!replies.length) throw new Error("the model was called more times than expected");
    return replies.shift();
  };
  return { sent, callModel };
}
const email = "Invoice from Acme Corp, 1,200.50 USD, dated 3 Oct 2026.";
const good = { vendor: "Acme Corp", total: 1200.5, currency: "USD", date: "2026-10-03" };

test("a fenced reply with extra text is read, and extra fields dropped", async () => {
  const { callModel } = scripted([`Sure! Here it is:\n\`\`\`json\n${JSON.stringify({ ...good, notes: "paid" })}\n\`\`\`\nAnything else?`]);
  const result = await extractInvoice(callModel, email);
  assert.deepEqual(result, { ok: true, value: good, attempts: 1 });
});

test("the request names the fields", async () => {
  const { sent, callModel } = scripted([JSON.stringify(good)]);
  await extractInvoice(callModel, email);
  const first = sent[0].map((message) => message.content).join("\n");
  for (const field of ["vendor", "total", "currency", "date"]) assert.ok(first.includes(field), `the prompt should ask for ${field}`);
  assert.ok(first.includes(email), "the prompt includes the email");
});

test("a bad reply gets one repair attempt that explains what was wrong", async () => {
  const bad = JSON.stringify({ vendor: "Acme Corp", total: "$1,200.50", currency: "usd", date: "Oct 3" });
  const { sent, callModel } = scripted([bad, JSON.stringify(good)]);
  const result = await extractInvoice(callModel, email);
  assert.deepEqual(result, { ok: true, value: good, attempts: 2 });
  const retry = sent[1];
  assert.ok(retry.length > sent[0].length, "the second call keeps the conversation and adds to it");
  assert.equal(retry[retry.length - 2].role, "assistant", "the model's bad reply is included");
  const feedback = retry[retry.length - 1].content;
  for (const field of ["total", "currency", "date"]) assert.ok(feedback.includes(field), `the feedback should mention ${field}`);
});

test("two bad replies fail clearly instead of throwing", async () => {
  const { callModel } = scripted(["I couldn't find an invoice.", JSON.stringify({ vendor: "", total: -5, currency: "US", date: "2026-13-45x" })]);
  const result = await extractInvoice(callModel, email);
  assert.equal(result.ok, false);
  assert.equal(result.attempts, 2);
  assert.ok(Array.isArray(result.errors) && result.errors.length >= 3, "list what was wrong with the last reply");
});

test("a missing field counts as invalid", async () => {
  const { callModel } = scripted([JSON.stringify({ vendor: "Acme Corp", total: 10, currency: "USD" }), JSON.stringify(good)]);
  const result = await extractInvoice(callModel, email);
  assert.equal(result.attempts, 2);
  assert.equal(result.ok, true);
});
