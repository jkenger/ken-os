"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { TopicStatus } from "@ken-os/domain";
import {
  chapterNodeId,
  goalNodeId,
  groupNodeId,
  layoutRoadmap,
  type ChapterData,
  type LayoutNode,
} from "@/features/engineering-lab/roadmap-layout";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChapterMark, chapterClasses } from "./chapter-mark";
import { StatusIcon, statusWords } from "./status";

// The roadmap as a graph (docs/architecture/engineering-claude-first.md, section 1, and docs/architecture/roadmap-ui.md):
// the goal heads a column of chapters in roadmap order, and an open chapter shows its topics in a group beside it. The
// lines are the roadmap's order and chapter membership, nothing more: the data has no topic-to-topic prerequisites.
// The chapter you're on, and the open topic's chapter, start open; clicking a chapter opens or closes it.

type Flags = { selected?: boolean; active?: boolean; onPick?: () => void };
type GraphNode = Node<LayoutNode["data"] & Flags>;

const hidden: CSSProperties = { opacity: 0, pointerEvents: "none" };

function GoalNode({ data }: NodeProps<GraphNode>) {
  const goal = data as { title: string };
  return (
    <div className="flex size-full flex-col justify-center rounded-xl bg-primary px-4 text-primary-foreground">
      <span className="text-xs font-semibold opacity-75">Goal</span>
      <span className="line-clamp-2 text-sm leading-snug font-semibold">{goal.title}</span>
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  );
}

function ChapterNode({ data }: NodeProps<GraphNode>) {
  const chapter = data as ChapterData & Flags;
  const Chevron = chapter.expanded ? IconChevronDown : IconChevronRight;
  return (
    <>
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <Button
        type="button"
        variant="outline"
        onClick={chapter.onPick}
        aria-expanded={chapter.expanded}
        aria-label={`Chapter ${chapter.order}, ${chapter.title}, ${chapter.done ? "done, " : ""}${chapter.learned} of ${chapter.total} learned`}
        className={cn(
          "nodrag size-full justify-start gap-2.5 rounded-xl bg-card px-2.5 text-left whitespace-normal",
          chapter.active && "border-foreground",
        )}
      >
        <ChapterMark index={chapter.order - 1} className="size-7" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{chapter.title}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {chapter.done ? "Done · " : ""}
            {chapter.learned} of {chapter.total} learned
          </span>
        </span>
        <Chevron aria-hidden="true" className="text-muted-foreground" />
      </Button>
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
      <Handle id="side" type="source" position={Position.Right} style={hidden} isConnectable={false} />
    </>
  );
}

function GroupNode({ data }: NodeProps<GraphNode>) {
  const group = data as { title: string; order: number } & Flags;
  return (
    <div
      className={cn(
        "size-full rounded-2xl border bg-card/70 px-3 pt-2.5",
        group.active ? "border-foreground" : "border-dashed",
      )}
    >
      <Handle type="target" position={Position.Left} style={hidden} isConnectable={false} />
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span aria-hidden="true" className={cn("size-2 rounded-full", chapterClasses(group.order - 1).fill)} />
        {group.title}
      </p>
    </div>
  );
}

function TopicNode({ data }: NodeProps<GraphNode>) {
  const topic = data as { title: string; status: TopicStatus } & Flags;
  return (
    <Button
      type="button"
      variant="outline"
      onClick={topic.onPick}
      aria-label={`${topic.title}, ${statusWords[topic.status]}`}
      aria-pressed={topic.selected}
      title={topic.title}
      className={cn(
        "nodrag size-full justify-start gap-2 rounded-lg bg-card px-2.5 text-left text-xs font-normal",
        topic.selected && "border-foreground font-semibold shadow-md ring-1 ring-foreground",
        topic.status === "in_progress" && "font-semibold",
        topic.status === "skipped" && "text-muted-foreground",
      )}
    >
      <StatusIcon status={topic.status} size={15} />
      <span className="truncate">{topic.title}</span>
    </Button>
  );
}

const nodeTypes: NodeTypes = { goal: GoalNode, chapter: ChapterNode, group: GroupNode, topic: TopicNode };

/** Theme the graph with Loots tokens, so it follows light and dark mode. */
const flowStyle = {
  "--xy-background-color": "transparent",
  "--xy-background-pattern-color": "var(--border)",
  "--xy-edge-stroke": "var(--ring)",
  "--xy-minimap-background-color": "var(--card)",
  "--xy-minimap-mask-background-color": "color-mix(in oklch, var(--muted) 70%, transparent)",
  "--xy-controls-button-background-color": "var(--card)",
  "--xy-controls-button-background-color-hover": "var(--muted)",
  "--xy-controls-button-color": "var(--foreground)",
  "--xy-controls-button-border-color": "var(--border)",
} as CSSProperties;

const legend: TopicStatus[] = ["learned", "in_progress", "not_started", "skipped"];

/** The chapter a topic sits in, or null. */
function chapterOf(view: RoadmapView, topicId: string | null) {
  if (!topicId) return null;
  return view.chapters.find((chapter) => chapter.topics.some((topic) => topic.id === topicId))?.id ?? null;
}

export function RoadmapGraph({
  view,
  selected,
  onSelect,
}: {
  view: RoadmapView;
  selected: string | null;
  onSelect: (topicId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const open = new Set<string>();
    const first = view.current?.chapterId ?? view.chapters[0]?.id;
    if (first) open.add(first);
    const picked = chapterOf(view, selected);
    if (picked) open.add(picked);
    return open;
  });
  const toggle = (chapterId: string) =>
    setExpanded((open) => {
      const next = new Set(open);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });

  // A topic opened from search or Next topic shows inside its chapter.
  const selectedChapter = chapterOf(view, selected);
  useEffect(() => {
    if (selectedChapter) setExpanded((open) => (open.has(selectedChapter) ? open : new Set(open).add(selectedChapter)));
  }, [selectedChapter]);

  const allOpen = view.chapters.every((chapter) => expanded.has(chapter.id));
  const activeChapter = selectedChapter ?? view.current?.chapterId ?? null;

  const { nodes, edges } = useMemo(() => {
    const layout = layoutRoadmap({ goal: view.goal?.title ?? "No goal", chapters: view.chapters }, expanded);
    return {
      nodes: layout.nodes.map((node): GraphNode => {
        const flags: Flags =
          node.type === "chapter"
            ? { active: node.data.chapterId === activeChapter, onPick: () => toggle(node.data.chapterId) }
            : node.type === "group"
              ? { active: node.data.chapterId === activeChapter }
              : node.type === "topic"
                ? { selected: node.data.topicId === selected, onPick: () => onSelect(node.data.topicId) }
                : {};
        return {
          id: node.id,
          type: node.type,
          position: { x: node.x, y: node.y },
          width: node.width,
          height: node.height,
          style: { width: node.width, height: node.height },
          zIndex: node.type === "group" ? -1 : 1,
          draggable: false,
          // Selectable keeps pointer events on, so clicks reach the buttons inside. Selection itself shows nothing.
          selectable: node.type === "chapter" || node.type === "topic",
          data: { ...node.data, ...flags },
        };
      }),
      edges: layout.edges.map((edge): Edge => {
        const toGroup = edge.target.startsWith("group:");
        const lit = toGroup && activeChapter !== null && edge.target === groupNodeId(activeChapter);
        return {
          ...edge,
          type: "smoothstep",
          sourceHandle: toGroup ? "side" : undefined,
          selectable: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: lit ? "var(--foreground)" : "var(--ring)",
          },
          style: lit ? { stroke: "var(--foreground)", strokeWidth: 1.5 } : undefined,
        };
      }),
    };
  }, [view, expanded, selected, onSelect, activeChapter]);

  // Open on the goal and the chapter you're on with its topics: readable, and the rest a scroll away.
  const [focus] = useState(() => {
    const ids = new Set([goalNodeId]);
    if (activeChapter) {
      ids.add(chapterNodeId(activeChapter));
      ids.add(groupNodeId(activeChapter));
    }
    return nodes.filter((node) => ids.has(node.id)).map((node) => ({ id: node.id }));
  });

  return (
    <div
      className="h-[calc(100svh-17rem)] min-h-[32rem] w-full overflow-hidden rounded-xl border bg-muted/40"
      style={flowStyle}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodeOrigin={[0, 0]}
        fitView
        fitViewOptions={{ nodes: focus, padding: 0.12, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.5}
        nodesConnectable={false}
        nodesFocusable={false}
        panOnScroll
        aria-label="Roadmap graph"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Panel
          position="top-left"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
        >
          {legend.map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <StatusIcon status={status} size={14} />
              {statusWords[status]}
            </span>
          ))}
        </Panel>
        <Panel position="top-right">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-card"
            onClick={() =>
              setExpanded(
                allOpen
                  ? new Set(activeChapter ? [activeChapter] : [])
                  : new Set(view.chapters.map((chapter) => chapter.id)),
              )
            }
          >
            {allOpen ? "Hide other topics" : "Show all topics"}
          </Button>
        </Panel>
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          ariaLabel="Roadmap overview"
          className="hidden! rounded-lg border md:block!"
          nodeColor={(node) =>
            node.type === "goal" ? "var(--primary)" : node.type === "group" ? "var(--muted)" : "var(--border)"
          }
          nodeBorderRadius={4}
        />
      </ReactFlow>
    </div>
  );
}
