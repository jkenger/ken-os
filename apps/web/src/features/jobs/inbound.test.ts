import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { handleInboundEmail } from "./inbound";

const secret = "whsec_" + Buffer.from("test-secret-key-bytes").toString("base64");

function sign(id: string, timestamp: string, body: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${body}`;
  return `v1,${createHmac("sha256", key).update(signedContent).digest("base64")}`;
}

function webhookPayload(from: string) {
  return JSON.stringify({
    type: "email.received",
    created_at: "2026-10-30T00:00:00Z",
    data: {
      email_id: "email_1",
      created_at: "2026-10-30T00:00:00Z",
      from,
      to: ["jobs-jk@loots.app"],
      bcc: [],
      cc: [],
      received_for: ["jobs-jk@loots.app"],
      message_id: "msg_1",
      subject: "LinkedIn Job Alert",
      attachments: [],
    },
  });
}

const linkedInFixtureHtml =
  '<table><tr class="job-card"><td><a href="https://www.linkedin.com/jobs/view/999/?trk=x" class="job-card__title">Test Role</a><span class="job-card__company">Test Co</span><span class="job-card__location">Remote</span><p class="job-card__snippet">A snippet</p></td></tr></table>';

test("a correctly signed email from a known sender is parsed and saved", async () => {
  const body = webhookPayload("jobs-noreply@linkedin.com");
  const saved: unknown[] = [];
  const result = await handleInboundEmail({
    svixId: "msg_123",
    svixTimestamp: "1700000000",
    svixSignature: sign("msg_123", "1700000000", body),
    rawBody: body,
    webhookSecret: secret,
    fetchEmail: async () => ({ from: "jobs-noreply@linkedin.com", html: linkedInFixtureHtml, text: null }),
    saveInboundEmail: async () => "inbound-1",
    savePostings: async (postings) => {
      saved.push(...postings);
    },
  });
  assert.equal(result.stored, true);
  assert.equal(saved.length, 1);
});

test("a bad signature is rejected and nothing is fetched or saved", async () => {
  const body = webhookPayload("jobs-noreply@linkedin.com");
  let fetched = false;
  const result = await handleInboundEmail({
    svixId: "msg_123",
    svixTimestamp: "1700000000",
    svixSignature: "v1,not-a-real-signature",
    rawBody: body,
    webhookSecret: secret,
    fetchEmail: async () => {
      fetched = true;
      return { from: "jobs-noreply@linkedin.com", html: linkedInFixtureHtml, text: null };
    },
    saveInboundEmail: async () => "inbound-1",
    savePostings: async () => {},
  });
  assert.equal(result.stored, false);
  assert.equal(result.reason, "bad signature");
  assert.equal(fetched, false);
});

test("an email whose original sender isn't known is rejected and stored nowhere", async () => {
  const body = webhookPayload("someone@example.com");
  let fetched = false;
  const result = await handleInboundEmail({
    svixId: "msg_123",
    svixTimestamp: "1700000000",
    svixSignature: sign("msg_123", "1700000000", body),
    rawBody: body,
    webhookSecret: secret,
    fetchEmail: async () => {
      fetched = true;
      return { from: "someone@example.com", html: "", text: null };
    },
    saveInboundEmail: async () => "inbound-1",
    savePostings: async () => {},
  });
  assert.equal(result.stored, false);
  assert.equal(result.reason, "unknown sender");
  assert.equal(fetched, false);
});

const indeedFixtureHtml =
  '<table><tr class="jobCard"><td><a href="https://www.indeed.com/viewjob?jk=xyz999" class="jobCard_title">Test Role</a><span class="jobCard_company">Test Co</span><span class="jobCard_location">Remote</span><p class="jobCard_snippet">A snippet</p></td></tr></table>';

test("a correctly signed email from a known Indeed sender is parsed and saved", async () => {
  const body = webhookPayload("alert@indeed.com");
  const saved: unknown[] = [];
  const result = await handleInboundEmail({
    svixId: "msg_123",
    svixTimestamp: "1700000000",
    svixSignature: sign("msg_123", "1700000000", body),
    rawBody: body,
    webhookSecret: secret,
    fetchEmail: async () => ({ from: "alert@indeed.com", html: indeedFixtureHtml, text: null }),
    saveInboundEmail: async () => "inbound-1",
    savePostings: async (postings) => {
      saved.push(...postings);
    },
  });
  assert.equal(result.stored, true);
  assert.equal(saved.length, 1);
});
