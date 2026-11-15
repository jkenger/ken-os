import assert from "node:assert/strict";
import { test } from "node:test";
import { needsStrongMatchEmail, sendStrongMatchEmailIfDue, strongMatchEmail } from "./strong-match-email";

test("a score at the threshold, never sent, needs an email", () => {
  assert.equal(needsStrongMatchEmail(80, 80, false), true);
});

test("a score above the threshold needs an email", () => {
  assert.equal(needsStrongMatchEmail(90, 80, false), true);
});

test("a score below the threshold does not need an email", () => {
  assert.equal(needsStrongMatchEmail(79, 80, false), false);
});

test("an already-sent posting never needs another email, regardless of score", () => {
  assert.equal(needsStrongMatchEmail(95, 80, true), false);
});

test("a never-scored posting (null score) does not need an email", () => {
  assert.equal(needsStrongMatchEmail(null, 80, false), false);
});

const basePosting = {
  id: "p1",
  title: "Role",
  company: "Co",
  score: 90,
  payAmount: null,
  payCurrency: null,
  payPeriod: null,
  jobType: null,
  workSetup: null,
  shift: null,
  whyFits: [],
};

test("the subject is the score, title and company separated by a middle dot", () => {
  const { subject } = strongMatchEmail(
    { ...basePosting, title: "Senior Frontend Engineer", company: "Acme", score: 92 },
    "https://app.example",
  );
  assert.equal(subject, "92 · Senior Frontend Engineer, Acme");
});

test("the body links to the posting's detail page under the given app URL", () => {
  const { html } = strongMatchEmail({ ...basePosting, id: "posting-42" }, "https://app.example");
  assert.match(html, /href="https:\/\/app\.example\/jobs\/posting-42"/);
});

test("the body includes pay, job type, work setup and shift when they're stated", () => {
  const { html } = strongMatchEmail(
    {
      ...basePosting,
      payAmount: 140000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      shift: "Day shift, 9 AM to 5 PM",
    },
    "https://app.example",
  );
  assert.match(html, /USD 140,000 a year/);
  assert.match(html, /Full time/);
  assert.match(html, /Remote/);
  assert.match(html, /Day shift, 9 AM to 5 PM/);
});

test("unstated pay, job type, work setup and shift each show as Not listed", () => {
  const { html } = strongMatchEmail(basePosting, "https://app.example");
  assert.equal(html.match(/Not listed/g)?.length, 4);
});

test("why-it-fits reasons are listed when present", () => {
  const { html } = strongMatchEmail(
    { ...basePosting, whyFits: [{ reason: "5 years backend experience", citation: "5+ years required" }] },
    "https://app.example",
  );
  assert.match(html, /5 years backend experience/);
});

test("a posting's own title, company and score reasons are escaped before going into the HTML body", () => {
  const { html } = strongMatchEmail(
    {
      ...basePosting,
      title: "<script>alert(1)</script>",
      company: "Evil & Co",
      whyFits: [{ reason: "<b>bold</b> claim", citation: "x" }],
    },
    "https://app.example",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Evil &amp; Co"));
  assert.ok(html.includes("&lt;b&gt;bold&lt;/b&gt; claim"));
});

function deps(overrides: Partial<Parameters<typeof sendStrongMatchEmailIfDue>[3]> = {}) {
  return {
    getPosting: async () => ({ ...basePosting, instantEmailSentAt: null }),
    getUserEmail: async () => "owner@example.com",
    sendEmail: async () => {},
    markSent: async () => {},
    appUrl: "https://app.example",
    ...overrides,
  };
}

test("sendStrongMatchEmailIfDue sends once and marks sent for a posting at or above the threshold", async () => {
  const sent: unknown[] = [];
  const marked: string[] = [];
  await sendStrongMatchEmailIfDue("user-1", "p1", 80, {
    ...deps(),
    sendEmail: async (params) => {
      sent.push(params);
    },
    markSent: async (_userId, postingId) => {
      marked.push(postingId);
    },
  });
  assert.equal(sent.length, 1);
  assert.deepEqual(marked, ["p1"]);
});

test("sendStrongMatchEmailIfDue does nothing for a posting already sent", async () => {
  let sendCalls = 0;
  await sendStrongMatchEmailIfDue("user-1", "p1", 80, {
    ...deps({ getPosting: async () => ({ ...basePosting, instantEmailSentAt: new Date() }) }),
    sendEmail: async () => {
      sendCalls += 1;
    },
  });
  assert.equal(sendCalls, 0);
});

test("sendStrongMatchEmailIfDue does nothing for a posting below the threshold", async () => {
  let sendCalls = 0;
  await sendStrongMatchEmailIfDue("user-1", "p1", 80, {
    ...deps({ getPosting: async () => ({ ...basePosting, score: 60, instantEmailSentAt: null }) }),
    sendEmail: async () => {
      sendCalls += 1;
    },
  });
  assert.equal(sendCalls, 0);
});

test("sendStrongMatchEmailIfDue does nothing when the posting no longer exists", async () => {
  let sendCalls = 0;
  await sendStrongMatchEmailIfDue("user-1", "missing", 80, {
    ...deps({ getPosting: async () => null }),
    sendEmail: async () => {
      sendCalls += 1;
    },
  });
  assert.equal(sendCalls, 0);
});
