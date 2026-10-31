import assert from "node:assert/strict";
import { test } from "node:test";
import { targetCountryFrom } from "./target-country";

test("a two-letter code in Profile is used as-is, upper-cased", () => {
  assert.equal(targetCountryFrom("us"), "US");
  assert.equal(targetCountryFrom("GB"), "GB");
});

test("a blank Profile country defaults to PH", () => {
  assert.equal(targetCountryFrom(""), "PH");
  assert.equal(targetCountryFrom("   "), "PH");
});

test("a free-text country name that isn't a two-letter code defaults to PH", () => {
  assert.equal(targetCountryFrom("Philippines"), "PH");
  assert.equal(targetCountryFrom("United States"), "PH");
});

test("surrounding whitespace around a valid code is trimmed", () => {
  assert.equal(targetCountryFrom("  ph  "), "PH");
});
