import assert from "node:assert/strict";
import { test } from "node:test";
import type { TopicStatus } from "@ken-os/domain";
import type { RoadmapChapter } from "./roadmap-store";
import { canAddRoadmap, orderRoadmaps, progressOnRoadmaps, ROADMAP_LIMIT, toCheck } from "./roadmaps";

// Several roadmaps at once (docs/architecture/engineering-roadmaps.md).

const at = (iso: string) => new Date(iso);

test("roadmaps open most recently opened first, and a never-opened one by when it was made", () => {
  const rows = [
    { id: "old", createdAt: at("2026-10-01T00:00:00Z"), lastOpenedAt: at("2026-10-02T00:00:00Z") },
    { id: "fresh", createdAt: at("2026-10-10T00:00:00Z"), lastOpenedAt: null },
    { id: "opened", createdAt: at("2026-09-01T00:00:00Z"), lastOpenedAt: at("2026-10-12T00:00:00Z") },
  ];
  assert.deepEqual(
    orderRoadmaps(rows).map((row) => row.id),
    ["opened", "fresh", "old"],
  );
  assert.deepEqual(
    rows.map((row) => row.id),
    ["old", "fresh", "opened"],
    "the input isn't reordered",
  );
});

test("up to 3 roadmaps can be active", () => {
  assert.equal(ROADMAP_LIMIT, 3);
  assert.equal(canAddRoadmap(0), true);
  assert.equal(canAddRoadmap(2), true);
  assert.equal(canAddRoadmap(3), false);
});

const topic = (id: string, status: TopicStatus) => ({
  id,
  title: id.toUpperCase(),
  custom: false,
  status,
  changedAt: null,
  learnedAt: null,
});
const chapter = (id: string, topics: ReturnType<typeof topic>[]): RoadmapChapter => ({
  id,
  title: `Chapter ${id}`,
  area: "Area",
  topics,
});

test("a topic on two roadmaps reports Next topic and chapter done for each", () => {
  const views = [
    {
      id: "ai",
      goal: { id: null, title: "AI engineering" },
      chapters: [chapter("a", [topic("shared", "learned"), topic("a2", "not_started")])],
    },
    {
      id: "sys",
      goal: { id: null, title: "System design" },
      chapters: [chapter("s", [topic("shared", "learned")]), chapter("t", [topic("t1", "not_started")])],
    },
    { id: "other", goal: { id: null, title: "Other" }, chapters: [chapter("o", [topic("o1", "not_started")])] },
  ];
  assert.deepEqual(progressOnRoadmaps(views, "shared"), [
    { roadmapId: "ai", goal: "AI engineering", next: { id: "a2", title: "A2" }, chapterDone: null },
    { roadmapId: "sys", goal: "System design", next: { id: "t1", title: "T1" }, chapterDone: "Chapter s" },
  ]);
  assert.deepEqual(progressOnRoadmaps(views, "nowhere"), []);
});

test("topics Ready to check are listed for the fresh check, the longest waiting first", () => {
  const topic = (id: string, status: TopicStatus, changedAt: string | null = null) => ({
    id,
    title: id,
    custom: false,
    status,
    changedAt,
    learnedAt: null,
  });
  const chapters: RoadmapChapter[] = [
    {
      id: "react",
      title: "React",
      area: "Frontend",
      topics: [
        topic("react.state", "ready_to_check", "2026-10-12T00:00:00Z"),
        topic("react.effects", "in_progress", "2026-10-13T00:00:00Z"),
      ],
    },
    {
      id: "js",
      title: "JavaScript",
      area: "Frontend",
      topics: [topic("js.closures", "ready_to_check", "2026-10-10T00:00:00Z")],
    },
  ];
  assert.deepEqual(
    toCheck({ chapters }).map((item) => item.id),
    ["js.closures", "react.state"],
  );
});
