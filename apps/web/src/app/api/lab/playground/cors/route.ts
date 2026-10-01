import { json } from "@/features/engineering-lab/playground";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Each variant answers with a different CORS policy. CORS is enforced by the browser on the calling page: the server
// only states who may read its responses.
function corsHeaders(variant: string, origin: string | null) {
  const headers = new Headers();
  if (variant === "star" || variant === "star-credentials") headers.set("Access-Control-Allow-Origin", "*");
  if (variant === "echo-credentials" || variant.startsWith("preflight")) {
    headers.set("Access-Control-Allow-Origin", origin ?? "null");
    headers.set("Vary", "Origin");
  }
  if (variant === "echo-credentials" || variant === "star-credentials") headers.set("Access-Control-Allow-Credentials", "true");
  if (variant === "preflight-allowed") {
    headers.set("Access-Control-Allow-Headers", "X-Lab-Token");
    headers.set("Access-Control-Allow-Methods", "GET");
  }
  return headers;
}

export async function GET(request: Request) {
  const variant = new URL(request.url).searchParams.get("variant") ?? "none";
  return json({ variant, readable: true }, { headers: corsHeaders(variant, request.headers.get("origin")) });
}

export async function OPTIONS(request: Request) {
  const variant = new URL(request.url).searchParams.get("variant") ?? "none";
  return new Response(null, { status: 204, headers: corsHeaders(variant, request.headers.get("origin")) });
}
