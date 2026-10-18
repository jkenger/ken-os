import type { TopicStatus } from "@ken-os/domain";

// Where each node of the roadmap graph sits (docs/architecture/engineering-claude-first.md, section 1, and
// docs/architecture/roadmap-ui.md). Each chapter is an area holding its topics in one row (four to a row, then the next
// row). Areas run left to right in roadmap order and wrap to a new row when the next one would pass the row width.
// Edges are only what the roadmap knows: topic order inside a chapter, chapter order between areas side by side, and the
// prerequisites Claude saved.
// Positions are top-left corners; every node carries its own size, so the graph draws with nodeOrigin [0, 0].

export interface LayoutInput {
  chapters: { id: string; title: string; topics: { id: string; title: string; status: TopicStatus }[] }[];
}

interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AreaData = {
  chapterId: string;
  title: string;
  order: number;
  learned: number;
  total: number;
  /** Every topic Learned or Skipped (engineering-progressive-flow.md, section 3). */
  done: boolean;
};

export type LayoutNode =
  | (Box & { type: "area"; data: AreaData })
  | (Box & { type: "topic"; data: { topicId: string; chapterId: string; title: string; status: TopicStatus } });

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  /** The next topic in a chapter, the next chapter beside this one, or a prerequisite Claude saved (learn source first). */
  kind: "next" | "chapter" | "prerequisite";
}

/** Node sizes in graph pixels; the node components fill them. */
export const GRAPH = {
  topic: { width: 176, height: 52 },
  /** Topics in one row of an area. */
  columns: 4,
  /** Space between topics in a row (room for the arrow), and between rows. */
  topicGap: 36,
  topicRowGap: 14,
  areaPadding: 14,
  areaHeading: 34,
  /** Space between areas, across and down. */
  areaGap: 32,
  areaRowGap: 28,
  /** Areas wrap to a new row past this width. */
  rowWidth: 2100,
} as const;

export const areaNodeId = (chapterId: string) => `area:${chapterId}`;
export const topicNodeId = (topicId: string) => `topic:${topicId}`;

/** One of six chapter accents, in roadmap order (0-based index in, 1 to 6 out). */
export function chapterTone(index: number) {
  return ((index % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

function areaSize(topics: number) {
  const across = Math.max(1, Math.min(topics, GRAPH.columns));
  const rows = Math.max(1, Math.ceil(topics / GRAPH.columns));
  return {
    width: GRAPH.areaPadding * 2 + across * GRAPH.topic.width + (across - 1) * GRAPH.topicGap,
    height: GRAPH.areaPadding * 2 + GRAPH.areaHeading + rows * GRAPH.topic.height + (rows - 1) * GRAPH.topicRowGap,
  };
}

export function layoutRoadmap(input: LayoutInput, prerequisites: Readonly<Record<string, readonly string[]>> = {}) {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const edge = (source: string, target: string, kind: LayoutEdge["kind"]) =>
    edges.push({ id: `${source}->${target}`, source, target, kind });
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let previous: { chapterIndex: number; y: number; lastInRow: string } | null = null;

  input.chapters.forEach((chapter, index) => {
    const size = areaSize(chapter.topics.length);
    if (x > 0 && x + size.width > GRAPH.rowWidth) {
      x = 0;
      y += rowHeight + GRAPH.areaRowGap;
      rowHeight = 0;
    }
    nodes.push({
      id: areaNodeId(chapter.id),
      type: "area",
      x,
      y,
      ...size,
      data: {
        chapterId: chapter.id,
        title: chapter.title,
        order: index + 1,
        learned: chapter.topics.filter((topic) => topic.status === "learned").length,
        total: chapter.topics.length,
        done:
          chapter.topics.length > 0 &&
          chapter.topics.every((topic) => topic.status === "learned" || topic.status === "skipped"),
      },
    });
    chapter.topics.forEach((topic, position) => {
      const column = position % GRAPH.columns;
      const row = Math.floor(position / GRAPH.columns);
      nodes.push({
        id: topicNodeId(topic.id),
        type: "topic",
        x: x + GRAPH.areaPadding + column * (GRAPH.topic.width + GRAPH.topicGap),
        y: y + GRAPH.areaPadding + GRAPH.areaHeading + row * (GRAPH.topic.height + GRAPH.topicRowGap),
        ...GRAPH.topic,
        data: { topicId: topic.id, chapterId: chapter.id, title: topic.title, status: topic.status },
      });
      // An arrow to the next topic along the same row; a wrap to the next row reads on without one.
      if (column > 0) edge(topicNodeId(chapter.topics[position - 1].id), topicNodeId(topic.id), "next");
    });
    const first = chapter.topics[0];
    if (previous && first && previous.chapterIndex === index - 1 && previous.y === y)
      edge(previous.lastInRow, topicNodeId(first.id), "chapter");
    const lastInRow = chapter.topics[Math.min(chapter.topics.length, GRAPH.columns) - 1];
    previous = lastInRow ? { chapterIndex: index, y, lastInRow: topicNodeId(lastInRow.id) } : null;
    x += size.width + GRAPH.areaGap;
    rowHeight = Math.max(rowHeight, size.height);
  });
  const shown = new Set(nodes.filter((node) => node.type === "topic").map((node) => node.id));
  for (const chapter of input.chapters)
    for (const topic of chapter.topics)
      for (const first of prerequisites[topic.id] ?? []) {
        const source = topicNodeId(first);
        const target = topicNodeId(topic.id);
        if (shown.has(source) && shown.has(target)) edge(source, target, "prerequisite");
      }
  return { nodes, edges };
}
