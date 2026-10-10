const ARTICLE = `# Refunds
Refunds are issued within 14 days. The original payment method is credited.
Store credit is offered when the card has expired. Contact support to start a refund.

# Shipping
Orders ship within two business days. Express shipping costs extra. Tracking links arrive by email.`;

const SECTIONS = {
  Refunds: ["Refunds are issued within 14 days.", "The original payment method is credited.", "Store credit is offered when the card has expired.", "Contact support to start a refund."],
  Shipping: ["Orders ship within two business days.", "Express shipping costs extra.", "Tracking links arrive by email."],
};
const sentencesOf = (chunk) => chunk.text.split(/(?<=[.!?])\s+/);
const chunks = () => chunkDocument(ARTICLE, { maxChars: 100, overlap: 1 });

test("every chunk is whole sentences", () => {
  const all = Object.values(SECTIONS).flat();
  for (const chunk of chunks()) {
    for (const sentence of sentencesOf(chunk)) assert.ok(all.includes(sentence), `"${sentence}" is not a whole sentence`);
  }
});

test("a chunk stays inside one section and carries its heading", () => {
  for (const chunk of chunks()) {
    assert.ok(chunk.heading in SECTIONS, `unknown heading "${chunk.heading}"`);
    for (const sentence of sentencesOf(chunk)) assert.ok(SECTIONS[chunk.heading].includes(sentence), `"${sentence}" is not under ${chunk.heading}`);
  }
});

test("no chunk is longer than maxChars", () => {
  for (const chunk of chunks()) assert.ok(chunk.text.length <= 100, `${chunk.text.length} characters`);
});

test("neighbours in a section share one sentence", () => {
  const list = chunks();
  let pairs = 0;
  for (let i = 1; i < list.length; i += 1) {
    if (list[i].heading !== list[i - 1].heading) continue;
    pairs += 1;
    const before = sentencesOf(list[i - 1]);
    assert.equal(sentencesOf(list[i])[0], before[before.length - 1]);
  }
  assert.ok(pairs > 0, "expected more than one chunk in a section");
});

test("every sentence is in some chunk, and chunks are numbered in order", () => {
  const list = chunks();
  const covered = new Set(list.flatMap(sentencesOf));
  for (const sentence of Object.values(SECTIONS).flat()) assert.ok(covered.has(sentence), `missing "${sentence}"`);
  assert.deepEqual(list.map((chunk) => chunk.index), list.map((_, i) => i));
});
