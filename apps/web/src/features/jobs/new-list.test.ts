import assert from "node:assert/strict";
import { test } from "node:test";
import { isNew, payRangeLabel, postingBadge } from "./new-list";

const DAY_MS = 24 * 60 * 60 * 1000;

const basePay = {
  payAmount: null,
  payCurrency: "USD",
  payPeriod: "month" as const,
  sourceSalaryMin: null,
  sourceSalaryMax: null,
};

test("a never-opened posting less than 3 days old is New", () => {
  assert.equal(isNew({ viewedAt: null, firstSeenAt: new Date(Date.now() - 2 * DAY_MS) }), true);
});

test("a never-opened posting older than 3 days stops being New", () => {
  assert.equal(isNew({ viewedAt: null, firstSeenAt: new Date(Date.now() - 4 * DAY_MS) }), false);
});

test("an opened posting is never New, no matter how recent", () => {
  assert.equal(isNew({ viewedAt: new Date(), firstSeenAt: new Date() }), false);
});

test("a real min/max range shows as a range, not the averaged midpoint", () => {
  assert.equal(
    payRangeLabel({ ...basePay, payAmount: 2500, sourceSalaryMin: 2000, sourceSalaryMax: 3000 }),
    "USD 2,000–3,000 a month",
  );
});

test("an equal min and max shows as a single amount, not a zero-width range", () => {
  assert.equal(
    payRangeLabel({ ...basePay, payAmount: 2500, sourceSalaryMin: 2500, sourceSalaryMax: 2500 }),
    "USD 2,500 a month",
  );
});

test("no source range falls back to the single payAmount", () => {
  assert.equal(payRangeLabel({ ...basePay, payAmount: 2500 }), "USD 2,500 a month");
});

test("no pay information at all has nothing to show", () => {
  assert.equal(payRangeLabel(basePay), null);
  assert.equal(payRangeLabel({ ...basePay, payCurrency: null }), null);
});

test("a saved posting shows Saved, overriding New", () => {
  assert.equal(postingBadge({ savedAt: new Date(), viewedAt: null, firstSeenAt: new Date() }), "Saved");
});

test("a saved posting shows Saved even once it's no longer New", () => {
  assert.equal(
    postingBadge({ savedAt: new Date(), viewedAt: new Date(), firstSeenAt: new Date(Date.now() - 4 * DAY_MS) }),
    "Saved",
  );
});

test("an unsaved, new posting falls back to New", () => {
  assert.equal(postingBadge({ savedAt: null, viewedAt: null, firstSeenAt: new Date() }), "New");
});

test("an unsaved posting that's neither Saved nor New shows no badge", () => {
  assert.equal(postingBadge({ savedAt: null, viewedAt: new Date(), firstSeenAt: new Date() }), null);
});
