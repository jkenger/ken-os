import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { emptyProfile } from "@ken-os/domain";
import { parsePortfolioSnapshot } from "@ken-os/portfolio";
import { closeDb, db } from "../src/lib/db/db";
import { labRoadmaps, portfolioPublications, users } from "../src/lib/db/schema";

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
    assert.deepEqual(empty, {
      live: null,
      latest: null,
      profileSavedAt: null,
      showEmail: false,
      unpublishedChanges: false,
      profileChanged: false,
      resume: null,
      contact: null,
      engineering: { roadmaps: [], learned: [] },
    });
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
    assert.ok(!JSON.stringify(live).toLowerCase().includes(email.toLowerCase()), "the email is off by default");
    assert.deepEqual(parsed.resume, { template: "classic", paper: "letter" });
    console.log("ok - Publish makes a snapshot live, without contact details");

    await profile.saveResumeSettings(userId, { template: "technical", paper: "a4" });
    assert.equal((await store.getPortfolio(userId)).unpublishedChanges, true, "a new template waits for Publish");
    assert.equal((await store.publishPortfolio(userId)).unpublishedChanges, false);
    assert.deepEqual((await store.liveSnapshot(email.toLowerCase()))?.resume, { template: "technical", paper: "a4" });
    console.log("ok - Publish copies the Resume page's template and paper");

    const shown = await store.updateSettings(userId, { showEmail: true });
    assert.equal(shown.showEmail, true);
    assert.equal(shown.unpublishedChanges, true, "Show email waits for Publish");
    assert.ok(
      !JSON.stringify(await store.liveSnapshot(email.toLowerCase())).includes(email),
      "not live before Publish",
    );
    await store.publishPortfolio(userId);
    assert.equal((await store.liveSnapshot(email.toLowerCase()))?.profile.email, email);
    await store.updateSettings(userId, { showEmail: false });
    await store.publishPortfolio(userId);
    assert.equal((await store.liveSnapshot(email.toLowerCase()))?.profile.email, undefined);
    await assert.rejects(store.updateSettings(userId, { showEmail: "yes" }), store.PortfolioInputError);
    console.log("ok - Show email publishes the email only while it is on");

    await profile.saveProfile(userId, { ...details, summary: "Builds more" }, null);
    assert.equal((await store.liveSnapshot(email.toLowerCase()))?.profile.summary, "Builds things");
    const [second] = await Promise.all([store.publishPortfolio(userId), store.publishPortfolio(userId)]);
    const after = await store.getPortfolio(userId);
    assert.equal(after.latest?.version, 6, "two Publish clicks at once get their own versions");
    assert.ok(second.live);
    assert.equal((await store.liveSnapshot(email.toLowerCase()))?.profile.summary, "Builds more");
    console.log("ok - edits go live only on the next Publish");

    const off = await store.unpublishPortfolio(userId);
    assert.equal(off.live, null);
    assert.equal(off.latest?.version, 6, "past publications stay");
    assert.equal(await store.liveSnapshot(email.toLowerCase()), null);
    assert.equal((await store.publishPortfolio(userId)).live?.version, 7);
    console.log("ok - Unpublish takes it offline, and the count continues");

    const status = await import("../src/features/engineering-lab/status-store");
    const roadmapId = randomUUID();
    await db()
      .insert(labRoadmaps)
      .values({
        id: roadmapId,
        userId,
        goal: "Check goal",
        status: "active",
        chapters: [{ id: "react", title: "React", topicIds: ["react.render_model", "react.effects"] }],
      });
    const words = "Each render sees state as a snapshot, so three setCount(count + 1) calls queue 1 three times.";
    await status.reportProgress(userId, "react.render_model", {
      summary: "Explained it",
      status: "learned",
      evidence: { explanation: words, note: "Unaided" },
    });
    const withRoadmap = await store.getPortfolio(userId);
    assert.deepEqual(
      withRoadmap.engineering.roadmaps.map(({ goal, learned, total, shown }) => ({ goal, learned, total, shown })),
      [{ goal: "Check goal", learned: 1, total: 2, shown: true }],
      "the roadmap opened last is shown by default",
    );
    assert.equal(withRoadmap.engineering.learned[0].explanation, words);
    assert.equal(withRoadmap.engineering.learned[0].shown, false, "explanations are off by default");
    assert.equal(withRoadmap.unpublishedChanges, true, "progress on a shown roadmap waits for Publish");
    assert.equal((await store.publishPortfolio(userId)).unpublishedChanges, false, "Publish clears the warning");
    let engineering = (await store.liveSnapshot(email.toLowerCase()))?.engineering;
    assert.equal(engineering?.roadmaps[0].chapters[0].topics[0].status, "learned");
    assert.ok(!JSON.stringify(engineering).includes(words), "the explanation stays private until switched on");

    await assert.rejects(
      store.updateSettings(userId, { topicId: "react.effects", shown: true }),
      (error: Error) => error instanceof store.PortfolioInputError && error.status === 409,
    );
    const effectsWords =
      "An effect syncs with something outside React after the render commits, and cleans up before the next.";
    await status.reportProgress(userId, "react.effects", {
      summary: "Explained it",
      status: "learned",
      evidence: { explanation: effectsWords, note: "Unaided" },
    });
    await Promise.all([
      store.updateSettings(userId, { topicId: "react.render_model", shown: true }),
      store.updateSettings(userId, { topicId: "react.effects", shown: true }),
    ]);
    const explained = await store.getPortfolio(userId);
    assert.deepEqual(
      explained.engineering.learned.map((topic) => topic.shown),
      [true, true],
      "two switches flipped at once both stay on",
    );
    assert.equal(explained.unpublishedChanges, true);
    assert.equal((await store.publishPortfolio(userId)).unpublishedChanges, false);
    engineering = (await store.liveSnapshot(email.toLowerCase()))?.engineering;
    assert.equal(engineering?.roadmaps[0].chapters[0].topics[0].explanation, words);
    assert.equal(engineering?.roadmaps[0].chapters[0].topics[1].explanation, effectsWords);

    await status.setStatus(userId, "react.effects", "in_progress");
    assert.equal((await store.getPortfolio(userId)).unpublishedChanges, true);
    await store.publishPortfolio(userId);
    engineering = (await store.liveSnapshot(email.toLowerCase()))?.engineering;
    assert.equal(
      engineering?.roadmaps[0].chapters[0].topics[1].explanation,
      undefined,
      "a topic set back from Learned publishes no explanation",
    );
    assert.equal(engineering?.roadmaps[0].chapters[0].topics[0].explanation, words);

    const hidden = await store.updateSettings(userId, { roadmapId, shown: false });
    assert.equal(hidden.engineering.roadmaps[0].shown, false);
    assert.deepEqual(hidden.engineering.learned, [], "no explanations to show without a shown roadmap");
    await store.publishPortfolio(userId);
    assert.deepEqual((await store.liveSnapshot(email.toLowerCase()))?.engineering, { roadmaps: [] });
    await assert.rejects(store.updateSettings(userId, { roadmapId: "nope", shown: true }), store.PortfolioInputError);
    await assert.rejects(store.updateSettings(userId, { roadmapId, shown: "yes" }), store.PortfolioInputError);
    console.log("ok - Engineering publishes the shown roadmaps, and an explanation only once switched on");

    const { publicResumeResponse } = await import("../src/features/portfolio/public-resume");
    // The real renderer is covered by resume.test.ts; here only what is printed and how it is served matter.
    const printed: string[] = [];
    const GET = (request: Request) =>
      publicResumeResponse(request, async (details, template, paper) => {
        printed.push(`${details.contact.fullName} ${template} ${paper}`);
        return Buffer.from("%PDF-1.4");
      });
    const ownerBefore = process.env.OWNER_EMAIL;
    process.env.OWNER_EMAIL = email;
    try {
      const url = "http://loots.test/api/public/portfolio/resume";
      const shown = await GET(new Request(url));
      assert.equal(shown.status, 200);
      assert.equal(printed.at(-1), "Portfolio Check technical a4");
      assert.equal(shown.headers.get("content-type"), "application/pdf");
      assert.equal(shown.headers.get("cache-control"), "no-store");
      assert.equal(shown.headers.get("x-robots-tag"), "noindex");
      assert.match(shown.headers.get("content-disposition") ?? "", /^inline; filename="Portfolio Check Resume\.pdf"/);
      const download = await GET(new Request(`${url}?download=1`));
      assert.match(download.headers.get("content-disposition") ?? "", /^attachment;/);

      await db()
        .update(portfolioPublications)
        .set({ snapshot: sql`${portfolioPublications.snapshot} - 'resume'` })
        .where(eq(portfolioPublications.userId, userId));
      assert.equal((await GET(new Request(url))).status, 200, "a snapshot from before resume settings still prints");
      assert.equal(printed.at(-1), "Portfolio Check classic letter");

      await store.unpublishPortfolio(userId);
      const gone = await GET(new Request(url));
      assert.equal(gone.status, 404);
      assert.equal(gone.headers.get("x-robots-tag"), "noindex");
      assert.equal(gone.headers.get("cache-control"), "no-store");
      console.log("ok - the public resume serves the live snapshot as a PDF and 404s once unpublished");
    } finally {
      process.env.OWNER_EMAIL = ownerBefore;
    }
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
