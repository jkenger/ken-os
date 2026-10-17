import { authorizationServerMetadata } from "@/features/connector/rules";
import { appUrl } from "@/lib/config";

/** RFC 8414 authorization server metadata: Loots signs in Claude itself. */
export function GET() {
  return Response.json(authorizationServerMetadata(appUrl()), { headers: { "Access-Control-Allow-Origin": "*" } });
}
