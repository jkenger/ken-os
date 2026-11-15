import assert from "node:assert/strict";
import { test } from "node:test";
import { sendEmail } from "./resend-client";

// No live Resend call is exercised here -- RESEND_API_KEY is never set in test, so every call takes the
// missing-key path (docs/architecture/jobs-email.md: "keeps running ... logs a warning once").

test("sendEmail with no RESEND_API_KEY warns once across repeated calls and never throws", async () => {
  delete process.env.RESEND_API_KEY;
  const warnings: unknown[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  try {
    await sendEmail({ to: "a@example.com", subject: "s", html: "<p>h</p>" });
    await sendEmail({ to: "a@example.com", subject: "s", html: "<p>h</p>" });
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1, "warns once even across multiple calls");
});
