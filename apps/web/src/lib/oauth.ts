import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { appUrl, requiredEnv } from "./config";

/** Cookies that carry one Google round trip. All short-lived, deleted in the callback. */
export const OAUTH_COOKIES = {
  state: "ken_os_oauth_state",
  verifier: "ken_os_oauth_verifier",
  next: "ken_os_oauth_next",
  intent: "ken_os_oauth_intent",
} as const;

export type OAuthIntent = "signin" | "drive";

export const SIGN_IN_SCOPES = "openid email profile";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };

export const callbackUrl = () => `${appUrl()}/api/auth/google/callback`;

/** Redirects to Google with state and PKCE, remembering where to return and which flow this is. */
export function startGoogleAuth(options: { intent: OAuthIntent; next: string; scope: string; extra: Record<string, string> }): NextResponse {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: requiredEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: options.scope,
    ...options.extra,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set(OAUTH_COOKIES.state, state, cookieOptions);
  response.cookies.set(OAUTH_COOKIES.verifier, verifier, cookieOptions);
  response.cookies.set(OAUTH_COOKIES.next, options.next, cookieOptions);
  response.cookies.set(OAUTH_COOKIES.intent, options.intent, cookieOptions);
  return response;
}

/** A redirect inside the app that also clears the round-trip cookies. */
export function finishRedirect(target: string): NextResponse {
  const response = NextResponse.redirect(`${appUrl()}${target}`, { status: 303 });
  for (const name of Object.values(OAUTH_COOKIES)) response.cookies.delete(name);
  return response;
}

export function readOAuthCookies(request: NextRequest) {
  const intent = request.cookies.get(OAUTH_COOKIES.intent)?.value;
  return {
    state: request.cookies.get(OAUTH_COOKIES.state)?.value,
    verifier: request.cookies.get(OAUTH_COOKIES.verifier)?.value,
    next: request.cookies.get(OAUTH_COOKIES.next)?.value,
    intent: (intent === "drive" ? "drive" : "signin") as OAuthIntent,
  };
}

/** Adds one query parameter to an app path. */
export function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://ken-os.invalid");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}
