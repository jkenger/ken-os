import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { finishDriveGrant, finishSignIn } from "../src/lib/auth-flow";
import { closeDb, db } from "../src/lib/db";
import { DRIVE_SCOPE } from "../src/lib/oauth";
import { googleConnections, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// docs/architecture/auth-sign-in.md §8: the callback's two intents against local PostgreSQL.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("This smoke test only runs against local PostgreSQL.");
  }
  process.env.TOKEN_ENCRYPTION_KEY ??= "local-auth-smoke-test-key";
  const userId = `auth-test-${randomUUID()}`;
  // A throwaway owner: users.email is unique, so the real owner's row can't be reused.
  const owner = `${userId}@example.invalid`;
  process.env.OWNER_EMAIL = owner;
  const connection = () => db().select().from(googleConnections).where(eq(googleConnections.userId, userId));
  try {
    // signin: wrong account, unverified email and missing fields are refused without writing anything.
    assert.deepEqual(await finishSignIn({ sub: userId, email: "someone@else.invalid", email_verified: true }), { ok: false, code: "wrong_account" });
    assert.deepEqual(await finishSignIn({ sub: userId, email: owner, email_verified: false }), { ok: false, code: "unverified" });
    assert.deepEqual(await finishSignIn({ email: owner, email_verified: true }), { ok: false, code: "google" });
    assert.equal((await db().select().from(users).where(eq(users.id, userId))).length, 0);

    // signin: creates the user and leaves google_connections alone.
    const signedIn = await finishSignIn({ sub: userId, email: owner, email_verified: true, name: "Owner" });
    assert.deepEqual(signedIn, { ok: true, session: { userId, email: owner } });
    assert.equal((await db().select().from(users).where(eq(users.id, userId)))[0]?.name, "Owner");
    assert.equal((await connection()).length, 0);

    // drive: refused for another Google account, without the Drive scope, or without a refresh token.
    const tokens = { access_token: "access", refresh_token: "refresh-1", scope: `openid email ${DRIVE_SCOPE}` };
    assert.deepEqual(await finishDriveGrant(userId, tokens, { sub: "someone-else" }), { ok: false, code: "google" });
    assert.deepEqual(await finishDriveGrant(userId, { ...tokens, scope: "openid email" }, { sub: userId }), { ok: false, code: "scope" });
    assert.deepEqual(await finishDriveGrant(userId, { ...tokens, refresh_token: undefined }, { sub: userId }), { ok: false, code: "google" });
    assert.equal((await connection()).length, 0);

    // drive: stores the refresh token encrypted against the stored user, and a reconnect replaces it.
    assert.deepEqual(await finishDriveGrant(userId, tokens, { sub: userId }), { ok: true });
    const [first] = await connection();
    assert.ok(first);
    assert.ok(!first.encryptedRefreshToken.includes("refresh-1"));
    assert.deepEqual(await finishDriveGrant(userId, { ...tokens, refresh_token: "refresh-2" }, { sub: userId }), { ok: true });
    const [second] = await connection();
    assert.notEqual(second?.encryptedRefreshToken, first.encryptedRefreshToken);

    // signin again: the Drive connection survives.
    assert.equal((await finishSignIn({ sub: userId, email: owner, email_verified: true })).ok, true);
    assert.equal((await connection())[0]?.encryptedRefreshToken, second?.encryptedRefreshToken);
    console.log("Auth callback database smoke test passed");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
