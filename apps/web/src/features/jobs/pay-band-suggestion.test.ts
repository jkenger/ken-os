import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestPayBand } from "./pay-band-suggestion";

test("a PH target country with no saved preferences gets the suggested band", () => {
  assert.deepEqual(suggestPayBand("PH", false), {
    minimumPay: 15000,
    maximumPay: 200000,
    payCurrency: "PHP",
    payPeriod: "month",
  });
});

test("matching the target country is case-insensitive", () => {
  assert.deepEqual(suggestPayBand("ph", false), {
    minimumPay: 15000,
    maximumPay: 200000,
    payCurrency: "PHP",
    payPeriod: "month",
  });
});

test("a non-PH target country gets no suggestion", () => {
  assert.equal(suggestPayBand("US", false), null);
});

test("once preferences have ever been saved, there is no suggestion, even for PH", () => {
  assert.equal(suggestPayBand("PH", true), null);
});
