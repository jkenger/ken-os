const notes = [];
const server = createServer({
  name: "notes",
  version: "1.0.0",
  tools: {
    add_note: {
      description: "Save a note",
      inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
      handler: async ({ text }) => { notes.push(text); return { saved: notes.length }; },
    },
    search_notes: {
      description: "Find notes containing a word",
      inputSchema: { type: "object", properties: { word: { type: "string" } }, required: ["word"] },
      handler: async ({ word }) => {
        if (word.length < 2) throw new Error("Search for at least 2 characters");
        return notes.filter((note) => note.includes(word)).join("\n") || "No matches";
      },
    },
  },
});
const call = (id, method, params) => server.handle({ jsonrpc: "2.0", id, method, params });

test("initialize describes the server and echoes the protocol version", async () => {
  const response = await call(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } });
  assert.deepEqual(response, {
    jsonrpc: "2.0",
    id: 1,
    result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "notes", version: "1.0.0" } },
  });
});

test("tools/list includes descriptions and input schemas", async () => {
  const response = await call(2, "tools/list", {});
  assert.equal(response.result.tools.length, 2);
  const add = response.result.tools.find((tool) => tool.name === "add_note");
  assert.equal(add.description, "Save a note");
  assert.deepEqual(add.inputSchema.required, ["text"]);
});

test("tools/call wraps results as text content", async () => {
  const saved = await call(3, "tools/call", { name: "add_note", arguments: { text: "buy milk" } });
  assert.deepEqual(saved, { jsonrpc: "2.0", id: 3, result: { content: [{ type: "text", text: "{\"saved\":1}" }], isError: false } });
  const found = await call(4, "tools/call", { name: "search_notes", arguments: { word: "milk" } });
  assert.equal(found.result.content[0].text, "buy milk");
});

test("tool failures are results the model can read, not crashes", async () => {
  const thrown = await call(5, "tools/call", { name: "search_notes", arguments: { word: "m" } });
  assert.equal(thrown.result.isError, true);
  assert.ok(thrown.result.content[0].text.includes("at least 2"));
  const missing = await call(6, "tools/call", { name: "add_note", arguments: {} });
  assert.equal(missing.result.isError, true);
  assert.ok(missing.result.content[0].text.includes("text"), "say which argument is missing");
});

test("protocol errors use JSON-RPC codes", async () => {
  assert.equal((await call(7, "tools/call", { name: "delete_everything", arguments: {} })).error.code, -32602);
  assert.equal((await call(8, "resources/list", {})).error.code, -32601);
  const wrongVersion = await server.handle({ jsonrpc: "1.0", id: 9, method: "tools/list" });
  assert.equal(wrongVersion.error.code, -32600);
  assert.equal(wrongVersion.id, 9);
});

test("notifications get no response", async () => {
  assert.equal(await server.handle({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});
