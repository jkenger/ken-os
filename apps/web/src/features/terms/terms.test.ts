import assert from "node:assert/strict";
import { test } from "node:test";
import { finalizeTermAnswer, isTrustedSourceUrl, safeReturnPath, termKey } from "@ken-os/domain";

test("one saved term per spelling: case, spacing and trailing punctuation don't count", () => {
  assert.equal(termKey("  Microtask. "), "microtask");
  assert.equal(termKey("`call   stack`"), "call stack");
  assert.equal(termKey("Idempotent!"), termKey("idempotent"));
});

test("only https links on the Researcher's trusted sites are kept", () => {
  assert.ok(isTrustedSourceUrl("https://developer.mozilla.org/en-US/docs/Glossary/Idempotent"));
  assert.ok(isTrustedSourceUrl("https://www.postgresql.org/docs/current/indexes.html"));
  assert.equal(isTrustedSourceUrl("http://developer.mozilla.org/"), false, "plain http is refused");
  assert.equal(
    isTrustedSourceUrl("https://developer.mozilla.org.evil.example/"),
    false,
    "a look-alike host is refused",
  );
  assert.equal(isTrustedSourceUrl("https://example.com/microtask"), false);
  assert.equal(isTrustedSourceUrl("javascript:alert(1)"), false);
});

test("an AI answer with an untrusted link keeps the meaning and drops the link", () => {
  const answer = finalizeTermAnswer("microtask", {
    term: "microtask",
    meaning: "  A small job  run after the current code. ",
    sourceTitle: "Blog",
    sourceUrl: "https://someblog.example/post",
  });
  assert.equal(answer.meaning, "A small job run after the current code.");
  assert.equal(answer.source, null);
});

test("the link back to where a term was found stays on Ken OS", () => {
  assert.equal(safeReturnPath("/lab/topics/js.event_loop?step=learn"), "/lab/topics/js.event_loop?step=learn");
  assert.equal(safeReturnPath("//evil.example/x"), "/");
  assert.equal(safeReturnPath("https://evil.example/"), "/");
  assert.equal(safeReturnPath("javascript:alert(1)"), "/");
});
