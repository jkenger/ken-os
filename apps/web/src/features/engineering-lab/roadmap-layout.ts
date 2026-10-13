import type { TopicStatus } from "@ken-os/domain";

// Where each node of the roadmap graph sits (docs/architecture/engineering-claude-first.md, section 1). The goal is in
// the middle, chapters sit on a ring around it in roadmap order, and an expanded chapter fans its topics outward.
// Collapsed chapters show one node with a count. Positions are node centres; the graph draws with nodeOrigin [0.5, 0.5].

export interface LayoutInput {
  goal: string;
  chapters: { id: string; title: string; topics: { id: string; title: string; status: TopicStatus }[] }[];
}

export type LayoutNode =
  | { id: string; type: "goal"; x: number; y: number; data: { title: string } }
  | {
      id: string;
      type: "chapter";
      x: number;
      y: number;
      data: {
        chapterId: string;
        title: string;
        order: number;
        learned: number;
        total: number;
        /** Every topic Learned or Skipped (engineering-progressive-flow.md, section 3). */
        done: boolean;
        expanded: boolean;
      };
    }
  | { id: string; type: "topic"; x: number; y: number; data: { topicId: string; title: string; status: TopicStatus } };

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

/** The chapter ring grows with the number of chapters so their labels don't touch. */
export function chapterRadius(chapters: number) {
  return Math.max(220, chapters * 36);
}

/** Topics fan out this far beyond the chapter ring, this many radians apart. */
export const TOPIC_DISTANCE = 180;
export const TOPIC_SPREAD = 0.3;

export const goalNodeId = "goal";
export const chapterNodeId = (chapterId: string) => `chapter:${chapterId}`;
export const topicNodeId = (topicId: string) => `topic:${topicId}`;

export function layoutRoadmap(input: LayoutInput, expanded: ReadonlySet<string>) {
  const nodes: LayoutNode[] = [{ id: goalNodeId, type: "goal", x: 0, y: 0, data: { title: input.goal } }];
  const edges: LayoutEdge[] = [];
  const ring = chapterRadius(input.chapters.length);
  const step = (2 * Math.PI) / Math.max(input.chapters.length, 1);
  input.chapters.forEach((chapter, index) => {
    // The first chapter sits at the top; the rest follow clockwise, in roadmap order.
    const angle = -Math.PI / 2 + index * step;
    const id = chapterNodeId(chapter.id);
    const open = expanded.has(chapter.id);
    nodes.push({
      id,
      type: "chapter",
      x: Math.round(Math.cos(angle) * ring),
      y: Math.round(Math.sin(angle) * ring),
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
    edges.push({ id: `${goalNodeId}->${id}`, source: goalNodeId, target: id });
    if (!open) return;
    const reach = ring + TOPIC_DISTANCE;
    chapter.topics.forEach((topic, position) => {
      const offset = (position - (chapter.topics.length - 1) / 2) * TOPIC_SPREAD;
      const topicId = topicNodeId(topic.id);
      nodes.push({
        id: topicId,
        type: "topic",
        x: Math.round(Math.cos(angle + offset) * reach),
        y: Math.round(Math.sin(angle + offset) * reach),
        data: { topicId: topic.id, title: topic.title, status: topic.status },
      });
      edges.push({ id: `${id}->${topicId}`, source: id, target: topicId });
    });
  });
  return { nodes, edges };
}
