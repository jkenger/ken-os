import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCareers, pathChapters } from "@ken-os/domain";
import { careers, topicMap } from "./curriculum";

// Roles and the chapters a role needs, which the default roadmap is built from.

const role = (id: string) => careers.roles.find((item) => item.id === id)!;

test("the roles file has the 4 roles and maps onto the 13 chapters", () => {
  assert.deepEqual(careers.roles.map((item) => item.id).sort(), [
    "ai-product-engineer",
    "frontend-developer",
    "fullstack-applied-ai",
    "fullstack-engineer",
  ]);
  assert.ok(careers.status !== "approved" || careers.approvedOn, "an approved file carries its approval date");
  const chapters = new Set(topicMap.chapters.map((chapter) => chapter.id));
  for (const area of careers.areas)
    for (const level of Object.values(area.levels))
      for (const requirement of level) assert.ok(chapters.has(requirement.chapter), requirement.chapter);
  const wrongArea = {
    ...careers,
    areas: careers.areas.map((area) =>
      area.id === "frontend"
        ? { ...area, levels: { ...area.levels, junior: [{ chapter: "js-runtime", depth: "aware" }] } }
        : area,
    ),
  };
  assert.throws(() => parseCareers(wrongArea, topicMap), /belongs to foundations/);
});

test("My path keeps only the role's chapters, weakest area first, then course order", () => {
  const target = role("frontend-developer");
  const path = pathChapters(topicMap, careers, target, { frontend: 0, foundations: 2, backend: 1 });
  assert.ok(
    !path.some((id) => topicMap.chapters.find((chapter) => chapter.id === id)!.area === "ai"),
    "the role doesn't need Applied AI",
  );
  assert.equal(path[0], "react");
  assert.deepEqual(path.slice(1, 3), ["api-boundaries", "databases"]);
  const unscored = pathChapters(topicMap, careers, target, {});
  assert.equal(unscored[0], "js-runtime", "without scores, course order");
});
