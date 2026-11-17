import assert from "node:assert/strict";
import { test } from "node:test";
import { digestEmail, isDigestDue, philippineTimeOfDay, sendDigestEmailIfDue } from "./digest-email";

test("philippineTimeOfDay converts UTC midnight to 8 AM Philippine time", () => {
  assert.equal(philippineTimeOfDay(new Date("2026-11-15T00:00:00Z")), "08:00");
});

test("philippineTimeOfDay wraps past midnight", () => {
  assert.equal(philippineTimeOfDay(new Date("2026-11-15T17:30:00Z")), "01:30");
});

test("before digestTime, a digest is not due, regardless of lastDigestSentAt", () => {
  assert.equal(isDigestDue("06:59", "07:00", null, new Date("2026-11-15T00:00:00Z")), false);
});

test("at digestTime with no prior digest, it is due", () => {
  assert.equal(isDigestDue("07:00", "07:00", null, new Date("2026-11-15T00:00:00Z")), true);
});

test("after digestTime with no prior digest, it is due", () => {
  assert.equal(isDigestDue("09:15", "07:00", null, new Date("2026-11-15T00:00:00Z")), true);
});

test("sent 2 hours ago, past digestTime, it is not due again", () => {
  const now = new Date("2026-11-15T09:00:00Z");
  const lastSent = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  assert.equal(isDigestDue("17:00", "07:00", lastSent, now), false);
});

test("sent 22 hours ago, past digestTime, it is due again", () => {
  const now = new Date("2026-11-15T09:00:00Z");
  const lastSent = new Date(now.getTime() - 22 * 60 * 60 * 1000);
  assert.equal(isDigestDue("17:00", "07:00", lastSent, now), true);
});

test("sent exactly at the 20 hour boundary is not yet due (strictly more than 20 hours)", () => {
  const now = new Date("2026-11-15T09:00:00Z");
  const lastSent = new Date(now.getTime() - 20 * 60 * 60 * 1000);
  assert.equal(isDigestDue("17:00", "07:00", lastSent, now), false);
});

const basePosting = { id: "p1", title: "Role", company: "Co", score: 90 };

test("digestEmail's subject counts the new postings", () => {
  const { subject } = digestEmail([basePosting, { ...basePosting, id: "p2" }], [], "https://app.example");
  assert.equal(subject, "Job digest: 2 new postings");
});

test("digestEmail's subject is singular for exactly one posting", () => {
  const { subject } = digestEmail([basePosting], [], "https://app.example");
  assert.equal(subject, "Job digest: 1 new posting");
});

test("digestEmail's subject says so when there are no new postings", () => {
  const { subject } = digestEmail([], [], "https://app.example");
  assert.equal(subject, "Job digest: no new postings today");
});

test("digestEmail groups postings by score band", () => {
  const { html } = digestEmail(
    [
      { ...basePosting, id: "high", score: 90 },
      { ...basePosting, id: "mid", score: 65 },
      { ...basePosting, id: "low", score: 10 },
      { ...basePosting, id: "unscored", score: null },
    ],
    [],
    "https://app.example",
  );
  assert.match(html, /80 and up/);
  assert.match(html, /60 to 79/);
  assert.match(html, /Below 60/);
  assert.match(html, /Not yet scored/);
  assert.match(html, /href="https:\/\/app\.example\/jobs\/high"/);
});

test("digestEmail lists filtered-out counts by reason", () => {
  const { html } = digestEmail(
    [],
    [
      { reason: "Below minimum pay", count: 3 },
      { reason: "Recruiting agency", count: 1 },
    ],
    "https://app.example",
  );
  assert.match(html, /Below minimum pay: 3/);
  assert.match(html, /Recruiting agency: 1/);
});

test("a posting's own title and company are escaped before going into the HTML body", () => {
  const { html } = digestEmail(
    [{ ...basePosting, title: "<script>alert(1)</script>", company: "Evil & Co" }],
    [],
    "https://app.example",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Evil &amp; Co"));
});

function deps(overrides: Partial<Parameters<typeof sendDigestEmailIfDue>[3]> = {}) {
  return {
    getUserEmail: async () => "owner@example.com",
    getDigestPostings: async () => [basePosting],
    getFilteredOutCounts: async () => [],
    sendEmail: async () => {},
    markSent: async () => {},
    appUrl: "https://app.example",
    ...overrides,
  };
}

test("sendDigestEmailIfDue sends and marks sent when due", async () => {
  const sent: unknown[] = [];
  const marked: string[] = [];
  const now = new Date("2026-11-15T00:00:00Z"); // 08:00 Philippine time
  await sendDigestEmailIfDue("user-1", { digestTime: "07:00", lastDigestSentAt: null }, now, {
    ...deps(),
    sendEmail: async (params) => {
      sent.push(params);
    },
    markSent: async (userId) => {
      marked.push(userId);
    },
  });
  assert.equal(sent.length, 1);
  assert.deepEqual(marked, ["user-1"]);
});

test("sendDigestEmailIfDue does nothing before digestTime", async () => {
  let sendCalls = 0;
  const now = new Date("2026-11-14T22:00:00Z"); // 06:00 Philippine time
  await sendDigestEmailIfDue("user-1", { digestTime: "07:00", lastDigestSentAt: null }, now, {
    ...deps(),
    sendEmail: async () => {
      sendCalls += 1;
    },
  });
  assert.equal(sendCalls, 0);
});

test("sendDigestEmailIfDue does nothing when already sent recently", async () => {
  let sendCalls = 0;
  const now = new Date("2026-11-15T09:00:00Z");
  const lastDigestSentAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  await sendDigestEmailIfDue("user-1", { digestTime: "07:00", lastDigestSentAt }, now, {
    ...deps(),
    sendEmail: async () => {
      sendCalls += 1;
    },
  });
  assert.equal(sendCalls, 0);
});

test("sendDigestEmailIfDue queries since lastDigestSentAt when set, otherwise 24 hours back", async () => {
  const sinceValues: Date[] = [];
  const now = new Date("2026-11-15T00:00:00Z"); // 08:00 Philippine time
  const lastDigestSentAt = new Date("2026-11-14T00:00:00Z");
  await sendDigestEmailIfDue("user-1", { digestTime: "07:00", lastDigestSentAt }, now, {
    ...deps(),
    getDigestPostings: async (_userId, since) => {
      sinceValues.push(since);
      return [];
    },
  });
  assert.equal(sinceValues[0]!.toISOString(), lastDigestSentAt.toISOString());

  await sendDigestEmailIfDue("user-2", { digestTime: "07:00", lastDigestSentAt: null }, now, {
    ...deps(),
    getDigestPostings: async (_userId, since) => {
      sinceValues.push(since);
      return [];
    },
  });
  assert.equal(sinceValues[1]!.toISOString(), new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
});
