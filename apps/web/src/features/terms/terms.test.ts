import assert from "node:assert/strict";
import { test } from "node:test";
import { finalizeTermAnswer, firstTermMatches, isTrustedSourceUrl, safeReturnPath, termKey } from "@ken-os/domain";

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

test("the link back to where a term was found stays on Loots", () => {
  assert.equal(safeReturnPath("/lab/topics/js.event_loop?step=learn"), "/lab/topics/js.event_loop?step=learn");
  assert.equal(safeReturnPath("//evil.example/x"), "/");
  assert.equal(safeReturnPath("https://evil.example/"), "/");
  assert.equal(safeReturnPath("javascript:alert(1)"), "/");
});

test("a saved term is marked once per page, at its first whole-word match", () => {
  const texts = ["The microtask queue runs.", "Another microtask later.", "Microtasks again."];
  assert.deepEqual(firstTermMatches(texts, ["microtask"]), [{ index: 0, start: 4, end: 13, key: "microtask" }]);
});

test("a plural matches its saved singular, and case doesn't matter", () => {
  assert.deepEqual(firstTermMatches(["Two Closures here"], ["closure"]), [
    { index: 0, start: 4, end: 12, key: "closure" },
  ]);
  assert.deepEqual(firstTermMatches(["Many classes"], ["class"]), [{ index: 0, start: 5, end: 12, key: "class" }]);
});

test("a term never matches inside another word", () => {
  assert.deepEqual(firstTermMatches(["Indexes and reindexing", "subclass"], ["index", "class"]), [
    { index: 0, start: 0, end: 7, key: "index" },
  ]);
});

test("a phrase matches across extra spaces, and the longer saved term wins", () => {
  assert.deepEqual(firstTermMatches(["The call\n  stack grows"], ["call stack", "stack", "call"]), [
    { index: 0, start: 4, end: 16, key: "call stack" },
  ]);
});

test("terms with symbols are matched literally", () => {
  assert.deepEqual(firstTermMatches(["Use C++ or Node.js, not aXb."], ["c++", "node.js", "a.b"]), [
    { index: 0, start: 4, end: 7, key: "c++" },
    { index: 0, start: 11, end: 18, key: "node.js" },
  ]);
});

test("no saved terms means no matches", () => {
  assert.deepEqual(firstTermMatches(["anything"], []), []);
  assert.deepEqual(firstTermMatches(["anything"], ["", "  "]), []);
});
