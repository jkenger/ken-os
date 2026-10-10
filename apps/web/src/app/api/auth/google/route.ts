import { NextResponse, type NextRequest } from "next/server";
import { signInSetupGap } from "@/lib/config";
import { SIGN_IN_SCOPES, startGoogleAuth } from "@/lib/oauth";
import { safeNext } from "@/lib/session";

export const runtime = "nodejs";

/** Starts Google sign-in. Also "Use another account": `prompt=select_account` always shows Google's chooser. */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  // The sign-in page shows what's missing.
  if (signInSetupGap()) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}`, request.url), { status: 303 });
  return startGoogleAuth({ intent: "signin", next, scope: SIGN_IN_SCOPES, extra: { prompt: "select_account" } });
}
