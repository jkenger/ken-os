import { json, labCookieNames } from "@/features/engineering-lab/playground";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INNER = "/api/lab/playground/cookies/inner";

// ?step=set plants five cookies with different rules; any other call reports which kos_lab_* cookies arrived.
// Requests from the code box come from an opaque origin ("null"); echoing it back with credentials lets that
// probe read which cookies, if any, travelled with a cross-site request.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const headers = new Headers();
  if (origin === "null") {
    headers.set("Access-Control-Allow-Origin", "null");
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  if (url.searchParams.get("step") === "set") {
    const secure = url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https" ? "; Secure" : "";
    headers.append("Set-Cookie", `kos_lab_basic=1; Path=/; Max-Age=600${secure}`);
    headers.append("Set-Cookie", `kos_lab_httponly=1; Path=/; Max-Age=600; HttpOnly${secure}`);
    headers.append("Set-Cookie", `kos_lab_path=1; Path=${INNER}; Max-Age=600${secure}`);
    headers.append("Set-Cookie", `kos_lab_expired=1; Path=/; Max-Age=0${secure}`);
    headers.append("Set-Cookie", `kos_lab_strict=1; Path=/; Max-Age=600; SameSite=Strict${secure}`);
    return json({ set: true }, { headers });
  }
  return json({ received: labCookieNames(request.headers.get("cookie")) }, { headers });
}
