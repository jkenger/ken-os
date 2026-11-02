import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { finishSignIn } from "../src/lib/auth/auth-flow";
import { closeDb, db } from "../src/lib/db/db";
import { users } from "../src/lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// docs/architecture/auth-sign-in.md §8: the sign-in callback against local PostgreSQL.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("This smoke test only runs against local PostgreSQL.");
  }
  const userId = `auth-test-${randomUUID()}`;
  // A throwaway address: users.email is unique, so a real account's row can't be reused.
  const email = `${userId}@example.invalid`;
  try {
    // signin: unverified email and missing fields are refused without writing anything.
    assert.deepEqual(await finishSignIn({ sub: userId, email, email_verified: false }), {
      ok: false,
      code: "unverified",
    });
    assert.deepEqual(await finishSignIn({ email, email_verified: true }), { ok: false, code: "google" });
    assert.equal((await db().select().from(users).where(eq(users.id, userId))).length, 0);

    // signin: creates the user, owner or not.
    const signedIn = await finishSignIn({ sub: userId, email, email_verified: true, name: "Tester" });
    assert.deepEqual(signedIn, { ok: true, session: { userId, email } });
    assert.equal((await db().select().from(users).where(eq(users.id, userId)))[0]?.name, "Tester");
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
