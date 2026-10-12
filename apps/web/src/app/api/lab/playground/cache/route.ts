import { createHash, randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLICIES = {
  "max-age": "private, max-age=120",
  "no-cache": "private, no-cache",
  "no-store": "no-store",
} as const;

// A padded body (about 20 KB) makes a full response easy to tell apart from a 304 or a cache hit in Resource Timing.
// The ETag depends only on the URL, so a revalidation with If-None-Match gets a 304 with no body.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const policy = url.searchParams.get("policy") as keyof typeof POLICIES | null;
  if (!policy || !(policy in POLICIES))
    return Response.json({ error: "policy must be max-age, no-cache or no-store" }, { status: 400 });
  const etag = `"${createHash("sha256").update(url.search).digest("hex").slice(0, 16)}"`;
  const headers = new Headers({ "Cache-Control": POLICIES[policy], "Content-Type": "application/json" });
  if (policy === "no-cache") {
    headers.set("ETag", etag);
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  }
  return new Response(JSON.stringify({ policy, servedBy: randomUUID(), padding: "x".repeat(20_000) }), {
    status: 200,
    headers,
  });
}
