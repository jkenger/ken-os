import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { finishSignIn } from "../src/lib/auth-flow";
import { closeDb, db } from "../src/lib/db";
import { users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// docs/architecture/auth-sign-in.md §8: the sign-in callback against local PostgreSQL.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("This smoke test only runs against local PostgreSQL.");
  }
  const userId = `auth-test-${randomUUID()}`;
  // A throwaway owner: users.email is unique, so the real owner's row can't be reused.
  const owner = `${userId}@example.invalid`;
  process.env.OWNER_EMAIL = owner;
  try {
    // signin: wrong account, unverified email and missing fields are refused without writing anything.
    assert.deepEqual(await finishSignIn({ sub: userId, email: "someone@else.invalid", email_verified: true }), {
      ok: false,
      code: "wrong_account",
    });
    assert.deepEqual(await finishSignIn({ sub: userId, email: owner, email_verified: false }), {
      ok: false,
      code: "unverified",
    });
    assert.deepEqual(await finishSignIn({ email: owner, email_verified: true }), { ok: false, code: "google" });
    assert.equal((await db().select().from(users).where(eq(users.id, userId))).length, 0);

    // signin: creates the user.
    const signedIn = await finishSignIn({ sub: userId, email: owner, email_verified: true, name: "Owner" });
    assert.deepEqual(signedIn, { ok: true, session: { userId, email: owner } });
    assert.equal((await db().select().from(users).where(eq(users.id, userId)))[0]?.name, "Owner");
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
