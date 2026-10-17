import type { TopicStatus } from "@ken-os/domain";

// Where each node of the roadmap graph sits (docs/architecture/engineering-claude-first.md, section 1). The goal heads a
// column of chapters in roadmap order; an expanded chapter shows its topics in a group to its right, two to a row.
// Collapsed chapters show one node with a count. Edges are only what the roadmap knows: its order, which chapter a
// topic belongs to, and the prerequisites Claude saved, drawn between topics that are shown.
// Positions are top-left corners; every node carries its own size, so the graph draws with nodeOrigin [0, 0].

export interface LayoutInput {
  goal: string;
  chapters: { id: string; title: string; topics: { id: string; title: string; status: TopicStatus }[] }[];
}

interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ChapterData = {
  chapterId: string;
  title: string;
  order: number;
  learned: number;
  total: number;
  /** Every topic Learned or Skipped (engineering-progressive-flow.md, section 3). */
  done: boolean;
  expanded: boolean;
};

export type LayoutNode =
  | (Box & { type: "goal"; data: { title: string } })
  | (Box & { type: "chapter"; data: ChapterData })
  | (Box & { type: "group"; data: { chapterId: string; title: string; order: number } })
  | (Box & { type: "topic"; data: { topicId: string; chapterId: string; title: string; status: TopicStatus } });

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  /** Roadmap order between chapters, a chapter to its topics, or a prerequisite Claude saved (learn source first). */
  kind: "order" | "member" | "prerequisite";
}

/** Node sizes in graph pixels; the node components fill them. */
export const GRAPH = {
  goal: { width: 232, height: 64 },
  chapter: { width: 232, height: 60 },
  topic: { width: 212, height: 40 },
  /** Space between one chapter row and the next. */
  rowGap: 28,
  /** Space between a chapter and its group. */
  groupGap: 56,
  groupPadding: 12,
  groupHeading: 30,
  topicGap: 8,
  columns: 2,
} as const;

export const goalNodeId = "goal";
export const chapterNodeId = (chapterId: string) => `chapter:${chapterId}`;
export const groupNodeId = (chapterId: string) => `group:${chapterId}`;
export const topicNodeId = (topicId: string) => `topic:${topicId}`;

/** One of six chapter accents, in roadmap order (0-based index in, 1 to 6 out). */
export function chapterTone(index: number) {
  return ((index % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

const groupWidth = GRAPH.groupPadding * 2 + GRAPH.columns * GRAPH.topic.width + (GRAPH.columns - 1) * GRAPH.topicGap;

function groupHeight(topics: number) {
  const rows = Math.max(1, Math.ceil(topics / GRAPH.columns));
  return GRAPH.groupPadding * 2 + GRAPH.groupHeading + rows * GRAPH.topic.height + (rows - 1) * GRAPH.topicGap;
}

export function layoutRoadmap(
  input: LayoutInput,
  expanded: ReadonlySet<string>,
  prerequisites: Readonly<Record<string, readonly string[]>> = {},
) {
  const nodes: LayoutNode[] = [
    { id: goalNodeId, type: "goal", x: 0, y: 0, ...GRAPH.goal, data: { title: input.goal } },
  ];
  const edges: LayoutEdge[] = [];
  const groupX = GRAPH.chapter.width + GRAPH.groupGap;
  let top = GRAPH.goal.height + GRAPH.rowGap;
  let previous = goalNodeId;

  input.chapters.forEach((chapter, index) => {
    const id = chapterNodeId(chapter.id);
    const open = expanded.has(chapter.id);
    nodes.push({
      id,
      type: "chapter",
      x: 0,
      y: top,
      ...GRAPH.chapter,
      data: {
        chapterId: chapter.id,
        title: chapter.title,
        order: index + 1,
        learned: chapter.topics.filter((topic) => topic.status === "learned").length,
        total: chapter.topics.length,
        done:
          chapter.topics.length > 0 &&
          chapter.topics.every((topic) => topic.status === "learned" || topic.status === "skipped"),
        expanded: open,
      },
    });
    edges.push({ id: `${previous}->${id}`, source: previous, target: id, kind: "order" });
    previous = id;

    let rowHeight: number = GRAPH.chapter.height;
    if (open) {
      const group = groupNodeId(chapter.id);
      const height = groupHeight(chapter.topics.length);
      nodes.push({
        id: group,
        type: "group",
        x: groupX,
        y: top,
        width: groupWidth,
        height,
        data: { chapterId: chapter.id, title: chapter.title, order: index + 1 },
      });
      edges.push({ id: `${id}->${group}`, source: id, target: group, kind: "member" });
      chapter.topics.forEach((topic, position) => {
        const column = position % GRAPH.columns;
        const row = Math.floor(position / GRAPH.columns);
        nodes.push({
          id: topicNodeId(topic.id),
          type: "topic",
          x: groupX + GRAPH.groupPadding + column * (GRAPH.topic.width + GRAPH.topicGap),
          y: top + GRAPH.groupPadding + GRAPH.groupHeading + row * (GRAPH.topic.height + GRAPH.topicGap),
          ...GRAPH.topic,
          data: { topicId: topic.id, chapterId: chapter.id, title: topic.title, status: topic.status },
        });
      });
      rowHeight = Math.max(rowHeight, height);
    }
    top += rowHeight + GRAPH.rowGap;
  });
  const shown = new Set(nodes.filter((node) => node.type === "topic").map((node) => node.id));
  for (const chapter of input.chapters)
    for (const topic of chapter.topics)
      for (const first of prerequisites[topic.id] ?? []) {
        const source = topicNodeId(first);
        const target = topicNodeId(topic.id);
        if (shown.has(source) && shown.has(target))
          edges.push({ id: `${source}->${target}`, source, target, kind: "prerequisite" });
      }
  return { nodes, edges };
}
