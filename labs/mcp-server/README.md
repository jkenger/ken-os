The Model Context Protocol (MCP) is a standard way to offer tools to any AI app: the app (the client) sends JSON-RPC
2.0 requests, your server answers. `createServer({ name, version, tools })` returns `{ handle }`, where
`await handle(request)` returns the response object, or `null` for a notification. `tools` maps a name to
`{ description, inputSchema, handler }`.

```js
// server comes from the tests: a notes server with add_note and search_notes
const request = { name: "add_note", arguments: { text: "buy milk" } };
await server.handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: request });
// → { jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "{\"saved\":1}" }], isError: false } }
```

- Every response has `jsonrpc: "2.0"` and the request's `id`, with either `result` or `error: { code, message }`.
- A request without an `id` is a notification: do the work, return `null`.
- `initialize`: result `{ protocolVersion, capabilities: { tools: {} }, serverInfo: { name, version } }`, echoing the
  client's `params.protocolVersion`.
- `tools/list`: result `{ tools: [{ name, description, inputSchema }] }`.
- `tools/call` with `params: { name, arguments }`: run the handler and return
  `{ content: [{ type: "text", text }], isError: false }`, where `text` is the result (JSON for non-strings).
  - A missing required argument (from `inputSchema.required`) or a handler that throws returns `isError: true` with the
    message as text, so the model can see it and try again.
  - An unknown tool is a protocol error, code `-32602`.
- An unknown method is error `-32601`. A request whose `jsonrpc` isn't `"2.0"` is error `-32600`.

Then explain where MCP fits next to plain tool calling, and what you check before connecting someone else's server.
