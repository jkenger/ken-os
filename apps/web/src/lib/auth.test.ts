import assert from "node:assert/strict";
import { test } from "node:test";
import { signInErrorCodes, signInNotice } from "./auth-errors";
import {
  RENEW_AFTER,
  SESSION_IDLE,
  SESSION_MAX,
  readSessionToken,
  renewSession,
  renewalFor,
  safeNext,
  sessionExpiry,
  signSession,
} from "./session";

// docs/architecture/auth-sign-in.md §8.

process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-bytes-long";
process.env.OWNER_EMAIL ??= "owner@example.test";
const owner = process.env.OWNER_EMAIL;

test("safeNext keeps same-origin page paths", () => {
  assert.equal(safeNext("/engineering/learn?x=1"), "/engineering/learn?x=1");
  assert.equal(safeNext("/"), "/");
  assert.equal(safeNext("/terms#top"), "/terms");
});

test("safeNext turns every other shape into /", () => {
  for (const value of [
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "/api/x",
    "/api",
    "/sign-in",
    "/sign-in?next=/",
    "",
    undefined,
    null,
    "evil.com",
    "/\tevil",
  ]) {
    assert.equal(safeNext(value), "/", String(value));
  }
});

test("every sign-in error code has alert text, and unknown codes never echo the URL", () => {
  for (const code of signInErrorCodes) {
    const notice = signInNotice({ error: code });
    assert.ok(notice?.text, code);
  }
  assert.equal(signInNotice({ error: "unverified" })?.action, "another");
  assert.equal(signInNotice({ error: "<script>" })?.text, "Google sign-in failed. Try again");
  assert.equal(signInNotice({ expired: "1" })?.text, "Session ended. Sign in again");
  assert.equal(signInNotice({ signed_out: "1" })?.text, "Signed out");
  assert.equal(signInNotice({}), null);
});

test("renewal skips under a day, renews over a day, refuses past 90 days", () => {
  const authTime = 1_000_000;
  assert.equal(renewalFor({ authTime, issuedAt: authTime }, authTime + RENEW_AFTER - 1), "skip");
  assert.equal(renewalFor({ authTime, issuedAt: authTime }, authTime + RENEW_AFTER + 1), "renew");
  assert.equal(renewalFor({ authTime, issuedAt: authTime + SESSION_MAX - 10 }, authTime + SESSION_MAX), "refuse");
});

test("a session expires 30 days after its last renewal, never past 90 days from sign-in", () => {
  const authTime = 1_000_000;
  assert.equal(sessionExpiry(authTime, authTime), authTime + SESSION_IDLE);
  assert.equal(sessionExpiry(authTime, authTime + 80 * 86400), authTime + SESSION_MAX);
});

test("renewSession re-signs with the same subject, email and sign-in time", async () => {
  const authTime = Math.floor(Date.now() / 1000) - 5 * 86400;
  const { token } = await signSession({ sub: "user-1", email: owner, authTime }, authTime + 2 * 86400);
  const now = authTime + 4 * 86400;
  assert.equal(await renewSession(token, authTime + 2 * 86400 + 60), null);
  const renewed = await renewSession(token, now);
  assert.ok(renewed);
  assert.equal(renewed.maxAge, SESSION_IDLE);
  const claims = await readSessionToken(renewed.token, now);
  assert.deepEqual(claims, { sub: "user-1", email: owner, authTime, issuedAt: now });
});

test("a session past its expiry or the 90-day cap is invalid", async () => {
  const authTime = 1_000_000;
  const { token } = await signSession({ sub: "user-1", email: owner, authTime }, authTime);
  assert.ok(await readSessionToken(token, authTime + 60));
  assert.equal(await readSessionToken(token, authTime + SESSION_IDLE + 1), null);
  const late = await signSession({ sub: "user-1", email: owner, authTime }, authTime + SESSION_MAX - 86400);
  assert.ok(await readSessionToken(late.token, authTime + SESSION_MAX - 60));
  assert.equal(await readSessionToken(late.token, authTime + SESSION_MAX), null);
  assert.equal(await renewSession(late.token, authTime + SESSION_MAX), null);
});

test("a session for any email is valid, sign-in is no longer owner-only", async () => {
  const { token } = await signSession({ sub: "user-2", email: "someone@else.test", authTime: 1_000_000 }, 1_000_000);
  const claims = await readSessionToken(token, 1_000_060);
  assert.equal(claims?.email, "someone@else.test");
});
