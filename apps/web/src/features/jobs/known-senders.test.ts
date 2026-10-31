import assert from "node:assert/strict";
import { test } from "node:test";
import { knownAlertSource } from "./known-senders";

test("a LinkedIn alert address is recognized", () => {
  assert.equal(knownAlertSource("jobs-noreply@linkedin.com"), "linkedin");
});

test("a LinkedIn email subdomain address is recognized", () => {
  assert.equal(knownAlertSource("jobalerts-noreply@e.linkedin.com"), "linkedin");
});

test("an Indeed alert address is recognized", () => {
  assert.equal(knownAlertSource("alert@indeed.com"), "indeed");
});

test("an unrelated address is not recognized", () => {
  assert.equal(knownAlertSource("someone@example.com"), null);
});

test("a lookalike domain is not recognized", () => {
  assert.equal(knownAlertSource("jobs-noreply@linkedin.com.evil.test"), null);
});

test("matching is case-insensitive", () => {
  assert.equal(knownAlertSource("Jobs-Noreply@LinkedIn.com"), "linkedin");
});
