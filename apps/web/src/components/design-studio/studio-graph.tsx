"use client";

import { Component, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  BaseEdge,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  useViewport,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleAlert, Minus, Plus, Scan, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { graphGrid, layoutGraph, type StudioComponent } from "@/features/design-studio/manifest";
import { cn } from "@/lib/utils";
import { previews } from "./previews";

// The studio's canvas (docs/architecture/design-studio.md, step 2; mockup frames A1, A2 and C1 to C8): every component
// in This repo as a live node on a five-column grid in tree order, with an arrow to each primitive it uses and a
// dashed one from a Loots wrapper to what it wraps. Arrows touching the picked node are drawn in the selected colour
// and the rest fade; hovering a node darkens its own. Under 50% a node shows its name only.

export type Theme = "light" | "dark";

/** Under this zoom a node shows its name only (C7). */
const NAME_ONLY_ZOOM = 0.5;

/** Shows "Preview failed" (mockup frame C9) when a component throws while rendering, instead of losing the page. */
export class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="flex items-center gap-2 text-sm text-destructive">
        <CircleAlert className="size-4" aria-hidden="true" />
        Preview failed
      </p>
    );
  }
}

/** The component's sample, live, or "No preview" when it has none. */
export function Preview({ id }: { id: string }) {
  const Sample = previews[id];
  if (!Sample) return <p className="text-sm text-muted-foreground">No preview</p>;
  return (
    <PreviewBoundary key={id}>
      <Sample />
    </PreviewBoundary>
  );
}

type ComponentData = {
  component: StudioComponent;
  picked: boolean;
  hovered: boolean;
  theme: Theme;
  onPick: (id: string) => void;
};
type AreaData = { name: string; count: number; theme: Theme };
type GraphNode = Node<ComponentData, "component"> | Node<AreaData, "area">;

const hidden: CSSProperties = { opacity: 0, pointerEvents: "none" };

/** Unseen handles, which React Flow needs to draw an edge; the edge's path comes from the layout, not from them. */
function Handles() {
  return (
    <>
      <Handle type="source" position={Position.Top} style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
    </>
  );
}

/** One component (C1, C2): a header that picks it, with Loots on a wrapper, over the component rendered live. */
function ComponentNode({ data }: NodeProps<Node<ComponentData, "component">>) {
  const { component, picked, hovered, theme, onPick } = data;
  const nameOnly = useStore((state) => state.transform[2] < NAME_ONLY_ZOOM);
  return (
    <figure
      aria-label={`${component.name} preview`}
      className={cn(
        "relative flex size-full flex-col overflow-hidden rounded-[14px] border bg-card text-card-foreground",
        theme === "dark" && "dark",
        hovered && !picked && "border-foreground/30",
        picked && "border-selected/55 ring-3 ring-selected/15",
        picked && nameOnly && "border-3 border-selected ring-8 ring-selected/25",
      )}
    >
      <Handles />
      <Button
        type="button"
        variant="ghost"
        aria-pressed={picked}
        onClick={() => onPick(component.id)}
        title={component.kind === "wrapper" ? `${component.name}, Loots` : component.name}
        className={cn(
          "h-9 shrink-0 justify-start gap-1.5 rounded-none pr-2.5 pl-3 text-left hover:bg-transparent focus-visible:ring-inset aria-pressed:bg-transparent",
          nameOnly &&
            "h-full justify-center p-3 text-center text-3xl leading-tight font-semibold wrap-anywhere whitespace-normal",
        )}
      >
        <span className={cn(!nameOnly && "truncate")}>{component.name}</span>
        {component.kind === "wrapper" && !nameOnly && (
          <Badge variant="outline" className="ml-auto shrink-0">
            Loots
          </Badge>
        )}
      </Button>
      {!nameOnly && (
        <div className="nodrag nopan mx-2 mb-2 flex min-h-0 flex-1 cursor-auto flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border bg-background p-2.5 text-foreground">
          <Preview id={component.id} />
        </div>
      )}
    </figure>
  );
}

/** A library's area behind its nodes, with its name and count (A1). */
function AreaNode({ data }: NodeProps<Node<AreaData, "area">>) {
  return (
    <div
      className={cn(
        "size-full rounded-[18px] bg-[color-mix(in_oklch,var(--muted)_45%,var(--background))]",
        data.theme === "dark" && "dark",
      )}
    >
      <p className="flex items-baseline gap-2.5 pt-5 pl-8">
        <span className="font-heading text-base font-semibold text-foreground">{data.name}</span>
        <span className="font-mono text-xs text-muted-foreground">{data.count}</span>
      </p>
    </div>
  );
}

const nodeTypes: NodeTypes = { component: ComponentNode, area: AreaNode };

/** The canvas toolbar (C6): Find, the preview theme, then Fit and zoom. */
function Toolbar({ onFind, themeToggle }: { onFind: () => void; themeToggle: ReactNode }) {
  const flow = useReactFlow();
  const { zoom } = useViewport();
  return (
    <div role="toolbar" aria-label="Canvas" className="flex h-11 shrink-0 items-center gap-2">
      <Button variant="outline" size="sm" onClick={onFind}>
        <Search aria-hidden="true" />
        Find a component
        <kbd className="rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">/</kbd>
      </Button>
      {themeToggle}
      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => flow.fitView({ duration: 300 })}>
        <Scan aria-hidden="true" />
        Fit
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => flow.zoomOut({ duration: 200 })}>
        <Minus aria-hidden="true" />
      </Button>
      <span aria-label="Zoom" className="min-w-11 text-center font-mono text-xs">
        {Math.round(zoom * 100)}%
      </span>
      <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => flow.zoomIn({ duration: 200 })}>
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}

type RouteEdge = Edge<{ path: string }, "route">;

/** An edge along the path the layout routed for it, through the gaps between nodes. */
function Route({ data, markerEnd, style }: EdgeProps<RouteEdge>) {
  return <BaseEdge path={data?.path ?? ""} markerEnd={markerEnd} style={style} />;
}

const edgeTypes: EdgeTypes = { route: Route };

const flowStyle = { "--xy-background-color": "transparent" } as CSSProperties;

function Graph({
  components,
  shown,
  picked,
  theme,
  onPick,
  onClear,
  onFind,
  themeToggle,
}: {
  components: StudioComponent[];
  /** Ids the tree's find leaves in view; the rest are hidden in place. */
  shown: Set<string>;
  picked: string;
  theme: Theme;
  onPick: (id: string) => void;
  onClear: () => void;
  onFind: () => void;
  themeToggle: ReactNode;
}) {
  const flow = useReactFlow<GraphNode, RouteEdge>();
  const frame = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const layout = useMemo(() => layoutGraph(components), [components]);
  const at = useMemo(() => new Map(layout.nodes.map((node) => [node.component.id, node])), [layout]);

  const nodes = useMemo<GraphNode[]>(
    () => [
      {
        id: "area:repo",
        type: "area",
        position: { x: 0, y: 0 },
        width: layout.area.width,
        height: layout.area.height,
        style: { width: layout.area.width, height: layout.area.height },
        zIndex: -1,
        hidden: shown.size === 0,
        draggable: false,
        selectable: false,
        data: { name: "This repo", count: components.length, theme },
      },
      ...layout.nodes.map(({ component, x, y }): GraphNode => ({
        id: component.id,
        type: "component",
        position: { x, y },
        width: graphGrid.width,
        height: graphGrid.height,
        style: { width: graphGrid.width, height: graphGrid.height },
        zIndex: 1,
        hidden: !shown.has(component.id),
        draggable: false,
        // Selectable keeps pointer events on, so clicks reach the header and the live component.
        selectable: true,
        data: {
          component,
          picked: component.id === picked,
          hovered: component.id === hovered,
          theme,
          onPick,
        },
      })),
    ],
    [layout, components.length, shown, picked, hovered, theme, onPick],
  );

  const edges = useMemo<RouteEdge[]>(
    () =>
      layout.edges.map((edge): RouteEdge => {
        const touches = (id: string | null) => id !== null && (edge.source === id || edge.target === id);
        const tone = touches(picked)
          ? { stroke: "var(--selected)", width: 2 }
          : touches(hovered)
            ? { stroke: "var(--foreground)", width: 2 }
            : picked
              ? { stroke: "var(--border)", width: 1.5 }
              : { stroke: "color-mix(in oklch, var(--muted-foreground) 55%, transparent)", width: 1.5 };
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "route",
          data: { path: edge.path },
          hidden: !shown.has(edge.source) || !shown.has(edge.target),
          selectable: false,
          focusable: false,
          // Lit edges above faded ones, all under the nodes.
          zIndex: touches(picked) || touches(hovered) ? 0 : -1,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: tone.stroke },
          style: {
            stroke: tone.stroke,
            strokeWidth: tone.width,
            strokeDasharray: edge.kind === "wraps" ? "5 4" : undefined,
          },
        };
      }),
    [layout, shown, picked, hovered],
  );

  // First open is 100% on the top row of This repo, with the picked node in view and the area's edge 24px in.
  const open = () => {
    const width = frame.current?.clientWidth ?? 0;
    const node = at.get(picked);
    const x = node ? width / 2 - (node.x + graphGrid.width / 2) : 24;
    const y = node ? Math.min(24, 88 - node.y) : 24;
    flow.setViewport({ x: Math.max(Math.min(24, x), width - layout.area.width - 24), y, zoom: 1 });
  };

  // Picking a node out of view, such as from the tree, brings it to the centre at the current zoom.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const node = at.get(picked);
    const box = frame.current;
    if (!node || !box) return;
    const { x, y, zoom } = flow.getViewport();
    const left = node.x * zoom + x;
    const top = node.y * zoom + y;
    const inView =
      left >= 0 &&
      top >= 0 &&
      left + graphGrid.width * zoom <= box.clientWidth &&
      top + graphGrid.height * zoom <= box.clientHeight;
    if (!inView) flow.setCenter(node.x + graphGrid.width / 2, node.y + graphGrid.height / 2, { zoom, duration: 300 });
  }, [picked, at, flow]);

  return (
    <>
      <Toolbar onFind={onFind} themeToggle={themeToggle} />
      <div
        ref={frame}
        className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] border bg-background bg-[radial-gradient(color-mix(in_oklch,var(--muted-foreground)_30%,transparent)_1px,transparent_1.2px)] bg-size-[20px_20px]"
        style={flowStyle}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodeOrigin={[0, 0]}
          onInit={open}
          onNodeMouseEnter={(_, node) => node.type === "component" && setHovered(node.id)}
          onNodeMouseLeave={() => setHovered(null)}
          minZoom={0.2}
          maxZoom={1.5}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          panOnScroll
          aria-label="Components graph"
          proOptions={{ hideAttribution: true }}
        />
        {shown.size === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid justify-items-center gap-3 px-4 text-center">
              <p className="text-sm font-semibold">No components match</p>
              <Button variant="outline" size="sm" onClick={onClear}>
                Clear filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** The canvas column: toolbar over the graph. Its toolbar reads the graph's zoom, so both sit in one provider. */
export function StudioGraph(props: Parameters<typeof Graph>[0]) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}
