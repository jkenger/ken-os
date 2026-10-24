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
  await db()
    .insert(users)
    .values([
      { id: userId, email: `${userId}@example.invalid`, name: "Profile Check" },
      { id: otherId, email: `${otherId}@example.invalid`, name: "Other" },
    ]);
  try {
    const first = await store.getProfile(userId);
    assert.equal(first.savedAt, null);
    assert.equal(first.details.contact.fullName, "Profile Check", "the name comes from sign-in before the first save");
    assert.equal(first.details.contact.email, `${userId}@example.invalid`);
    console.log("ok - an unsaved Profile is prefilled from sign-in");

    const details = {
      ...first.details,
      summary: "Builds things",
      experience: [
        { company: "Acme", title: "Engineer", location: "", start: "2024-01", end: "", bullets: ["Shipped it", ""] },
      ],
    };
    const { savedAt } = await store.saveProfile(userId, details, null);
    const saved = await store.getProfile(userId);
    assert.equal(saved.savedAt, savedAt);
    assert.deepEqual(saved.details.experience[0].bullets, ["Shipped it"], "saving cleans the details");
    await assert.rejects(
      store.saveProfile(userId, { ...details, experience: [{ title: "Dev", start: "soon" }] }, null),
      (error: Error) => error instanceof store.ProfileInputError && /Start/.test(error.message),
    );
    assert.equal((await store.getProfile(otherId)).savedAt, null, "another user's Profile is untouched");
    console.log("ok - save, read back, bad dates refused, one Profile per user");

    const importId = randomUUID();
    const otherImport = randomUUID();
    const row = {
      driveFileId: "file-1",
      driveModifiedTime: "2026-10-12T00:00:00Z",
      draft: emptyProfile(),
      promptVersion: "check",
      model: "check",
    };
    await db()
      .insert(profileImports)
      .values([
        { id: importId, userId, ...row },
        { id: otherImport, userId: otherId, ...row },
      ]);
    await store.saveProfile(userId, details, otherImport);
    const [stillPending] = await db().select().from(profileImports).where(eq(profileImports.id, otherImport));
    assert.equal(stillPending.status, "pending", "you can't apply another user's import");
    await store.saveProfile(userId, details, importId);
    const [applied] = await db().select().from(profileImports).where(eq(profileImports.id, importId));
    assert.equal(applied.status, "applied");
    assert.ok(applied.appliedAt);
    console.log("ok - saving a reviewed import marks only your own import applied");

    assert.deepEqual((await store.getProfile(userId)).resume, { template: "classic", paper: "letter" }, "defaults");
    const before = (await store.getProfile(userId)).savedAt;
    await store.saveResumeSettings(userId, { template: "technical", paper: "a4" });
    assert.deepEqual((await store.getProfile(userId)).resume, { template: "technical", paper: "a4" });
    assert.equal((await store.getProfile(userId)).savedAt, before, "choosing a template isn't a details save");
    await assert.rejects(store.saveResumeSettings(userId, { template: "fancy", paper: "a4" }), /Choose a template/);
    await assert.rejects(
      store.saveResumeSettings(otherId, { template: "compact", paper: "letter" }),
      (error: Error) => error instanceof store.ProfileInputError && error.status === 409,
      "nothing to remember before details are saved",
    );
    console.log("ok - template and paper are remembered per user");

    await assert.rejects(
      store.rewriteFromForm(userId, { details: emptyProfile(), targetRole: "" }),
      (error: Error) => error instanceof store.ProfileInputError && error.status === 422,
      "nothing to rewrite without experience or a project",
    );
    await assert.rejects(store.rewriteFromForm(userId, { details, targetRole: "x".repeat(121) }), /Target role/);
    await assert.rejects(
      store.rewriteFromForm(userId, { details: { ...details, experience: [{ title: "Dev", start: "soon" }] } }),
      /Start/,
      "the form is checked like a save before any AI call",
    );
    console.log("ok - rewrite checks its input before calling the AI");

    await assert.rejects(
      store.importFromDrive(userId),
      (error: Error) => error instanceof store.ProfileInputError && /No resume chosen/.test(error.message),
    );
    console.log("ok - import needs a chosen resume");

    const files = await import("../src/features/profile/resume-files-store");
    const pdf = Buffer.from("%PDF-1.7\nresume");
    const older = await files.addResumeFile(userId, "Old CV.pdf", pdf);
    const newer = await files.addResumeFile(userId, "New CV.pdf", pdf);
    await assert.rejects(files.addResumeFile(userId, "CV.pdf", Buffer.from("<html>")), Error);
    assert.deepEqual(
      (await files.listResumeFiles(userId)).map((file) => file.fileName),
      ["New CV.pdf", "Old CV.pdf"],
      "every upload is kept, newest first",
    );
    assert.equal(
      (await files.getResumeFile(userId, older.id))?.data.toString(),
      pdf.toString(),
      "bytes come back as sent",
    );
    assert.equal(await files.getResumeFile(otherId, older.id), null, "another user can't read it");
    assert.equal(await files.deleteResumeFile(otherId, older.id), false, "or delete it");
    assert.equal(await files.deleteResumeFile(userId, older.id), true);
    assert.deepEqual(
      (await files.listResumeFiles(userId)).map((file) => file.id),
      [newer.id],
    );
    console.log("ok - uploaded resumes are kept per user, newest first, and can be deleted");
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
