import { json, labCookieNames } from "@/features/engineering-lab/playground";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reports what the server saw, so the request-anatomy probe can compare it with the learner's predictions.
function describe(request: Request) {
  return {
    method: request.method,
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    secFetchMode: request.headers.get("sec-fetch-mode"),
    labCookies: labCookieNames(request.headers.get("cookie")),
    protocol: request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", ""),
  };
}

export async function GET(request: Request) {
  return json(describe(request));
}

export async function POST(request: Request) {
  return json(describe(request));
}
