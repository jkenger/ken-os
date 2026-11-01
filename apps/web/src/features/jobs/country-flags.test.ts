import assert from "node:assert/strict";
import { test } from "node:test";
import { countryFlag, countryName } from "./country-flags";

test("renders a two-letter ISO code as its Unicode flag emoji", () => {
  assert.equal(countryFlag("ph"), "🇵🇭");
  assert.equal(countryFlag("US"), "🇺🇸");
  assert.equal(countryFlag("gb"), "🇬🇧");
});

test("reads the country name for a two-letter ISO code", () => {
  assert.equal(countryName("ph"), "Philippines");
  assert.equal(countryName("US"), "United States");
  assert.equal(countryName("do"), "Dominican Republic");
});

test("a malformed, non-two-letter code falls back to the code itself, never thrown", () => {
  assert.equal(countryFlag("philippines"), "PHILIPPINES");
  assert.equal(countryName("not-a-code"), "not-a-code");
});
