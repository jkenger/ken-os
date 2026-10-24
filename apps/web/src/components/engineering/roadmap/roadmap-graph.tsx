"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type ReactFlowInstance,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TopicStatus } from "@ken-os/domain";
import {
  chapterTone,
  areaNodeId,
  layoutRoadmap,
  topicNodeId,
  type AreaData,
  type LayoutNode,
} from "@/features/engineering-lab/roadmap-layout";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { selectedSurface } from "../kit";
import { chapterClasses } from "./chapter-mark";
import { StatusIcon, statusWords } from "./status";

// The roadmap as a graph (docs/architecture/engineering-claude-first.md, section 1, and docs/architecture/roadmap-ui.md):
// every chapter is a tinted area holding its topics, in roadmap order. Arrows run from topic to topic inside a chapter
// and between chapters side by side; prerequisites Claude saved curve between topics. Lines touching the open topic
// are drawn in the selected colour.

type Flags = { selected?: boolean; now?: boolean; onPick?: () => void };
type GraphNode = Node<LayoutNode["data"] & Flags>;

/** The smallest zoom the graph opens at, where a topic's title is still readable. */
const READABLE_ZOOM = 0.75;

const hidden: CSSProperties = { opacity: 0, pointerEvents: "none" };

function AreaNode({ data }: NodeProps<GraphNode>) {
  const area = data as AreaData;
  const tone = chapterClasses(area.order - 1);
  return (
    <div className={cn("size-full rounded-2xl border px-3.5 pt-3", tone.area)}>
      <p className="flex items-center gap-2 text-[0.6875rem] font-semibold tracking-wider uppercase">
        <span className="font-mono opacity-80">{String(area.order).padStart(2, "0")}</span>
        <span className="truncate">{area.title}</span>
        <span className="ml-auto font-normal tracking-normal whitespace-nowrap text-muted-foreground normal-case">
          {area.done ? "Done · " : ""}
          {area.learned} of {area.total}
        </span>
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
      aria-label={`${topic.title}, ${statusWords[topic.status]}${topic.now ? ", now" : ""}`}
      aria-pressed={topic.selected}
      title={topic.title}
      className={cn(
        "nodrag size-full justify-start gap-2.5 rounded-xl bg-card px-3 text-left font-normal whitespace-normal shadow-xs",
        topic.selected && selectedSurface,
      )}
    >
      <Handle type="target" position={Position.Left} style={hidden} isConnectable={false} />
      <StatusIcon status={topic.status} size={17} />
      <span className="flex min-w-0 flex-col">
        {/* Two lines before it cuts, so most titles read in full at the card's width. */}
        <span
          className={cn(
            "line-clamp-2 text-[0.8125rem] leading-snug font-medium",
            topic.status === "skipped" && "text-muted-foreground",
          )}
        >
          {topic.title}
        </span>
        <span className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
          {statusWords[topic.status]}
          {topic.now && (
            <Badge
              variant="secondary"
              className="h-4 bg-topic-active-soft px-1.5 text-[0.6875rem] font-semibold text-topic-active"
            >
              Now
            </Badge>
          )}
        </span>
      </span>
      <Handle type="source" position={Position.Right} style={hidden} isConnectable={false} />
    </Button>
  );
}

const nodeTypes: NodeTypes = { area: AreaNode, topic: TopicNode };

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
  const activeChapter = chapterOf(view, selected) ?? view.current?.chapterId ?? null;
  const currentId = view.current?.id ?? null;

  const { nodes, edges } = useMemo(() => {
    const prerequisites = Object.fromEntries(
      Object.entries(view.plans).map(([topicId, plan]) => [topicId, plan.prerequisites]),
    );
    const layout = layoutRoadmap({ chapters: view.chapters }, prerequisites);
    const selectedNode = selected ? topicNodeId(selected) : null;
    return {
      nodes: layout.nodes.map((node): GraphNode => ({
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        width: node.width,
        height: node.height,
        style: { width: node.width, height: node.height },
        zIndex: node.type === "area" ? -1 : 1,
        draggable: false,
        // Selectable keeps pointer events on, so clicks reach the buttons inside. Selection itself shows nothing.
        selectable: node.type === "topic",
        data:
          node.type === "topic"
            ? {
                ...node.data,
                selected: node.data.topicId === selected,
                now: node.data.topicId === currentId,
                onPick: () => onSelect(node.data.topicId),
              }
            : node.data,
      })),
      edges: layout.edges.map((edge): Edge => {
        const lit = edge.source === selectedNode || edge.target === selectedNode;
        const stroke = lit ? "var(--selected)" : "var(--ring)";
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          // Under the topic cards, so a prerequisite curve never crosses a title.
          zIndex: 0,
          selectable: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: stroke },
          style: {
            stroke,
            strokeWidth: lit ? 1.5 : 1.2,
            // Chapter order is dashed, so it reads apart from topic order and prerequisites.
            strokeDasharray: edge.kind === "chapter" ? "3 4" : undefined,
          },
        };
      }),
    };
  }, [view, selected, currentId, onSelect]);

  // Open on the row of chapters holding the one you're on (else the first row), fitted across and pinned to the top,
  // with the rest a scroll away. Where the row only fits below a readable size (a narrow window, or the docked panel
  // beside it), open at that size with the chapter you're on at the left edge instead.
  const [focus] = useState(() => {
    const areas = nodes.filter((node) => node.type === "area");
    const active = areas.find((node) => node.id === areaNodeId(activeChapter ?? "")) ?? areas[0];
    const top = active?.position.y ?? 0;
    return {
      top,
      left: active?.position.x ?? 0,
      nodes: areas.filter((node) => node.position.y === top).map((node) => ({ id: node.id })),
    };
  });
  const openOnFocus = async (flow: ReactFlowInstance<GraphNode, Edge>) => {
    await flow.fitView({ nodes: focus.nodes, padding: 0.04, maxZoom: 1 });
    const fitted = flow.getViewport();
    const zoom = Math.max(fitted.zoom, READABLE_ZOOM);
    const x = zoom === fitted.zoom ? fitted.x : 16 - focus.left * zoom;
    await flow.setViewport({ x, y: 16 - focus.top * zoom, zoom });
  };

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
        onInit={openOnFocus}
        minZoom={0.25}
        maxZoom={1.5}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        panOnScroll
        aria-label="Roadmap graph"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          ariaLabel="Roadmap overview"
          className="hidden! rounded-lg border md:block!"
          nodeColor={(node) =>
            node.type === "area"
              ? `var(--chapter-${chapterTone((node.data as AreaData).order - 1)}-soft)`
              : "var(--border)"
          }
          nodeBorderRadius={4}
        />
      </ReactFlow>
    </div>
  );
}
