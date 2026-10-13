"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Connection } from "@/features/connector/oauth-store";
import { PLAN_MESSAGE } from "@/features/engineering-lab/ask-claude";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import { engineering } from "@/features/engineering-lab/routes";
import { AskClaude } from "../ask-claude";
import { Notice } from "../kit";
import { RoadmapGraph } from "./roadmap-graph";
import { RoadmapLanes } from "./roadmap-lanes";
import { ClaudeSetup } from "./claude-setup";
import { TopicSheet } from "./topic-sheet";

// The Claude-first Engineering page (docs/architecture/engineering-claude-first.md, section 1): the goal and progress,
// the roadmap as a graph or lanes, and a topic panel. Claude teaches; this page shows where you are.

type Layout = "graph" | "lanes";
const LAYOUT_KEY = "ken-os-roadmap-layout";

export function RoadmapPage({
  email,
  view,
  connections,
  projectUrl,
  mcpUrl,
  initialTopic,
}: {
  email: string;
  view: RoadmapView;
  connections: Connection[];
  projectUrl: string | null;
  mcpUrl: string;
  initialTopic: string | null;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<Layout>("graph");
  const [selected, setSelected] = useState<string | null>(initialTopic);

  // The layout you picked last time, kept in this browser only.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAYOUT_KEY);
      if (saved === "graph" || saved === "lanes") setLayout(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const changeLayout = (next: Layout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  // The open topic lives in the address, so a link can open it and Back closes it.
  const select = useCallback((topicId: string | null) => {
    setSelected(topicId);
    window.history.replaceState(null, "", engineering.roadmap(topicId));
  }, []);

  const { counts, current } = view;
  return (
    <WorkspaceShell email={email} active="lab" tab="roadmap">
      <div className="mx-auto max-w-7xl px-3 pt-6 pb-9 md:px-5 md:pt-7.5">
        <div className="mx-1 mb-5 flex flex-wrap items-start justify-between gap-4 md:mx-3.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">Engineering</p>
            <h1 className="text-3xl leading-tight font-bold tracking-tight md:text-4xl">
              {view.goal?.title ?? "Roadmap"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={layout} onValueChange={(next) => changeLayout(next as Layout)}>
              <TabsList aria-label="Roadmap layout">
                <TabsTrigger value="graph">Graph</TabsTrigger>
                <TabsTrigger value="lanes">Lanes</TabsTrigger>
              </TabsList>
            </Tabs>
            {view.planned && projectUrl && (
              <AskClaude message={PLAN_MESSAGE} label="Plan new roadmap" projectUrl={projectUrl} />
            )}
            <ClaudeSetup mcpUrl={mcpUrl} connections={connections} projectUrl={projectUrl} />
          </div>
        </div>
        <div className="mx-1 mb-5 md:mx-3.5">
          <p className="text-sm">
            {counts.learned} of {counts.total} learned
            {counts.skipped > 0 && ` · ${counts.skipped} skipped`}
            {current && (
              <>
                {" · Now: "}
                <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => select(current.id)}>
                  {current.title}
                </Button>
              </>
            )}
          </p>
          <Progress
            value={counts.total ? Math.round((counts.learned / counts.total) * 100) : 0}
            aria-label={`${counts.learned} of ${counts.total} learned`}
            className="mt-2"
          />
        </div>
        {!view.planned && (
          <div className="mx-1 md:mx-3.5">
            <Notice>
              <p className="font-semibold">No roadmap</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {view.goal ? `Showing the ${view.goal.title} path` : "Showing every topic"} · plan yours with Claude
              </p>
              <div className="mt-3">
                {projectUrl ? (
                  <AskClaude message={PLAN_MESSAGE} label="Plan with Claude" projectUrl={projectUrl} />
                ) : (
                  <ClaudeSetup mcpUrl={mcpUrl} connections={connections} projectUrl={projectUrl} />
                )}
              </div>
            </Notice>
          </div>
        )}
        <div className="mx-1 md:mx-3.5">
          {layout === "graph" ? (
            <RoadmapGraph view={view} selected={selected} onSelect={select} />
          ) : (
            <RoadmapLanes view={view} selected={selected} onSelect={select} />
          )}
        </div>
      </div>
      <TopicSheet
        topicId={selected}
        projectUrl={projectUrl}
        onClose={() => select(null)}
        onChanged={() => router.refresh()}
      />
    </WorkspaceShell>
  );
}
