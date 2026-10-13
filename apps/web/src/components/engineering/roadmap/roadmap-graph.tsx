"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { layoutRoadmap, type LayoutNode } from "@/features/engineering-lab/roadmap-layout";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusIcon, statusWords } from "./status";

// The roadmap as a graph (docs/architecture/engineering-claude-first.md, section 1): the goal in the middle, chapters
// around it, and the expanded chapters' topics fanned outward. Only the current chapter starts expanded; clicking a
// chapter opens or closes it. Zoom and drag come from React Flow.

type Data = LayoutNode["data"] & { selected?: boolean; onPick?: () => void };

/** Edges meet in the middle of each node, so the handles sit there and stay invisible. */
const centre: CSSProperties = { left: "50%", top: "50%", opacity: 0, pointerEvents: "none" };
function Anchors() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={centre} isConnectable={false} />
      <Handle type="source" position={Position.Top} style={centre} isConnectable={false} />
    </>
  );
}

function GoalNode({ data }: NodeProps<Node<Data>>) {
  const goal = data as { title: string };
  return (
    <div className="max-w-48 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
      <Anchors />
      {goal.title}
    </div>
  );
}

function ChapterNode({ data }: NodeProps<Node<Data>>) {
  const chapter = data as Extract<LayoutNode, { type: "chapter" }>["data"] & Data;
  return (
    <Button
      type="button"
      variant="outline"
      onClick={chapter.onPick}
      aria-expanded={chapter.expanded}
      aria-label={`${chapter.title}, ${chapter.learned} of ${chapter.total} learned`}
      className={cn(
        "nodrag h-auto max-w-44 flex-col items-start gap-0 bg-card py-2 text-left text-xs whitespace-normal",
        chapter.expanded && "border-ring",
      )}
    >
      <Anchors />
      <span className="block font-semibold text-foreground">
        {chapter.order} · {chapter.title}
      </span>
      <span className="text-muted-foreground">
        {chapter.learned} of {chapter.total} learned
      </span>
    </Button>
  );
}

function TopicNode({ data }: NodeProps<Node<Data>>) {
  const topic = data as Extract<LayoutNode, { type: "topic" }>["data"] & Data;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={topic.onPick}
      aria-label={`${topic.title}, ${statusWords[topic.status]}`}
      aria-pressed={topic.selected}
      className={cn(
        "nodrag max-w-40 rounded-full text-xs",
        topic.selected && "border-ring ring-2 ring-ring/40",
        topic.status === "skipped" && "text-muted-foreground",
      )}
    >
      <Anchors />
      <StatusIcon status={topic.status} size={14} />
      <span className="truncate">{topic.title}</span>
    </Button>
  );
}

const nodeTypes: NodeTypes = { goal: GoalNode, chapter: ChapterNode, topic: TopicNode };

/** Theme the graph with Ken OS tokens, so it follows light and dark mode. */
const flowStyle = {
  "--xy-background-color": "transparent",
  "--xy-edge-stroke": "var(--border)",
  "--xy-controls-button-background-color": "var(--card)",
  "--xy-controls-button-background-color-hover": "var(--muted)",
  "--xy-controls-button-color": "var(--foreground)",
  "--xy-controls-button-border-color": "var(--border)",
} as CSSProperties;

export function RoadmapGraph({
  view,
  selected,
  onSelect,
}: {
  view: RoadmapView;
  selected: string | null;
  onSelect: (topicId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(view.current ? [view.current.chapterId] : view.chapters.slice(0, 1).map((chapter) => chapter.id)),
  );
  const toggle = (chapterId: string) =>
    setExpanded((open) => {
      const next = new Set(open);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });

  const { nodes, edges } = useMemo(() => {
    const layout = layoutRoadmap({ goal: view.goal?.title ?? "No goal", chapters: view.chapters }, expanded);
    return {
      nodes: layout.nodes.map((node): Node<Data> => ({
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        draggable: false,
        // Selectable keeps pointer events on, so clicks reach the buttons inside. Selection itself shows nothing.
        selectable: node.type !== "goal",
        data: {
          ...node.data,
          selected: node.type === "topic" && node.data.topicId === selected,
          onPick:
            node.type === "chapter"
              ? () => toggle(node.data.chapterId)
              : node.type === "topic"
                ? () => onSelect(node.data.topicId)
                : undefined,
        },
      })),
      edges: layout.edges.map((edge): Edge => ({ ...edge, type: "straight", selectable: false })),
    };
  }, [view, expanded, selected, onSelect]);

  // Open on the goal and the current chapter's topics, readable; the rest of the ring is a drag or a zoom away.
  const [focus] = useState(() =>
    nodes
      .filter(
        (node) =>
          node.type === "goal" ||
          node.type === "topic" ||
          (node.type === "chapter" && expanded.has((node.data as { chapterId: string }).chapterId)),
      )
      .map((node) => ({ id: node.id })),
  );

  return (
    <div className="h-[34rem] w-full rounded-xl border bg-muted/30 md:h-[40rem]" style={flowStyle}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ nodes: focus, padding: 0.2, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.6}
        nodesConnectable={false}
        nodesFocusable={false}
        aria-label="Roadmap graph"
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
