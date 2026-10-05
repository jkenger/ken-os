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
    throw new Error("Google sign-in is broken. Reconnect Google");
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
  if (!rows[0]) throw new Error("Google Drive isn't connected. Reconnect Google");
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: decryptToken(rows[0].encryptedRefreshToken),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Google sign-in expired. Reconnect Google");
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token)
    throw new Error("Google didn't respond. Reconnect Google");
  return payload.access_token;
}
