import type { SignInErrorCode } from "./auth-errors";
import { db } from "./db";
import { users } from "./schema";
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

/** Finishes sign-in: a verified email, then the user row. Any Google account can sign in. */
export async function finishSignIn(
  profile: GoogleProfile,
): Promise<{ ok: true; session: Session } | { ok: false; code: SignInErrorCode }> {
  if (!profile.sub || !profile.email) return { ok: false, code: "google" };
  if (profile.email_verified !== true) return { ok: false, code: "unverified" };
  await db()
    .insert(users)
    .values({ id: profile.sub, email: profile.email, name: profile.name ?? null })
    .onConflictDoUpdate({ target: users.id, set: { email: profile.email, name: profile.name ?? null } });
  return { ok: true, session: { userId: profile.sub, email: profile.email } };
}
