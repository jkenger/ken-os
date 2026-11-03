import assert from "node:assert/strict";
import { test } from "node:test";
import { secretsMatch } from "./secret";

test("the same string matches", () => {
  assert.equal(secretsMatch("s3cret", "s3cret"), true);
});

test("a different string of the same length does not match", () => {
  assert.equal(secretsMatch("s3creu", "s3cret"), false);
});

test("a shorter or longer guess does not match and does not throw", () => {
  assert.equal(secretsMatch("s3cre", "s3cret"), false);
  assert.equal(secretsMatch("s3crets", "s3cret"), false);
  assert.equal(secretsMatch("", "s3cret"), false);
});
