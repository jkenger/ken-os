import assert from "node:assert/strict";
import { test } from "node:test";
import { formatBoardName } from "./job-boards";

test("a known board slug formats to its proper name", () => {
  assert.equal(formatBoardName("greenhouse"), "Greenhouse");
  assert.equal(formatBoardName("workday"), "Workday");
  assert.equal(formatBoardName("successfactors"), "SuccessFactors");
  assert.equal(formatBoardName("smartrecruiters"), "SmartRecruiters");
  assert.equal(formatBoardName("mycareersfuture"), "MyCareersFuture");
  assert.equal(formatBoardName("eures"), "EURES");
});

test("matching is case and whitespace insensitive", () => {
  assert.equal(formatBoardName("GreenHouse"), "Greenhouse");
  assert.equal(formatBoardName(" workday "), "Workday");
});

test("a regional variant (board-XX) keeps the base board's name and shows the country code", () => {
  assert.equal(formatBoardName("whatjobs-uk"), "WhatJobs (UK)");
  assert.equal(formatBoardName("whatjobs-fi"), "WhatJobs (FI)");
});

test("an unknown slug falls back to title case, hyphens to spaces", () => {
  assert.equal(formatBoardName("some-new-board"), "Some New Board");
  assert.equal(formatBoardName("jobvite"), "Jobvite");
});
