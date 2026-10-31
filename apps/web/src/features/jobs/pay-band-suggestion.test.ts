import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestPayBand } from "./pay-band-suggestion";

test("a PH target country with no pay configured gets the suggested band", () => {
  assert.deepEqual(suggestPayBand("PH", { minimumPay: null, maximumPay: null }), {
    minimumPay: 15000,
    maximumPay: 200000,
    payCurrency: "PHP",
    payPeriod: "month",
  });
});

test("matching the target country is case-insensitive", () => {
  assert.deepEqual(suggestPayBand("ph", { minimumPay: null, maximumPay: null }), {
    minimumPay: 15000,
    maximumPay: 200000,
    payCurrency: "PHP",
    payPeriod: "month",
  });
});

test("a non-PH target country gets no suggestion", () => {
  assert.equal(suggestPayBand("US", { minimumPay: null, maximumPay: null }), null);
});

test("a Minimum pay already set means no suggestion, even for PH", () => {
  assert.equal(suggestPayBand("PH", { minimumPay: 80000, maximumPay: null }), null);
});

test("a Maximum pay already set means no suggestion, even for PH, even with no minimum", () => {
  assert.equal(suggestPayBand("PH", { minimumPay: null, maximumPay: 200000 }), null);
});

test("other preferences being saved (skip words, work setup) doesn't count -- only pay does", () => {
  assert.deepEqual(suggestPayBand("PH", { minimumPay: null, maximumPay: null }), {
    minimumPay: 15000,
    maximumPay: 200000,
    payCurrency: "PHP",
    payPeriod: "month",
  });
});
