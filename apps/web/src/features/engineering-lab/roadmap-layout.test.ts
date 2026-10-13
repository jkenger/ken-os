import assert from "node:assert/strict";
import { test } from "node:test";
import { chapterRadius, layoutRoadmap, type LayoutInput } from "./roadmap-layout";

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
const distance = (node: { x: number; y: number }) => Math.hypot(node.x, node.y);

test("collapsed chapters are one node with a count, and only expanded chapters show topics", () => {
  const { nodes, edges } = layoutRoadmap(input, new Set(["react"]));
  assert.equal(nodes.filter((node) => node.type === "goal").length, 1);
  assert.equal(nodes.filter((node) => node.type === "chapter").length, 3);
  assert.deepEqual(
    nodes.filter((node) => node.type === "topic").map((node) => node.id),
    ["topic:react.a", "topic:react.b", "topic:react.c"],
  );
  const js = nodes.find((node) => node.id === "chapter:js")!;
  assert.ok(js.type === "chapter" && js.data.learned === 1 && js.data.total === 2 && !js.data.expanded);
  assert.equal(edges.length, 3 + 3, "goal to each chapter, chapter to each shown topic");
});

test("the goal is in the middle, chapters on a ring in order from the top, topics beyond them", () => {
  const { nodes } = layoutRoadmap(input, new Set(["js", "react", "api"]));
  const goal = nodes[0];
  assert.deepEqual([goal.x, goal.y], [0, 0]);
  const chapters = nodes.filter((node) => node.type === "chapter");
  for (const chapter of chapters) assert.ok(Math.abs(distance(chapter) - chapterRadius(3)) <= 1);
  assert.ok(chapters[0].y < 0 && Math.abs(chapters[0].x) <= 1, "the first chapter sits at the top");
  for (const topic of nodes.filter((node) => node.type === "topic"))
    assert.ok(distance(topic) > chapterRadius(3) + 100);
  const positions = nodes.map((node) => `${node.x},${node.y}`);
  assert.equal(new Set(positions).size, positions.length, "no two nodes share a spot");
});

test("the ring grows with more chapters", () => {
  assert.equal(chapterRadius(3), 220);
  assert.ok(chapterRadius(13) > chapterRadius(3));
});
