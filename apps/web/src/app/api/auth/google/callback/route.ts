import { NextResponse, type NextRequest } from "next/server";
import { finishDriveGrant, finishSignIn, type GoogleProfile, type GoogleTokens } from "@/lib/auth-flow";
import { appUrl, requiredEnv } from "@/lib/config";
import { finishRedirect, readOAuthCookies, withParam } from "@/lib/oauth";
import { googleCallbackUrl, relayTarget } from "@/lib/oauth-relay";
import { createSession, getSession, safeNext } from "@/lib/session";

export const runtime = "nodejs";

type Exchange =
  | { ok: true; tokens: GoogleTokens; profile: GoogleProfile }
  | { ok: false; reason: "expired" | "google"; detail: string };

async function exchange(code: string, verifier: string): Promise<Exchange> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: googleCallbackUrl(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!tokenResponse?.ok) {
    const tokenError = (await tokenResponse?.json().catch(() => null)) as {
      error?: string;
      error_description?: string;
    } | null;
    const detail = `token ${tokenResponse?.status ?? "unreachable"} ${tokenError?.error ?? ""} ${tokenError?.error_description ?? ""}`;
    return { ok: false, reason: tokenError?.error === "invalid_grant" ? "expired" : "google", detail };
  }
  const tokens = (await tokenResponse.json()) as GoogleTokens;
  if (!tokens.access_token) return { ok: false, reason: "google", detail: "token response without access_token" };
  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!userResponse?.ok)
    return { ok: false, reason: "google", detail: `userinfo ${userResponse?.status ?? "unreachable"}` };
  return { ok: true, tokens, profile: (await userResponse.json()) as GoogleProfile };
}

/**
 * Finishes both flows. Every outcome is a redirect: `next` on success, the sign-in page or `?drive_error=` on failure.
 * Google's answer to a preview's sign-in arrives here in production first and goes straight on to that preview.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const relay = relayTarget(query, appUrl());
  if (relay) return NextResponse.redirect(relay, { status: 302 });
  const cookies = readOAuthCookies(request);
  const next = safeNext(cookies.next);
  const googleError = query.get("error");
  const code = query.get("code");
  const state = query.get("state");
  const stateMatches = Boolean(state && cookies.state && state === cookies.state && cookies.verifier);
  // Which check failed, never the values: enough to tell a lost cookie from a refused code in the runtime logs.
  const report = (reason: string, detail = "") =>
    console.warn(
      `Google sign-in failed: ${reason} ${detail}`.trim(),
      JSON.stringify({
        intent: cookies.intent,
        code: Boolean(code),
        state: Boolean(state),
        stateCookie: Boolean(cookies.state),
        verifierCookie: Boolean(cookies.verifier),
        stateMatches,
        googleError,
      }),
    );

  if (cookies.intent === "drive") {
    const session = await getSession();
    if (!session) {
      report("drive without a session");
      return finishRedirect(`/sign-in?${new URLSearchParams({ expired: "1", next })}`);
    }
    const fail = (reason: "cancelled" | "scope" | "google", detail?: string) => {
      report(`drive ${reason}`, detail);
      return finishRedirect(withParam(next, "drive_error", reason));
    };
    if (googleError) return fail(googleError === "access_denied" ? "cancelled" : "google");
    if (!code || !stateMatches) return fail("google");
    const result = await exchange(code, cookies.verifier!);
    if (!result.ok) return fail("google", result.detail);
    const granted = await finishDriveGrant(session.userId, result.tokens, result.profile);
    return granted.ok ? finishRedirect(next) : fail(granted.code);
  }

  const fail = (reason: string, detail?: string) => {
    report(reason, detail);
    return finishRedirect(`/sign-in?${new URLSearchParams({ error: reason, next })}`);
  };
  if (googleError) return fail(googleError === "access_denied" ? "cancelled" : "google");
  if (!code || !stateMatches) return fail("expired");
  const result = await exchange(code, cookies.verifier!);
  if (!result.ok) return fail(result.reason, result.detail);
  const signedIn = await finishSignIn(result.profile);
  if (!signedIn.ok) return fail(signedIn.code);
  await createSession(signedIn.session);
  return finishRedirect(next);
}
