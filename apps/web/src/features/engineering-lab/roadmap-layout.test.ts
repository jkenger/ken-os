import assert from "node:assert/strict";
import { test } from "node:test";
import { chapterTone, layoutRoadmap, type LayoutInput, type LayoutNode } from "./roadmap-layout";

// The roadmap graph's layout (docs/architecture/engineering-claude-first.md, section 1).

const input: LayoutInput = {
  goal: "Full-stack developer",
  chapters: [
    {
      id: "js",
      title: "JavaScript",
      topics: [
        { id: "js.a", title: "A", status: "learned" },
        { id: "js.b", title: "B", status: "not_started" },
      ],
    },
    {
      id: "react",
      title: "React",
      topics: [
        { id: "react.a", title: "A", status: "in_progress" },
        { id: "react.b", title: "B", status: "skipped" },
        { id: "react.c", title: "C", status: "learned" },
      ],
    },
    { id: "api", title: "APIs", topics: [{ id: "api.a", title: "A", status: "not_started" }] },
  ],
};

const overlaps = (a: LayoutNode, b: LayoutNode) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const inside = (inner: LayoutNode, outer: LayoutNode) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

test("collapsed chapters are one node with a count, and only expanded chapters show topics", () => {
  const { nodes } = layoutRoadmap(input, new Set(["react"]));
  assert.equal(nodes.filter((node) => node.type === "goal").length, 1);
  assert.equal(nodes.filter((node) => node.type === "chapter").length, 3);
  assert.deepEqual(
    nodes.filter((node) => node.type === "topic").map((node) => node.id),
    ["topic:react.a", "topic:react.b", "topic:react.c"],
  );
  const js = nodes.find((node) => node.id === "chapter:js")!;
  assert.ok(js.type === "chapter" && js.data.learned === 1 && js.data.total === 2 && !js.data.expanded);
});

test("edges follow roadmap order only: goal to the first chapter, each chapter to the next, a chapter to its topics", () => {
  const { edges } = layoutRoadmap(input, new Set(["react"]));
  assert.deepEqual(
    edges.map((edge) => `${edge.source}->${edge.target}`),
    ["goal->chapter:js", "chapter:js->chapter:react", "chapter:react->group:react", "chapter:react->chapter:api"],
  );
});

test("chapters run top to bottom in roadmap order, below the goal", () => {
  const { nodes } = layoutRoadmap(input, new Set(["js", "react", "api"]));
  const goal = nodes.find((node) => node.type === "goal")!;
  const chapters = nodes.filter((node) => node.type === "chapter");
  assert.deepEqual(
    chapters.map((node) => node.id),
    ["chapter:js", "chapter:react", "chapter:api"],
  );
  assert.ok(
    chapters.every((node) => node.x === goal.x),
    "the goal and chapters share one column",
  );
  const tops = [goal, ...chapters].map((node) => node.y);
  assert.deepEqual(
    tops,
    [...tops].sort((a, b) => a - b),
  );
});

test("an expanded chapter's topics sit inside its group, beside the chapter, in roadmap order", () => {
  const { nodes } = layoutRoadmap(input, new Set(["react"]));
  const chapter = nodes.find((node) => node.id === "chapter:react")!;
  const group = nodes.find((node) => node.id === "group:react")!;
  const topics = nodes.filter((node) => node.type === "topic");
  assert.equal(group.y, chapter.y, "the group starts level with its chapter");
  assert.ok(group.x >= chapter.x + chapter.width, "the group sits to the right of the chapter");
  for (const topic of topics) assert.ok(inside(topic, group), `${topic.id} sits inside its group`);
  const reading = [...topics].sort((a, b) => a.y - b.y || a.x - b.x).map((node) => node.id);
  assert.deepEqual(reading, ["topic:react.a", "topic:react.b", "topic:react.c"], "left to right, then down");
});

test("no two boxes overlap, apart from topics inside their own group", () => {
  const { nodes } = layoutRoadmap(input, new Set(["js", "react", "api"]));
  const found: string[] = [];
  for (const [index, a] of nodes.entries())
    for (const b of nodes.slice(index + 1)) {
      const family =
        (a.type === "group" && b.type === "topic" && inside(b, a)) ||
        (b.type === "group" && a.type === "topic" && inside(a, b));
      if (!family && overlaps(a, b)) found.push(`${a.id} / ${b.id}`);
    }
  assert.deepEqual(found, []);
});

test("a chapter is marked done when every topic is Learned or Skipped", () => {
  const finished = {
    ...input,
    chapters: [
      ...input.chapters,
      {
        id: "done",
        title: "Done",
        topics: [
          { id: "done.a", title: "A", status: "learned" as const },
          { id: "done.b", title: "B", status: "skipped" as const },
        ],
      },
    ],
  };
  const done = layoutRoadmap(finished, new Set()).nodes.flatMap((node) =>
    node.type === "chapter" ? [[node.data.chapterId, node.data.done]] : [],
  );
  assert.deepEqual(done, [
    ["js", false],
    ["react", false],
    ["api", false],
    ["done", true],
  ]);
});

test("chapter tones cycle through six accents in roadmap order", () => {
  assert.deepEqual([0, 1, 5, 6, 7].map(chapterTone), [1, 2, 6, 1, 2]);
});
