import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { appUrl, requiredEnv } from "../config";

/**
 * Google takes one redirect URI: production's callback. A preview starts sign-in with its own origin signed into the
 * OAuth state, and production sends Google's answer on to that preview's callback, which exchanges the code itself.
 * See docs/architecture/auth-sign-in.md §11.
 */

export const CALLBACK_PATH = "/api/auth/google/callback";

/** This project's Vercel previews: deployment and branch URLs, plus the old stable alias. */
const PREVIEW_HOST = /^ken-os-[a-z0-9-]+-jkengers-projects\.vercel\.app$/;
const PREVIEW_ALIAS = "ken-os-preview.vercel.app";

export function isRelayOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.origin !== origin) return false;
  return url.host === PREVIEW_ALIAS || PREVIEW_HOST.test(url.host);
}

/** The redirect URI sent to Google. Previews use production's, which is the one registered. */
export function googleCallbackUrl(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "preview" && production) return `https://${production}${CALLBACK_PATH}`;
  return `${appUrl()}${CALLBACK_PATH}`;
}

// Production and previews share SESSION_SECRET, so production can check a state a preview signed.
function mac(payload: string): Buffer {
  return createHmac("sha256", requiredEnv("SESSION_SECRET")).update(`google-oauth-state\0${payload}`).digest();
}

/** A fresh state: random nonce, the origin that started sign-in, and an HMAC over both. */
export function signState(origin: string): string {
  const payload = `${randomBytes(32).toString("base64url")}.${Buffer.from(origin).toString("base64url")}`;
  return `${payload}.${mac(payload).toString("base64url")}`;
}

/** The origin inside a state this app signed, or null for anything else. */
export function stateOrigin(state: string | null | undefined): string | null {
  const parts = state?.split(".");
  if (!parts || parts.length !== 3) return null;
  const [nonce, origin, signature] = parts;
  const expected = mac(`${nonce}.${origin}`);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Buffer.from(origin, "base64url").toString();
}

/** Where to send Google's answer when it belongs to a preview, or null to finish it here. */
export function relayTarget(query: URLSearchParams, here: string): string | null {
  const origin = stateOrigin(query.get("state"));
  if (!origin || origin === here || !isRelayOrigin(origin)) return null;
  return `${origin}${CALLBACK_PATH}?${query}`;
}
