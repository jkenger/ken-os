import assert from "node:assert/strict";
import { test } from "node:test";
import { JobsInputError } from "./api";
import { parsePreferences } from "./preferences-store";

test("valid input parses to preferences", () => {
  assert.deepEqual(
    parsePreferences({ skipWords: ["Sales", "Marketing"], skipCompanies: ["Acme"], postedWithinDays: 7 }),
    {
      skipWords: ["Sales", "Marketing"],
      skipCompanies: ["Acme"],
      postedWithinDays: 7,
    },
  );
});

test("blank skip words and companies are dropped", () => {
  const result = parsePreferences({ skipWords: ["Sales", "  ", ""], skipCompanies: [], postedWithinDays: 14 });
  assert.deepEqual(result.skipWords, ["Sales"]);
});

test("a non-array skipWords is rejected", () => {
  assert.throws(
    () => parsePreferences({ skipWords: "Sales", skipCompanies: [], postedWithinDays: 14 }),
    JobsInputError,
  );
});

test("a negative postedWithinDays is rejected", () => {
  assert.throws(() => parsePreferences({ skipWords: [], skipCompanies: [], postedWithinDays: -1 }), JobsInputError);
});

test("a non-integer postedWithinDays is rejected", () => {
  assert.throws(() => parsePreferences({ skipWords: [], skipCompanies: [], postedWithinDays: 3.5 }), JobsInputError);
});
