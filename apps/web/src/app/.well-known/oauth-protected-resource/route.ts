import { protectedResourceMetadata } from "@/features/connector/rules";
import { appUrl } from "@/lib/config";

/** RFC 9728 protected resource metadata for /api/mcp. Claude reads it to find Ken OS's sign-in. */
export function GET() {
  return Response.json(protectedResourceMetadata(appUrl()), { headers: { "Access-Control-Allow-Origin": "*" } });
}
