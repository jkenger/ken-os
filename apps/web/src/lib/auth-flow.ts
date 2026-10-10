import { sql } from "drizzle-orm";
import type { DriveErrorCode, SignInErrorCode } from "./auth-errors";
import { ownerEmail } from "./config";
import { db } from "./db";
import { encryptToken } from "./google";
import { DRIVE_SCOPE } from "./oauth";
import { googleConnections, users } from "./schema";
import type { Session } from "./session";

/** What Google returned, before any of it is trusted. */
export interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
}

export interface GoogleProfile {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

/** Finishes the `signin` intent: owner and verified email only, then the user row. Never touches the Drive connection. */
export async function finishSignIn(profile: GoogleProfile): Promise<{ ok: true; session: Session } | { ok: false; code: SignInErrorCode }> {
  if (!profile.sub || !profile.email) return { ok: false, code: "google" };
  if (profile.email.trim().toLowerCase() !== ownerEmail()) return { ok: false, code: "wrong_account" };
  if (profile.email_verified !== true) return { ok: false, code: "unverified" };
  await db().insert(users).values({ id: profile.sub, email: profile.email, name: profile.name ?? null })
    .onConflictDoUpdate({ target: users.id, set: { email: profile.email, name: profile.name ?? null } });
  return { ok: true, session: { userId: profile.sub, email: profile.email } };
}

/** Finishes the `drive` intent for the signed-in owner: same Google account, Drive scope granted, refresh token kept encrypted. */
export async function finishDriveGrant(
  sessionUserId: string,
  tokens: GoogleTokens,
  profile: GoogleProfile,
): Promise<{ ok: true } | { ok: false; code: DriveErrorCode }> {
  if (!profile.sub || profile.sub !== sessionUserId) return { ok: false, code: "google" };
  if (!tokens.scope?.split(" ").includes(DRIVE_SCOPE)) return { ok: false, code: "scope" };
  if (!tokens.refresh_token) return { ok: false, code: "google" };
  const encryptedRefreshToken = encryptToken(tokens.refresh_token);
  await db().insert(googleConnections).values({ userId: sessionUserId, encryptedRefreshToken })
    .onConflictDoUpdate({ target: googleConnections.userId, set: { encryptedRefreshToken, updatedAt: sql`now()` } });
  return { ok: true };
}
