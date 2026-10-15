"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/components/lab/topic/client";
import { formatDate } from "@/components/lab/words";
import { toast } from "@/components/ui/toaster";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Connection } from "@/features/connector/oauth-store";
import { replanMessage } from "@/features/engineering-lab/ask-claude";
import { setupAlert, setupChecklist, type InstructionsState } from "@/features/engineering-lab/claude-setup";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import type { RoadmapSummary as Summary } from "@/features/engineering-lab/roadmap-summary";
import { engineering } from "@/features/engineering-lab/routes";
import { AskClaude } from "../ask-claude";
import { RoadmapGraph } from "./roadmap-graph";
import { RoadmapLanes } from "./roadmap-lanes";
import { RoadmapSummary } from "./roadmap-summary";
import { canAddRoadmap, ROADMAP_LIMIT } from "@/features/engineering-lab/roadmaps";
import { Notice } from "../kit";
import { NewRoadmapDialog, RoadmapSwitcher, type ArchivedChoice, type RoadmapChoice } from "./roadmap-switcher";
import { ClaudeSetup } from "./claude-setup";
import { SetupChecklist } from "./setup-checklist";
import { ReviewSearch } from "./review-search";
import { TopicSheet, type TopicTab } from "./topic-sheet";

// The Claude-first Engineering page (docs/architecture/engineering-claude-first.md, section 1): the goal and progress,
// the roadmap as a graph or lanes, and a topic panel. Claude teaches; this page shows where you are. A finished roadmap
// shows its summary above the graph (engineering-progressive-flow.md, section 4). The title switches between roadmaps,
// and each has its own address (engineering-roadmaps.md, section 1).

type Layout = "graph" | "lanes";
const LAYOUT_KEY = "ken-os-roadmap-layout";

export function RoadmapPage({
  email,
  view,
  roadmaps,
  archived,
  summary,
  connections,
  projectUrl,
  mcpUrl,
  instructions,
  initialTopic,
}: {
  email: string;
  view: RoadmapView;
  /** The active roadmaps, opened last first; empty before the first is saved. */
  roadmaps: RoadmapChoice[];
  /** Archived roadmaps, newest first, for the switcher. */
  archived: ArchivedChoice[];
  /** Set once every topic is Learned or Skipped. */
  summary: Summary | null;
  connections: Connection[];
  projectUrl: string | null;
  mcpUrl: string;
  instructions: InstructionsState;
  initialTopic: string | null;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<Layout>("graph");
  const [selected, setSelected] = useState<string | null>(initialTopic);
  const [topicTab, setTopicTab] = useState<TopicTab>("topic");
  const [setupOpen, setSetupOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  // The roadmap's address, kept in the URL with the open topic; the role's path has none.
  const roadmapId = view.planned ? view.id : null;

  // Another roadmap opened: start from its own topic, and remember it as the one opened last.
  useEffect(() => {
    setSelected(initialTopic);
    if (roadmapId && view.active) void post(`/api/lab/roadmaps/${encodeURIComponent(roadmapId)}/open`).catch(() => {});
    // initialTopic belongs to the page load, so only a new roadmap resets it.
  }, [roadmapId]);

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
  const select = useCallback(
    (topicId: string | null, tab: TopicTab = "topic") => {
      setSelected(topicId);
      setTopicTab(tab);
      window.history.replaceState(null, "", engineering.roadmap(topicId, roadmapId));
    },
    [roadmapId],
  );

  const goal = view.goal?.title ?? "Roadmap";

  // Archive the roadmap shown, then open the one opened last (or the role's path when none is left).
  async function archive() {
    if (!roadmapId) return;
    try {
      await post(`/api/lab/roadmaps/${encodeURIComponent(roadmapId)}/archive`);
      toast({ tone: "success", title: `Archived ${goal}` });
      router.push(engineering.roadmap());
      router.refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "Couldn't archive. Try again",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function restore() {
    if (!roadmapId) return;
    if (!canAddRoadmap(roadmaps.length)) {
      toast({ tone: "error", title: `${roadmaps.length} of ${ROADMAP_LIMIT} active · archive one first` });
      return;
    }
    try {
      await post(`/api/lab/roadmaps/${encodeURIComponent(roadmapId)}/restore`);
      toast({ tone: "success", title: `Restored ${goal}` });
      router.refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "Couldn't restore. Try again",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const { counts, current } = view;
  const facts = {
    connected: connections.length > 0,
    instructions,
    projectLinked: Boolean(projectUrl),
    planned: view.planned,
  };
  return (
    <WorkspaceShell email={email} active="lab" tab="roadmap">
      <div className="mx-auto max-w-7xl px-3 pt-6 pb-9 md:px-5 md:pt-7.5">
        <div className="mx-1 mb-5 flex flex-wrap items-start justify-between gap-4 md:mx-3.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">Engineering</p>
            {roadmaps.length > 0 || archived.length > 0 ? (
              <RoadmapSwitcher
                title={goal}
                currentId={roadmapId}
                roadmaps={roadmaps}
                archived={archived}
                projectUrl={projectUrl}
                onNew={() => setNewOpen(true)}
                onArchive={roadmapId && view.active ? () => void archive() : null}
              />
            ) : (
              <h1 className="text-3xl leading-tight font-bold tracking-tight md:text-4xl">
                {view.goal?.title ?? "Roadmap"}
              </h1>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReviewSearch onOpen={(topicId) => select(topicId, "review")} />
            <Tabs value={layout} onValueChange={(next) => changeLayout(next as Layout)}>
              <TabsList aria-label="Roadmap layout">
                <TabsTrigger value="graph">Graph</TabsTrigger>
                <TabsTrigger value="lanes">Lanes</TabsTrigger>
              </TabsList>
            </Tabs>
            {roadmapId && view.active && projectUrl && !summary && (
              <AskClaude
                message={replanMessage({ id: roadmapId, goal: view.goal?.title ?? "Roadmap" })}
                label="Re-plan"
                projectUrl={projectUrl}
              />
            )}
            <ClaudeSetup
              mcpUrl={mcpUrl}
              connections={connections}
              projectUrl={projectUrl}
              instructions={instructions}
              alert={setupAlert(facts)}
              open={setupOpen}
              onOpenChange={setSetupOpen}
            />
          </div>
        </div>
        <div className="mx-1 mb-5 md:mx-3.5">
          <p className="text-sm">
            {summary ? (
              <>
                <span className="font-semibold">Complete</span>
                {summary.finishedAt && ` · ${formatDate(summary.finishedAt)}`}
                {` · ${counts.learned} of ${counts.total} learned`}
              </>
            ) : (
              <>
                {counts.learned} of {counts.total} learned
                {counts.skipped > 0 && ` · ${counts.skipped} skipped`}
                {current && (
                  <>
                    {" · Now: "}
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => select(current.id)}
                    >
                      {current.title}
                    </Button>
                  </>
                )}
              </>
            )}
          </p>
          <Progress
            value={summary ? 100 : counts.total ? Math.round((counts.learned / counts.total) * 100) : 0}
            aria-label={`${counts.learned} of ${counts.total} learned`}
            className="mt-2"
          />
        </div>
        {!view.active && (
          <div className="mx-1 mb-5 md:mx-3.5">
            <Notice>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Archived</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {view.archivedAt ? `Since ${formatDate(view.archivedAt)} · ` : ""}read only
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => void restore()}>
                  Restore
                </Button>
              </div>
            </Notice>
          </div>
        )}
        {setupChecklist(facts).show && (
          <div className="mx-1 mb-5 md:mx-3.5">
            <SetupChecklist facts={facts} projectUrl={projectUrl} onOpenSetup={() => setSetupOpen(true)} />
          </div>
        )}
        {summary && (
          <div className="mx-1 mb-5 md:mx-3.5">
            <RoadmapSummary
              summary={summary}
              onNew={() => setNewOpen(true)}
              onArchive={view.active && roadmapId ? () => void archive() : null}
              onSelect={select}
            />
          </div>
        )}
        <div className="mx-1 md:mx-3.5">
          {layout === "graph" ? (
            <RoadmapGraph key={roadmapId ?? "path"} view={view} selected={selected} onSelect={select} />
          ) : (
            <RoadmapLanes view={view} selected={selected} onSelect={select} />
          )}
        </div>
      </div>
      <NewRoadmapDialog active={roadmaps.length} projectUrl={projectUrl} open={newOpen} onOpenChange={setNewOpen} />
      <TopicSheet
        topicId={selected}
        roadmapId={roadmapId}
        roadmapActive={view.active}
        projectUrl={projectUrl}
        tab={topicTab}
        onTabChange={setTopicTab}
        onClose={() => select(null)}
        onChanged={() => router.refresh()}
        onSelect={(topicId) => select(topicId)}
      />
    </WorkspaceShell>
  );
}
