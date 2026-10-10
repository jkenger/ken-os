import type { NextRequest } from "next/server";
import { finishDriveGrant, finishSignIn, type GoogleProfile, type GoogleTokens } from "@/lib/auth-flow";
import { requiredEnv } from "@/lib/config";
import { callbackUrl, finishRedirect, readOAuthCookies, withParam } from "@/lib/oauth";
import { createSession, getSession, safeNext } from "@/lib/session";

export const runtime = "nodejs";

type Exchange = { ok: true; tokens: GoogleTokens; profile: GoogleProfile } | { ok: false; reason: "expired" | "google" };

async function exchange(code: string, verifier: string): Promise<Exchange> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: callbackUrl(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!tokenResponse?.ok) {
    const tokenError = (await tokenResponse?.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, reason: tokenError?.error === "invalid_grant" ? "expired" : "google" };
  }
  const tokens = (await tokenResponse.json()) as GoogleTokens;
  if (!tokens.access_token) return { ok: false, reason: "google" };
  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!userResponse?.ok) return { ok: false, reason: "google" };
  return { ok: true, tokens, profile: (await userResponse.json()) as GoogleProfile };
}

/** Finishes both flows. Every outcome is a redirect: `next` on success, the sign-in page or `?drive_error=` on failure. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const cookies = readOAuthCookies(request);
  const next = safeNext(cookies.next);
  const googleError = query.get("error");
  const code = query.get("code");
  const state = query.get("state");
  const stateMatches = Boolean(state && cookies.state && state === cookies.state && cookies.verifier);

  if (cookies.intent === "drive") {
    const session = await getSession();
    if (!session) return finishRedirect(`/sign-in?${new URLSearchParams({ expired: "1", next })}`);
    const fail = (reason: "cancelled" | "scope" | "google") => finishRedirect(withParam(next, "drive_error", reason));
    if (googleError) return fail(googleError === "access_denied" ? "cancelled" : "google");
    if (!code || !stateMatches) return fail("google");
    const result = await exchange(code, cookies.verifier!);
    if (!result.ok) return fail("google");
    const granted = await finishDriveGrant(session.userId, result.tokens, result.profile);
    return granted.ok ? finishRedirect(next) : fail(granted.code);
  }

  const fail = (reason: string) => finishRedirect(`/sign-in?${new URLSearchParams({ error: reason, next })}`);
  if (googleError) return fail(googleError === "access_denied" ? "cancelled" : "google");
  if (!code || !stateMatches) return fail("expired");
  const result = await exchange(code, cookies.verifier!);
  if (!result.ok) return fail(result.reason);
  const signedIn = await finishSignIn(result.profile);
  if (!signedIn.ok) return fail(signedIn.code);
  await createSession(signedIn.session);
  return finishRedirect(next);
}
