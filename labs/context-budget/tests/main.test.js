const countTokens = (text) => text.split(/\s+/).filter(Boolean).length;
const total = (messages) => messages.reduce((sum, message) => sum + countTokens(message.content), 0);
const input = {
  system: "You are a support assistant for Acme. Be brief.",
  history: [
    { role: "user", content: "Hi, my order is late." },
    { role: "assistant", content: "Sorry to hear that. What is the order number?" },
    { role: "user", content: "It is 4471, placed last Monday." },
    { role: "assistant", content: "Thanks, I can see order 4471 is in transit." },
  ],
  documents: [
    { id: "d1", text: "Orders in transit usually arrive within 5 business days." },
    { id: "d2", text: "Late orders can be refunded after 10 business days." },
    { id: "d3", text: "Our warehouse closes on public holidays, which can delay shipping by one or two days in some regions." },
  ],
  question: "Can I get a refund now?",
};

test("with room for everything, the order is system, history, documents, question", () => {
  const messages = buildMessages(input, { budget: 1000, countTokens });
  assert.equal(messages[0].role, "system");
  assert.deepEqual(messages.slice(1, 5), input.history);
  const docs = messages[5].content;
  assert.ok(docs.includes("<documents>") && docs.includes("</documents>"));
  assert.ok(docs.includes("[d1] Orders in transit") && docs.includes("[d3] Our warehouse"));
  assert.ok(/not instructions/i.test(docs), "say the documents are reference data, not instructions");
  assert.deepEqual(messages[messages.length - 1], { role: "user", content: "Can I get a refund now?" });
});

test("over budget, the oldest history goes first and the question always stays", () => {
  const roomy = total(buildMessages(input, { budget: 1000, countTokens }));
  const messages = buildMessages(input, { budget: roomy - 10, countTokens });
  assert.ok(total(messages) <= roomy - 10);
  assert.equal(messages[messages.length - 1].content, "Can I get a refund now?");
  assert.equal(messages[0].role, "system");
  assert.ok(!messages.some((message) => message.content === "Hi, my order is late."), "the oldest turn is dropped first");
  assert.ok(messages.some((message) => message.content.includes("[d3]")), "documents are kept while history can still go");
});

test("when history is gone, the lowest-ranked documents go next", () => {
  const messages = buildMessages(input, { budget: 45, countTokens });
  assert.ok(total(messages) <= 45, `${total(messages)} tokens is over the 45 budget`);
  assert.equal(messages[0].role, "system");
  assert.equal(messages[messages.length - 1].content, "Can I get a refund now?");
  const docs = messages.find((message) => message.content.includes("<documents>"));
  assert.ok(docs && docs.content.includes("[d1]"), "the best document stays");
  assert.ok(!docs.content.includes("[d3]"), "the lowest-ranked document goes first");
});
