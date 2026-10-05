// MCP standardizes the tool-calling loop's other end: instead of wiring each tool into each app, a server describes
// its tools once (name, description, JSON Schema) and any MCP client can list and call them. Two kinds of failure are
// kept apart. Protocol errors (unknown method, unknown tool) are JSON-RPC errors for the client. Tool errors (bad
// arguments, a failing call) are normal results with isError, so the model sees them and can retry. A third-party
// server's descriptions and results are untrusted text that reaches your model, so check who runs it, what it can
// touch, and keep approval on anything that changes data.
function createServer({ name, version, tools }) {
  const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
  const fail = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
  const text = (value, isError) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }], isError });

  async function callTool(params = {}) {
    const tool = Object.prototype.hasOwnProperty.call(tools, params.name) ? tools[params.name] : null;
    if (!tool) return { error: [-32602, `Unknown tool: ${params.name}`] };
    const args = params.arguments || {};
    const missing = (tool.inputSchema.required || []).filter((key) => args[key] === undefined);
    if (missing.length) return { result: text(`Missing required argument: ${missing.join(", ")}`, true) };
    try {
      return { result: text(await tool.handler(args), false) };
    } catch (error) {
      return { result: text(error.message, true) };
    }
  }

  async function run(request) {
    switch (request.method) {
      case "initialize":
        return { result: { protocolVersion: request.params?.protocolVersion, capabilities: { tools: {} }, serverInfo: { name, version } } };
      case "tools/list":
        return { result: { tools: Object.entries(tools).map(([toolName, tool]) => ({ name: toolName, description: tool.description, inputSchema: tool.inputSchema })) } };
      case "tools/call":
        return callTool(request.params);
      default:
        if (request.method?.startsWith("notifications/")) return { result: null };
        return { error: [-32601, `Method not found: ${request.method}`] };
    }
  }

  return {
    async handle(request) {
      const isNotification = request.id === undefined;
      if (request.jsonrpc !== "2.0") return isNotification ? null : fail(request.id ?? null, -32600, "Invalid request");
      const outcome = await run(request);
      if (isNotification) return null;
      return outcome.error ? fail(request.id, ...outcome.error) : ok(request.id, outcome.result);
    },
  };
}
