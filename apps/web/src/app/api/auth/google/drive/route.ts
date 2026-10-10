import { NextResponse, type NextRequest } from "next/server";
import { messages } from "@/lib/messages";
import { DRIVE_SCOPE, startGoogleAuth } from "@/lib/oauth";
import { getSession, safeNext } from "@/lib/session";

export const runtime = "nodejs";

/** Asks Google for Drive access on top of sign-in. `consent` and offline access are what return a refresh token. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  return startGoogleAuth({
    intent: "drive",
    next: safeNext(request.nextUrl.searchParams.get("next")),
    scope: DRIVE_SCOPE,
    extra: { include_granted_scopes: "true", access_type: "offline", prompt: "consent", login_hint: session.email },
  });
}
