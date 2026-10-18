import assert from "node:assert/strict";
import { test } from "node:test";
import { chapterTone, GRAPH, layoutRoadmap, type LayoutInput, type LayoutNode } from "./roadmap-layout";

// The roadmap graph's layout (docs/architecture/engineering-claude-first.md, section 1).

const input: LayoutInput = {
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

test("every chapter is an area holding all its topics, in roadmap order", () => {
  const { nodes } = layoutRoadmap(input);
  assert.deepEqual(
    nodes.filter((node) => node.type === "area").map((node) => node.id),
    ["area:js", "area:react", "area:api"],
  );
  assert.equal(nodes.filter((node) => node.type === "topic").length, 6);
  const js = nodes.find((node) => node.id === "area:js")!;
  assert.ok(js.type === "area" && js.data.learned === 1 && js.data.total === 2 && js.data.order === 1);
  for (const topic of nodes)
    if (topic.type === "topic")
      assert.ok(
        inside(
          topic,
          nodes.find((node) => node.id === `area:${topic.data.chapterId}`)!,
        ),
        `${topic.id} sits in its area`,
      );
});

test("edges follow topic order inside a chapter and chapter order between areas side by side", () => {
  const { edges } = layoutRoadmap(input);
  assert.deepEqual(
    edges.map((edge) => `${edge.kind} ${edge.source}->${edge.target}`),
    [
      "next topic:js.a->topic:js.b",
      "next topic:react.a->topic:react.b",
      "next topic:react.b->topic:react.c",
      "chapter topic:js.b->topic:react.a",
      "chapter topic:react.c->topic:api.a",
    ],
  );
});

test("topics run left to right, four to a row, and a wrapped row gets no arrow back", () => {
  const long: LayoutInput = {
    chapters: [
      {
        id: "big",
        title: "Big",
        topics: ["a", "b", "c", "d", "e"].map((id) => ({ id, title: id, status: "not_started" as const })),
      },
    ],
  };
  const { nodes, edges } = layoutRoadmap(long);
  const topics = nodes.filter((node) => node.type === "topic");
  assert.deepEqual(
    topics.map((node) => node.y),
    [topics[0].y, topics[0].y, topics[0].y, topics[0].y, topics[0].y + GRAPH.topic.height + GRAPH.topicRowGap],
  );
  assert.ok(!edges.some((edge) => edge.source === "topic:d" && edge.target === "topic:e"));
});

test("areas wrap to a new row past the row width, with no chapter arrow across the wrap", () => {
  const wide: LayoutInput = {
    chapters: ["one", "two", "three", "four"].map((id) => ({
      id,
      title: id,
      topics: ["a", "b", "c", "d"].map((t) => ({ id: `${id}.${t}`, title: t, status: "not_started" as const })),
    })),
  };
  const { nodes, edges } = layoutRoadmap(wide);
  const areas = nodes.filter((node) => node.type === "area");
  assert.ok(areas.every((area) => area.x + area.width <= GRAPH.rowWidth));
  assert.equal(areas[0].y, areas[1].y, "the first two share a row");
  assert.ok(areas[2].y > areas[1].y && areas[2].x === 0, "the third starts a new row");
  assert.ok(!edges.some((edge) => edge.source === "topic:two.d" && edge.target === "topic:three.a"));
});

test("no two boxes overlap, apart from topics inside their own area", () => {
  const { nodes } = layoutRoadmap(input);
  const found: string[] = [];
  for (const [index, a] of nodes.entries())
    for (const b of nodes.slice(index + 1)) {
      const family =
        (a.type === "area" && b.type === "topic" && inside(b, a)) ||
        (b.type === "area" && a.type === "topic" && inside(a, b));
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
  const done = layoutRoadmap(finished).nodes.flatMap((node) =>
    node.type === "area" ? [[node.data.chapterId, node.data.done]] : [],
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

test("prerequisites are arrows from the topic to learn first, only between topics on the roadmap", () => {
  const prerequisites = { "react.a": ["js.a"], "react.b": ["react.a"], "api.a": ["elsewhere.x"] };
  const arrows = layoutRoadmap(input, prerequisites)
    .edges.filter((edge) => edge.kind === "prerequisite")
    .map((edge) => `${edge.source}->${edge.target}`);
  assert.deepEqual(arrows, ["topic:js.a->topic:react.a", "topic:react.a->topic:react.b"]);
});
