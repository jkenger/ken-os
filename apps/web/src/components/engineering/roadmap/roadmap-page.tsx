"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconLayoutColumns, IconSitemap } from "@tabler/icons-react";
import { post, send } from "@/components/lab/topic/client";
import { formatDate } from "@/components/lab/words";
import { toast } from "@/components/ui/toaster";
import { useDocked } from "@/components/docked-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Connection } from "@/features/connector/oauth-store";
import { setupAlert, setupChecklist, type InstructionsState } from "@/features/engineering-lab/claude-setup";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import type { RoadmapSummary as Summary } from "@/features/engineering-lab/roadmap-summary";
import { engineering } from "@/features/engineering-lab/routes";
import { RoadmapGraph } from "./roadmap-graph";
import { RoadmapLanes } from "./roadmap-lanes";
import { RoadmapProgress } from "./roadmap-progress";
import { RoadmapSummary } from "./roadmap-summary";
import { canAddRoadmap, ROADMAP_LIMIT } from "@/features/engineering-lab/roadmaps";
import { Notice } from "../kit";
import {
  DeleteRoadmapDialog,
  NewRoadmapDialog,
  RoadmapSwitcher,
  type ArchivedChoice,
  type RoadmapChoice,
} from "./roadmap-switcher";
import { ClaudeSetup } from "./claude-setup";
import { SetupChecklist } from "./setup-checklist";
import { ReviewSearch } from "./review-search";
import { StatusLegend } from "./status";
import { TopicFind } from "./topic-find";
import { TopicSheet, type TopicTab } from "./topic-sheet";

// The Claude-first Engineering page (docs/architecture/engineering-claude-first.md, section 1): the goal and progress,
// the roadmap as lanes or a graph, and a topic panel. Claude teaches; this page shows where you are. A finished roadmap
// shows its summary above the graph (engineering-progressive-flow.md, section 4). The title switches between roadmaps,
// and each has its own address (engineering-roadmaps.md, section 1). Layout and look: docs/architecture/roadmap-ui.md.

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
  const wide = useDocked();
  const [selected, setSelected] = useState<string | null>(initialTopic);
  const [topicTab, setTopicTab] = useState<TopicTab>("topic");
  const [setupOpen, setSetupOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The roadmap's address, kept in the URL with the open topic; the role's path has none.
  const roadmapId = view.planned ? view.id : null;

  // Another roadmap opened: start from its own topic, and remember it as the one opened last.
  useEffect(() => {
    setSelected(initialTopic);
    if (roadmapId && view.active) void post(`/api/lab/roadmaps/${encodeURIComponent(roadmapId)}/open`).catch(() => {});
    // initialTopic belongs to the page load, so only a new roadmap resets it.
  }, [roadmapId]);

  // The layout you picked last time, kept in this browser only. Without one: Graph, or Lanes on a phone, where a
  // dependency graph is too small to use.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(LAYOUT_KEY);
    } catch {
      /* storage unavailable */
    }
    if (saved === "graph" || saved === "lanes") setLayout(saved);
    else if (window.matchMedia("(max-width: 767px)").matches) setLayout("lanes");
  }, []);
  const changeLayout = (next: Layout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  // The open topic lives in the address, so a link or a reload opens it. It replaces the entry, so Back leaves the page.
  const select = useCallback(
    (topicId: string | null, tab: TopicTab = "topic") => {
      setSelected(topicId);
      setTopicTab(tab);
      window.history.replaceState(null, "", engineering.roadmap(topicId, roadmapId));
    },
    [roadmapId],
  );

  const goal = view.goal?.title ?? "Roadmap";
  // The panel is an overview beside the graph and the full detail beside the lanes. A review opened from search needs the
  // Review tab, so it always shows the detail.
  const topicMode = layout === "graph" && topicTab !== "review" ? "overview" : "detail";
  const chapterIndex = selected
    ? view.chapters.findIndex((chapter) => chapter.topics.some((topic) => topic.id === selected))
    : -1;

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

  // Delete the roadmap shown, then open the one opened last, as after Archive.
  async function remove() {
    if (!roadmapId) return;
    setDeleting(true);
    try {
      await send(`/api/lab/roadmaps/${encodeURIComponent(roadmapId)}`, "DELETE");
      setDeleteOpen(false);
      toast({ tone: "success", title: `Deleted ${goal}` });
      router.push(engineering.roadmap());
      router.refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "Couldn't delete. Try again",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeleting(false);
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

  const { current } = view;
  const facts = {
    connected: connections.length > 0,
    instructions,
    projectLinked: Boolean(projectUrl),
    planned: view.planned,
  };
  // While the checklist is on the page it is the one way into Claude setup; the header button comes back once it folds away.
  const setupShown = setupChecklist(facts).show;
  return (
    <WorkspaceShell email={email} active="lab" tab="roadmap">
      <div className="flex min-w-0 items-start">
        <div className="grid min-w-0 flex-1 gap-block px-page pt-page pb-section">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b pb-4">
            <div className="min-w-0">
              {roadmaps.length > 0 || archived.length > 0 ? (
                <RoadmapSwitcher
                  title={goal}
                  currentId={roadmapId}
                  roadmaps={roadmaps}
                  archived={archived}
                  projectUrl={projectUrl}
                  onNew={() => setNewOpen(true)}
                  onArchive={roadmapId && view.active ? () => void archive() : null}
                  onDelete={roadmapId ? () => setDeleteOpen(true) : null}
                />
              ) : (
                <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">{goal}</h1>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ReviewSearch onOpen={(topicId) => select(topicId, "review")} />
              <ClaudeSetup
                mcpUrl={mcpUrl}
                connections={connections}
                projectUrl={projectUrl}
                instructions={instructions}
                alert={setupAlert(facts)}
                open={setupOpen}
                onOpenChange={setSetupOpen}
                showTrigger={!setupShown}
              />
              {current && !summary && (
                <Button type="button" size="sm" onClick={() => select(current.id)}>
                  Continue topic
                  <IconArrowRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          {!view.active && (
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
          )}
          {setupShown && (
            <SetupChecklist facts={facts} projectUrl={projectUrl} onOpenSetup={() => setSetupOpen(true)} />
          )}
          <RoadmapProgress view={view} summary={summary} onSelect={select} />
          {summary && (
            <RoadmapSummary
              summary={summary}
              onNew={() => setNewOpen(true)}
              onArchive={view.active && roadmapId ? () => void archive() : null}
              onSelect={select}
            />
          )}
          {view.chapters.length === 0 ? (
            <Notice>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">No topics yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Plan a roadmap with Claude to fill it</p>
                </div>
                {view.active && (
                  <Button type="button" size="sm" onClick={() => setNewOpen(true)}>
                    Plan with Claude
                  </Button>
                )}
              </div>
            </Notice>
          ) : (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <Tabs value={layout} onValueChange={(next) => changeLayout(next as Layout)}>
                  <TabsList aria-label="Roadmap layout">
                    <TabsTrigger value="lanes">
                      <IconLayoutColumns aria-hidden="true" />
                      Lanes
                    </TabsTrigger>
                    <TabsTrigger value="graph">
                      <IconSitemap aria-hidden="true" />
                      Graph
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <StatusLegend className="hidden lg:flex" />
                  <TopicFind view={view} onSelect={select} />
                </div>
              </div>
              {layout === "graph" ? (
                <RoadmapGraph key={roadmapId ?? "path"} view={view} selected={selected} onSelect={select} />
              ) : (
                <RoadmapLanes view={view} selected={selected} onSelect={select} />
              )}
            </div>
          )}
        </div>
        <TopicSheet
          topicId={selected}
          roadmapId={roadmapId}
          roadmapActive={view.active}
          projectUrl={projectUrl}
          mode={topicMode}
          tab={topicTab}
          onOpenDetail={() => setLayout("lanes")}
          chapterIndex={chapterIndex < 0 ? null : chapterIndex}
          onTabChange={setTopicTab}
          onClose={() => select(null)}
          onChanged={() => router.refresh()}
          onSelect={(topicId) => select(topicId)}
          docked={wide}
        />
      </div>
      <NewRoadmapDialog active={roadmaps.length} projectUrl={projectUrl} open={newOpen} onOpenChange={setNewOpen} />
      <DeleteRoadmapDialog
        goal={goal}
        open={deleteOpen}
        busy={deleting}
        onOpenChange={setDeleteOpen}
        onConfirm={() => void remove()}
      />
    </WorkspaceShell>
  );
}
