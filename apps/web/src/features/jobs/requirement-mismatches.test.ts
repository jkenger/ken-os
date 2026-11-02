import assert from "node:assert/strict";
import { test } from "node:test";
import { requirementMismatches } from "./requirement-mismatches";

test("fewer years of experience than the posting requires is a mismatch, naming both numbers", () => {
  const result = requirementMismatches(
    { yearsRequired: 18, workSetup: null },
    { yearsExperience: 3, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, ["Requires 18+ years; your CV shows 3"]);
});

test("meeting or exceeding the required years is not a mismatch", () => {
  const result = requirementMismatches(
    { yearsRequired: 3, workSetup: null },
    { yearsExperience: 3, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, []);
});

test("no years requirement stated is never a mismatch", () => {
  const result = requirementMismatches(
    { yearsRequired: null, workSetup: null },
    { yearsExperience: 0, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, []);
});

test("a Profile with no Experience section at all never raises a years mismatch -- there's nothing to compare, not a verified zero", () => {
  const result = requirementMismatches(
    { yearsRequired: 18, workSetup: null },
    { yearsExperience: null, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, []);
});

test("a genuinely verified zero years of experience still raises the mismatch, same as any other shortfall", () => {
  const result = requirementMismatches(
    { yearsRequired: 2, workSetup: null },
    { yearsExperience: 0, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, ["Requires 2+ years; your CV shows 0"]);
});

test("a hybrid posting when the owner has narrowed to remote only is a mismatch", () => {
  const result = requirementMismatches(
    { yearsRequired: null, workSetup: "hybrid" },
    { yearsExperience: 0, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, ["Hybrid role, but you prefer remote work"]);
});

test("an on-site posting when remote-only is preferred is a mismatch, naming the posting's own setup", () => {
  const result = requirementMismatches(
    { yearsRequired: null, workSetup: "on_site" },
    { yearsExperience: 0, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, ["On-site role, but you prefer remote work"]);
});

test("remote also being open to hybrid or on-site is not a narrow preference, so no mismatch is raised -- accepting a setup isn't the same as preferring it", () => {
  assert.deepEqual(
    requirementMismatches(
      { yearsRequired: null, workSetup: "hybrid" },
      { yearsExperience: 0, preferredWorkSetups: ["remote", "hybrid"] },
    ),
    [],
  );
  assert.deepEqual(
    requirementMismatches(
      { yearsRequired: null, workSetup: "on_site" },
      { yearsExperience: 0, preferredWorkSetups: ["remote", "hybrid", "on_site"] },
    ),
    [],
  );
});

test("a remote posting is never a work-setup mismatch", () => {
  const result = requirementMismatches(
    { yearsRequired: null, workSetup: "remote" },
    { yearsExperience: 0, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, []);
});

test("remote not being in the preferred set at all means no work-setup mismatch is raised", () => {
  const result = requirementMismatches(
    { yearsRequired: null, workSetup: "hybrid" },
    { yearsExperience: 0, preferredWorkSetups: ["hybrid", "on_site"] },
  );
  assert.deepEqual(result, []);
});

test("a posting with no stated work setup is never a mismatch", () => {
  const result = requirementMismatches(
    { yearsRequired: null, workSetup: null },
    { yearsExperience: 0, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, []);
});

test("both a years and a work-setup mismatch can appear together, years first", () => {
  const result = requirementMismatches(
    { yearsRequired: 10, workSetup: "on_site" },
    { yearsExperience: 2, preferredWorkSetups: ["remote"] },
  );
  assert.deepEqual(result, ["Requires 10+ years; your CV shows 2", "On-site role, but you prefer remote work"]);
});
