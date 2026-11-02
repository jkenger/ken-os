import assert from "node:assert/strict";
import { test } from "node:test";
import { COUNTRY_CODES, countryOptions } from "./country-codes";

test("every country code is two uppercase letters, with no duplicates", () => {
  assert.ok(COUNTRY_CODES.length > 200, "the full ISO 3166-1 alpha-2 list, not a small sample");
  for (const code of COUNTRY_CODES) assert.match(code, /^[A-Z]{2}$/, code);
  assert.equal(new Set(COUNTRY_CODES).size, COUNTRY_CODES.length, "no duplicate codes");
});

test("countryOptions pairs every code with its display name, sorted by name", () => {
  const options = countryOptions();
  assert.equal(options.length, COUNTRY_CODES.length);
  assert.ok(options.some((option) => option.value === "PH" && option.label === "Philippines"));
  assert.ok(options.some((option) => option.value === "US" && option.label === "United States"));

  const labels = options.map((option) => option.label);
  const sorted = [...labels].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(labels, sorted);
});
