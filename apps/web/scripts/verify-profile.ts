import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { emptyProfile } from "@ken-os/domain";
import { closeDb, db } from "../src/lib/db";
import { profileImports, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Profile, with no AI or Drive calls. A throwaway user is created and deleted, cascading everything it made.
async function main() {
  const store = await import("../src/features/profile/store");
  const userId = `profile-check-${randomUUID()}`;
  const otherId = `${userId}-other`;
  await db().insert(users).values([
    { id: userId, email: `${userId}@example.invalid`, name: "Profile Check" },
    { id: otherId, email: `${otherId}@example.invalid`, name: "Other" },
  ]);
  try {
    const first = await store.getProfile(userId);
    assert.equal(first.savedAt, null);
    assert.equal(first.details.contact.fullName, "Profile Check", "the name comes from sign-in before the first save");
    assert.equal(first.details.contact.email, `${userId}@example.invalid`);
    console.log("ok - an unsaved Profile is prefilled from sign-in");

    const details = { ...first.details, summary: "Builds things", experience: [{ company: "Acme", title: "Engineer", location: "", start: "2024-01", end: "", bullets: ["Shipped it", ""] }] };
    const { savedAt } = await store.saveProfile(userId, details, null);
    const saved = await store.getProfile(userId);
    assert.equal(saved.savedAt, savedAt);
    assert.deepEqual(saved.details.experience[0].bullets, ["Shipped it"], "saving cleans the details");
    await assert.rejects(store.saveProfile(userId, { ...details, experience: [{ title: "Dev", start: "soon" }] }, null), (error: Error) => error instanceof store.ProfileInputError && /Start/.test(error.message));
    assert.equal((await store.getProfile(otherId)).savedAt, null, "another user's Profile is untouched");
    console.log("ok - save, read back, bad dates refused, one Profile per user");

    const importId = randomUUID();
    const otherImport = randomUUID();
    const row = { driveFileId: "file-1", driveModifiedTime: "2026-10-12T00:00:00Z", draft: emptyProfile(), promptVersion: "check", model: "check" };
    await db().insert(profileImports).values([{ id: importId, userId, ...row }, { id: otherImport, userId: otherId, ...row }]);
    await store.saveProfile(userId, details, otherImport);
    const [stillPending] = await db().select().from(profileImports).where(eq(profileImports.id, otherImport));
    assert.equal(stillPending.status, "pending", "you can't apply another user's import");
    await store.saveProfile(userId, details, importId);
    const [applied] = await db().select().from(profileImports).where(eq(profileImports.id, importId));
    assert.equal(applied.status, "applied");
    assert.ok(applied.appliedAt);
    console.log("ok - saving a reviewed import marks only your own import applied");

    await assert.rejects(store.importFromDrive(userId), (error: Error) => error instanceof store.ProfileInputError && /No resume chosen/.test(error.message));
    console.log("ok - import needs a chosen resume");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await db().delete(users).where(eq(users.id, otherId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
