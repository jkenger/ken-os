import assert from "node:assert/strict";
import { test } from "node:test";
import { areaRows, chapterDepth, evidenceLevel, nextMilestone, overallLevel, parseCareers, pathChapters, requirementsUpTo, slotsFor } from "@ken-os/domain";
import { careers, topicMap } from "./curriculum";

// Profile rules (docs/architecture/engineering-rebuild.md, section 5). Levels come only from Proven topics.

const ladder = (area: string) => careers.areas.find((item) => item.id === area)!;
const role = (id: string) => careers.roles.find((item) => item.id === id)!;
const chapterTopics = (chapter: string, depth?: "working" | "deep") => topicMap.topics.filter((topic) => topic.chapter === chapter && (!depth || topic.depth === depth)).map((topic) => topic.id);
/** Every topic a level needs in an area, proven. */
function provenFor(area: string, level: "junior" | "mid" | "senior") {
  return requirementsUpTo(ladder(area), level).flatMap((requirement) => {
    const slots = slotsFor(topicMap, requirement);
    return slots.topicIds.slice(0, requirement.depth === "aware" ? 1 : slots.topicIds.length);
  });
}

test("the roles file has the 4 roles and maps onto the 13 chapters", () => {
  assert.deepEqual(careers.roles.map((item) => item.id).sort(), ["ai-product-engineer", "frontend-developer", "fullstack-applied-ai", "fullstack-engineer"]);
  assert.ok(careers.status !== "approved" || careers.approvedOn, "an approved file carries its approval date");
  const chapters = new Set(topicMap.chapters.map((chapter) => chapter.id));
  for (const area of careers.areas) for (const level of Object.values(area.levels)) for (const requirement of level) assert.ok(chapters.has(requirement.chapter), requirement.chapter);
  const wrongArea = { ...careers, areas: careers.areas.map((area) => area.id === "frontend" ? { ...area, levels: { ...area.levels, junior: [{ chapter: "js-runtime", depth: "aware" }] } } : area) };
  assert.throws(() => parseCareers(wrongArea, topicMap), /belongs to foundations/);
});

test("with nothing proven every area is Developing with no made-up levels", () => {
  const rows = areaRows(topicMap, careers, role("fullstack-applied-ai"), new Set());
  assert.equal(rows.length, 5);
  assert.ok(rows.every((row) => row.level === null && row.coverage.proven === 0));
  assert.ok(rows.every((row) => row.coverage.required > 0), "the role needs every area");
  assert.equal(overallLevel(rows), null);
});

test("chapter depth: aware takes one proven topic, build the working ones, run all of them", () => {
  const working = chapterTopics("reliability", "working");
  assert.ok(working.length >= 2);
  assert.equal(chapterDepth(topicMap, "reliability", new Set()), "none");
  assert.equal(chapterDepth(topicMap, "reliability", new Set(working.slice(0, 1))), "aware");
  assert.equal(chapterDepth(topicMap, "reliability", new Set(working)), "build");
  assert.equal(chapterDepth(topicMap, "reliability", new Set(chapterTopics("reliability"))), "run");
});

test("an area reaches a level only when every topic that level needs is proven", () => {
  const junior = provenFor("foundations", "junior");
  assert.equal(evidenceLevel(topicMap, ladder("foundations"), new Set(junior)), "junior");
  assert.equal(evidenceLevel(topicMap, ladder("foundations"), new Set(junior.slice(1))), null);
  assert.equal(evidenceLevel(topicMap, ladder("foundations"), new Set(provenFor("foundations", "senior"))), "senior");
});

test("proof coverage is proven required topics over required topics for the target", () => {
  const target = role("fullstack-applied-ai");
  const proven = new Set(provenFor("foundations", "junior"));
  const foundations = areaRows(topicMap, careers, target, proven).find((row) => row.area === "foundations")!;
  assert.equal(foundations.target, "mid");
  assert.equal(foundations.coverage.proven, proven.size);
  assert.ok(foundations.coverage.required > proven.size);
  assert.equal(foundations.remaining.length, foundations.coverage.required - foundations.coverage.proven);
  const frontendOnly = areaRows(topicMap, careers, role("frontend-developer"), new Set()).find((row) => row.area === "ai")!;
  assert.equal(frontendOnly.target, null);
  assert.deepEqual(frontendOnly.coverage, { proven: 0, required: 0 });
});

test("the overall level is capped by the weakest required area", () => {
  const target = role("frontend-developer");
  const proven = new Set([...provenFor("foundations", "junior"), ...provenFor("frontend", "senior"), ...provenFor("backend", "senior")]);
  const rows = areaRows(topicMap, careers, target, proven);
  assert.equal(rows.find((row) => row.area === "foundations")!.level, "junior");
  assert.equal(overallLevel(rows), "junior");
  assert.equal(overallLevel(areaRows(topicMap, careers, target, new Set([...provenFor("frontend", "senior"), ...provenFor("backend", "senior")]))), null, "one Developing area caps it at Developing");
});

test("the next milestone is the next level closest to done, with the next missing topic", () => {
  const target = role("fullstack-applied-ai");
  const mid = provenFor("production", "mid");
  const almost = mid.slice(0, -1);
  const milestone = nextMilestone(topicMap, careers, target, new Set(almost))!;
  assert.equal(milestone.area, "production");
  assert.equal(milestone.level, "mid");
  assert.equal(milestone.topicId, mid[mid.length - 1], "the one topic still missing");
  assert.deepEqual(milestone.coverage, { proven: mid.length - 1, required: mid.length });
  assert.equal(nextMilestone(topicMap, careers, role("frontend-developer"), new Set(topicMap.topics.map((topic) => topic.id))), null);
});

test("My path keeps only the role's chapters, weakest area first, then course order", () => {
  const target = role("frontend-developer");
  const path = pathChapters(topicMap, careers, target, { frontend: 0, foundations: 2, backend: 1 });
  assert.ok(!path.some((id) => topicMap.chapters.find((chapter) => chapter.id === id)!.area === "ai"), "the role doesn't need Applied AI");
  assert.equal(path[0], "react");
  assert.deepEqual(path.slice(1, 3), ["api-boundaries", "databases"]);
  const unscored = pathChapters(topicMap, careers, target, {});
  assert.equal(unscored[0], "js-runtime", "without scores, course order");
});
