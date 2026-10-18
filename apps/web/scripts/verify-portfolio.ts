import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { emptyProfile } from "@ken-os/domain";
import { parsePortfolioSnapshot } from "@ken-os/portfolio";
import { closeDb, db } from "../src/lib/db";
import { users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Portfolio. A throwaway user is created and deleted, cascading everything it made.
async function main() {
  const store = await import("../src/features/portfolio/store");
  const profile = await import("../src/features/profile/store");
  const userId = `portfolio-check-${randomUUID()}`;
  const email = `${userId}@Example.invalid`;
  await db().insert(users).values({ id: userId, email, name: "Portfolio Check" });
  try {
    const empty = await store.getPortfolio(userId);
    assert.deepEqual(empty, { live: null, latest: null, profileSavedAt: null });
    await assert.rejects(
      store.publishPortfolio(userId),
      (error: Error) => error instanceof store.PortfolioInputError && error.status === 409,
    );
    assert.equal(await store.liveSnapshot(email.toLowerCase()), null);
    console.log("ok - nothing to publish before the Profile is saved");

    const details = emptyProfile();
    details.contact = {
      ...details.contact,
      fullName: "Portfolio Check",
      email,
      phone: "0917 000 0000",
      city: "Manila",
    };
    details.summary = "Builds things";
    await profile.saveProfile(userId, details, null);

    const first = await store.publishPortfolio(userId);
    assert.equal(first.live?.version, 1);
    const live = await store.liveSnapshot(email.toLowerCase());
    assert.ok(live, "the owner's email matches whatever its case");
    const parsed = parsePortfolioSnapshot(live);
    assert.equal(parsed.profile.summary, "Builds things");
    assert.ok(!JSON.stringify(live).includes("0917"), "the phone is never published");
    assert.ok(!JSON.stringify(live).toLowerCase().includes(email.toLowerCase()), "the email is never published");
    console.log("ok - Publish makes a snapshot live, without contact details");

    await profile.saveProfile(userId, { ...details, summary: "Builds more" }, null);
    assert.equal((await store.liveSnapshot(email.toLowerCase()))?.profile.summary, "Builds things");
    const [second] = await Promise.all([store.publishPortfolio(userId), store.publishPortfolio(userId)]);
    const after = await store.getPortfolio(userId);
    assert.equal(after.latest?.version, 3, "two Publish clicks at once get their own versions");
    assert.ok(second.live);
    assert.equal((await store.liveSnapshot(email.toLowerCase()))?.profile.summary, "Builds more");
    console.log("ok - edits go live only on the next Publish");

    const off = await store.unpublishPortfolio(userId);
    assert.equal(off.live, null);
    assert.equal(off.latest?.version, 3, "past publications stay");
    assert.equal(await store.liveSnapshot(email.toLowerCase()), null);
    assert.equal((await store.publishPortfolio(userId)).live?.version, 4);
    console.log("ok - Unpublish takes it offline, and the count continues");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
