function createServer({ name, version, tools }) {
  return {
    async handle(request) {
      if (request.method === "tools/list") {
        return { jsonrpc: "2.0", id: request.id, result: { tools: Object.keys(tools).map((tool) => ({ name: tool })) } };
      }
      if (request.method === "tools/call") {
        const output = await tools[request.params.name].handler(request.params.arguments);
        return { jsonrpc: "2.0", id: request.id, result: output };
      }
      return { jsonrpc: "2.0", id: request.id, result: { serverInfo: { name, version } } };
    },
  };
}
