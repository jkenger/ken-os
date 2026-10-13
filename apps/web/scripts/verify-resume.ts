import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { getSelectedResume } from "../src/lib/resume";
import { artifactSelections, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("This smoke test only runs against local PostgreSQL.");
  }
  const userId = `resume-test-${randomUUID()}`;
  await db()
    .insert(users)
    .values({ id: userId, email: `${userId}@example.invalid` });
  try {
    assert.equal(await getSelectedResume(userId), null);
    await db().insert(artifactSelections).values({
      userId,
      purpose: "primary_resume",
      provider: "google_drive",
      externalId: "original-drive-id",
      name: "My Resume",
      mimeType: "application/vnd.google-apps.document",
    });
    assert.equal((await getSelectedResume(userId))?.fileId, "original-drive-id");
    await db()
      .update(artifactSelections)
      .set({ name: "My Updated Resume", updatedAt: sql`now()` })
      .where(eq(artifactSelections.userId, userId));
    const refreshed = await getSelectedResume(userId);
    assert.equal(refreshed?.fileId, "original-drive-id");
    assert.equal(refreshed?.name, "My Updated Resume");
    console.log("Resume selection database smoke test passed");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
