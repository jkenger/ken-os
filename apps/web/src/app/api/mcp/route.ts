import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "@/features/connector/mcp-server";
import { verifyAccessToken } from "@/features/connector/oauth-store";
import { unauthorized } from "@/features/connector/rules";
import { appUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Loots connector for Claude: MCP over Streamable HTTP, stateless, one bearer token per request.
// Spec: docs/architecture/engineering-claude-connector.md, section 3.

export async function POST(request: Request) {
  const auth = await verifyAccessToken(request.headers.get("authorization"));
  // A 401 with resource_metadata is what starts sign-in in Claude.
  if (!auth) return unauthorized(appUrl());
  const server = buildMcpServer(auth.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** Stateless: no event stream to open and no session to end. */
function notAllowed() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export const GET = notAllowed;
export const DELETE = notAllowed;
