import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appUrl, ownerEmailIsConfigured, requiredEnv } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  if (!ownerEmailIsConfigured()) {
    return NextResponse.json(
      { error: "Set OWNER_EMAIL in apps/web/.env to your Google account email, then restart the dev server." },
      { status: 503 },
    );
  }
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: requiredEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set("ken_os_oauth_state", state, options);
  response.cookies.set("ken_os_oauth_verifier", verifier, options);
  return response;
}
