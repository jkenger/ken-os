import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { requiredEnv } from "./config";

export const SESSION_COOKIE = "ken_os_session";
const DAY = 60 * 60 * 24;
/** Rolling: a session lasts 30 days from its last renewal, renewed at most daily, never past 90 days from sign-in. */
export const SESSION_IDLE = 30 * DAY;
export const SESSION_MAX = 90 * DAY;
export const RENEW_AFTER = DAY;

export interface Session {
  userId: string;
  email: string;
}

export interface SessionClaims {
  sub: string;
  email: string;
  /** Sign-in time, seconds since the epoch. */
  authTime: number;
  /** Time the current token was issued, seconds since the epoch. */
  issuedAt: number;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(requiredEnv("SESSION_SECRET"));
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/** Expiry for a token issued at `now`: 30 days on, capped at 90 days from sign-in. */
export function sessionExpiry(authTime: number, now: number): number {
  return Math.min(now + SESSION_IDLE, authTime + SESSION_MAX);
}

/** Whether a valid session should be re-signed now: `skip` under a day old, `refuse` past the 90-day cap. */
export function renewalFor(
  claims: Pick<SessionClaims, "authTime" | "issuedAt">,
  now: number,
): "skip" | "renew" | "refuse" {
  if (now - claims.authTime >= SESSION_MAX) return "refuse";
  if (now - claims.issuedAt < RENEW_AFTER) return "skip";
  return "renew";
}

export async function signSession(
  claims: Pick<SessionClaims, "sub" | "email" | "authTime">,
  now: number,
): Promise<{ token: string; maxAge: number }> {
  const expiresAt = sessionExpiry(claims.authTime, now);
  const token = await new SignJWT({ email: claims.email, auth_time: claims.authTime })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(secret());
  return { token, maxAge: Math.max(0, expiresAt - now) };
}

function claimsFrom(payload: JWTPayload): SessionClaims | null {
  if (!payload.sub || typeof payload.email !== "string" || typeof payload.iat !== "number") return null;
  // Tokens issued before auth_time existed count from their issue time.
  const authTime = typeof payload.auth_time === "number" ? payload.auth_time : payload.iat;
  return { sub: payload.sub, email: payload.email, authTime, issuedAt: payload.iat };
}

/** Verifies a session token: signature, expiry and the 90-day cap. */
export async function readSessionToken(token: string, now = nowSeconds()): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { currentDate: new Date(now * 1000) });
    const claims = claimsFrom(payload);
    if (!claims) return null;
    if (now - claims.authTime >= SESSION_MAX) return null;
    return claims;
  } catch {
    return null;
  }
}

/** A fresh token for a valid session older than a day, or null when it should be left alone. Used by `src/proxy.ts`. */
export async function renewSession(
  token: string,
  now = nowSeconds(),
): Promise<{ token: string; maxAge: number } | null> {
  const claims = await readSessionToken(token, now);
  if (!claims || renewalFor(claims, now) !== "renew") return null;
  return signSession(claims, now);
}

export async function createSession(user: Session): Promise<void> {
  const now = nowSeconds();
  const { token, maxAge } = await signSession({ sub: user.userId, email: user.email, authTime: now }, now);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await readSessionToken(token);
  return claims ? { userId: claims.sub, email: claims.email } : null;
}

/**
 * The session for a page, or a redirect to sign-in that comes back to `path` afterwards. A cookie that was there
 * but no longer works adds `expired=1`, so the sign-in page can say the session ended.
 */
export async function requireSession(path: string, query: Record<string, string | undefined> = {}): Promise<Session> {
  const session = await getSession();
  if (session) return session;
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  const next = search.size ? `${path}?${search}` : path;
  const params = new URLSearchParams();
  if ((await cookies()).has(SESSION_COOKIE)) params.set("expired", "1");
  params.set("next", next);
  redirect(`/sign-in?${params}`);
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

const NEXT_BASE = "http://ken-os.invalid";

/**
 * A same-origin page path to return to after sign-in, or "/". Rejects protocol-relative and backslash tricks,
 * anything with a scheme, API routes and the sign-in page itself.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  let url: URL;
  try {
    url = new URL(value, NEXT_BASE);
  } catch {
    return "/";
  }
  if (url.origin !== NEXT_BASE) return "/";
  const path = url.pathname;
  if (path === "/api" || path.startsWith("/api/") || path === "/sign-in" || path.startsWith("/sign-in/")) return "/";
  return `${path}${url.search}`;
}
