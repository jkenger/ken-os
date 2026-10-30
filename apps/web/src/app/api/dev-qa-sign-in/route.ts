import { NextRequest, NextResponse } from "next/server";
import { finishSignIn } from "@/lib/auth-flow";
import { ownerEmail } from "@/lib/config";
import { createSession, safeNext } from "@/lib/session";

// TEMP: local-only, manual QA shortcut. Mints the real session for the owner without the Google round trip,
// then redirects so one navigation (e.g. the taste-skill inspector) lands signed in. Deleted before this ships.
export async function GET(request: NextRequest) {
  const email = ownerEmail();
  const signedIn = await finishSignIn({
    sub: "dev-qa-session",
    email,
    email_verified: true,
    name: "Dev QA",
  });
  if (!signedIn.ok) return NextResponse.json({ ok: false, code: signedIn.code }, { status: 400 });
  await createSession(signedIn.session);
  const next = safeNext(request.nextUrl.searchParams.get("next") ?? "/profile");
  return NextResponse.redirect(new URL(next, request.url));
}
