import assert from "node:assert/strict";
import { test } from "node:test";
import { guessCompanyDomain } from "./company-avatar";

test("a plain company name becomes a lowercase .com guess", () => {
  assert.equal(guessCompanyDomain("Stripe"), "stripe.com");
});

test("a common legal suffix is stripped before guessing", () => {
  assert.equal(guessCompanyDomain("Acme Inc"), "acme.com");
  assert.equal(guessCompanyDomain("Acme, LLC."), "acme.com");
  assert.equal(guessCompanyDomain("Acme Corporation"), "acme.com");
});

test("spaces and punctuation in the remaining name are dropped, not hyphenated", () => {
  assert.equal(guessCompanyDomain("J.P. Morgan & Co."), "jpmorgan.com");
});

test("a blank company name has nothing to guess from", () => {
  assert.equal(guessCompanyDomain(""), null);
  assert.equal(guessCompanyDomain("   "), null);
});
