import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { requiredEnv } from "./config";
import { googleConnections } from "./schema";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** Where the owner's Drive access stands: never granted, or granted but no longer accepted by Google. */
export type DriveAccess = "connected" | "not_connected" | "disconnected";

/** Thrown when Drive can't be used until the owner connects or reconnects it (docs/architecture/auth-sign-in.md §4). */
export class DriveAccessError extends Error {
  constructor(readonly access: Exclude<DriveAccess, "connected">) {
    super(access === "not_connected" ? "Google Drive not connected. Connect Google Drive" : "Google Drive disconnected. Reconnect Google Drive");
    this.name = "DriveAccessError";
  }
}

export async function hasDriveConnection(userId: string): Promise<boolean> {
  const rows = await db().select({ userId: googleConnections.userId })
    .from(googleConnections).where(eq(googleConnections.userId, userId)).limit(1);
  return Boolean(rows[0]);
}

function key(): Buffer {
  return createHash("sha256")
    .update(requiredEnv("TOKEN_ENCRYPTION_KEY"))
    .digest();
}

export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function decryptToken(value: string): string {
  const [encodedIv, encodedTag, encodedCiphertext] = value.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext)
    throw new DriveAccessError("disconnected");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getGoogleAccessToken(userId: string): Promise<string> {
  const rows = await db().select({ encryptedRefreshToken: googleConnections.encryptedRefreshToken })
    .from(googleConnections).where(eq(googleConnections.userId, userId)).limit(1);
  if (!rows[0]) throw new DriveAccessError("not_connected");
  let refreshToken: string;
  try {
    refreshToken = decryptToken(rows[0].encryptedRefreshToken);
  } catch {
    throw new DriveAccessError("disconnected");
  }
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    // invalid_grant: revoked in Google account settings, or expired.
    const failure = (await response.json().catch(() => null)) as { error?: string } | null;
    if (failure?.error === "invalid_grant") throw new DriveAccessError("disconnected");
    throw new Error("Couldn't reach Google Drive. Refresh to try again");
  }
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token)
    throw new Error("Couldn't reach Google Drive. Refresh to try again");
  return payload.access_token;
}
