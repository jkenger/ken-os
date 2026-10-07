"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import type { Level } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { Question, type AnswerPayload, type AssessmentView } from "../topic/answers";
import { post } from "../topic/client";
import { depthWords, levelWords, radarTagWords } from "../words";
import { Stat, TitleBar } from "../panel";
import { GuideChat, type GuideProposals } from "./guide-chat";
import { LevelTable } from "./level-table";
import { Skyline } from "./skyline";
import { engineering } from "@/features/engineering-lab/routes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// The profile page as a tool: a compact title bar, the Guide in a pane on the left, and the detail in a tabbed pane
// on the right; both panes scroll on their own. Chosen on 2026-10-03 from the design exploration ("Workbench, app
// style"). Design: docs/architecture/engineering-lab-profile.md, sections 2, 3, 5 and 7.

export type ProfilePane = "shape" | "levels" | "roles" | "chapters" | "radar" | "assessments" | "definitions";

const paneNames: Record<ProfilePane, string> = {
  shape: "Shape", levels: "Levels", roles: "Roles", chapters: "Chapters", radar: "Radar", assessments: "Assessments", definitions: "Definitions",
};

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  async function run(key: string, action: () => Promise<unknown>, success?: string) {
    setBusy(key);
    try {
      await action();
      if (success) toast({ tone: "success", title: success });
      router.refresh();
    } catch (error) {
      toast({ tone: "error", title: "Couldn't save. Try again", description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy("");
    }
  }
  return { busy, run };
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function AddedChapterScreen({ chapter }: { chapter: ProfileView["addedChapters"][number] }) {
  const router = useRouter();
  const next = chapter.next!;
  const view: AssessmentView = {
    id: next.id, kind: "screen", createdAt: chapter.addedAt,
    items: Array.from({ length: next.itemIndex + 1 }, (_, index) => index === next.itemIndex ? { ...next.item, answered: null } : { mode: next.item.mode, prompt: "", code: null, answered: null }) as AssessmentView["items"],
  };
  const submitTo = (payload: AnswerPayload) => post("/api/lab/screens", { screenId: next.id, text: payload.text ?? "", selfRating: payload.selfRating });
  return <Question key={next.id} assessment={view} index={next.itemIndex} heading={`${chapter.title} · Question ${next.itemIndex + 1} of 2`} submitTo={submitTo} onDone={() => router.refresh()} />;
}

export function LabProfile({ email, view, initialPane, closedBook = false }: { email: string; view: ProfileView; initialPane?: ProfilePane; closedBook?: boolean }) {
  const { busy, run } = useAction();
  const [proposals, setProposals] = useState<GuideProposals>({ intake: null, direction: null, addChapters: [] });
  const [pane, setPane] = useState<ProfilePane>(initialPane ?? "shape");
  const baselineDone = view.baseline.state === "done";
  const chosen = view.roles.find((role) => role.roleId === view.direction);
  const targets = Object.fromEntries(chosen?.areas.map((area) => [area.area, area.target]) ?? []) as Partial<Record<string, Level>>;
  const proposedRole = view.roles.find((role) => role.roleId === proposals.direction);
  const weeks = view.roadmap.at(-1)?.doneByWeek ?? 0;
  const chapterTitle = (id: string) => view.roadmap.find((step) => step.chapter === id)?.title ?? id;

  // Keep the open pane in the address, so a reload or a shared link opens the same one.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("pane", pane);
    window.history.replaceState(window.history.state, "", url);
  }, [pane]);

  const setDirection = (roleId: string) => run(roleId, () => post("/api/lab/profile", { action: "direction", roleId }), "Direction set");

  const suggestions = (
    <>
      {proposedRole && proposedRole.roleId !== view.direction && (
        <div className="rounded-md border border-foreground p-3 text-sm">
          <p className="text-xs text-muted-foreground">Guide&apos;s suggestion</p>
          <p className="font-semibold">{proposedRole.title}</p>
          <p className="text-muted-foreground">{proposedRole.missing.length} chapters away</p>
          <Button size="sm" className="mt-2" disabled={Boolean(busy)} onClick={() => void setDirection(proposedRole.roleId)}>Set as direction</Button>
        </div>
      )}
      {proposals.addChapters.map((chapter) => (
        <div key={chapter.title} className="rounded-md border border-border p-3 text-sm">
          <p className="text-xs text-muted-foreground">Suggested chapter</p>
          <p className="font-semibold">{chapter.title}</p>
          <p className="text-muted-foreground">{chapter.reason}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={Boolean(busy)} onClick={() => void run(chapter.title, async () => {
              await post("/api/lab/profile", { action: "addChapter", chapter });
              setProposals((current) => ({ ...current, addChapters: current.addChapters.filter((item) => item.title !== chapter.title) }));
            }, "Added · Not written yet")}>Add chapter</Button>
            <Button size="sm" variant="ghost" onClick={() => setProposals((current) => ({ ...current, addChapters: current.addChapters.filter((item) => item.title !== chapter.title) }))}>Dismiss</Button>
          </div>
        </div>
      ))}
    </>
  );
  const hasSuggestions = Boolean(proposedRole && proposedRole.roleId !== view.direction) || proposals.addChapters.length > 0;

  return (
    <WorkspaceShell email={email} active="lab" tab="profile" termLookup={!closedBook}>
      <div className="w-full px-5 py-6 sm:px-8">
        <TitleBar
          title="Direction"
          stats={baselineDone ? <>
            <Stat label="Direction" value={chosen ? chosen.title : "No direction yet"} />
            {chosen && <Stat label="Level" value={levelWords(chosen.overall)} />}
            {chosen && <Stat label="Still to do" value={chosen.missing.length ? `${chosen.missing.length} chapters · ~${weeks} weeks` : "Nothing"} />}
            <Stat label="Baseline" value={view.baseline.completedAt ? formatDay(view.baseline.completedAt) : "Not started"} />
          </> : undefined}
          actions={baselineDone ? (view.checkpoint.inProgressRunId
            ? <Button asChild size="sm" variant="outline"><Link href={engineering.assessment({ run: view.checkpoint.inProgressRunId })}>Continue checkpoint</Link></Button>
            : <Button asChild size="sm" variant="outline"><Link href={engineering.assessment({ new: true })}>Start checkpoint</Link></Button>) : undefined}
        />

        {!baselineDone ? (
          <div className="mt-4 rounded-lg border border-border p-5 text-sm">
            <p className="font-semibold">Available after the baseline</p>
            <Button asChild size="sm" className="mt-3"><Link href={engineering.assessment()}>{view.baseline.state === "in_progress" ? "Continue baseline" : "Start baseline"}</Link></Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:h-[calc(100vh-232px)] lg:min-h-[540px] lg:grid-cols-[320px_minmax(0,1fr)]">
            <GuideChat
              className="lg:min-h-0"
              phase="direction" history={view.conversation}
              opener="Here's where you are after the baseline. Tell me what you want to build over the next year, and I'll walk you through which roles fit and what each would take."
              onProposals={(next) => setProposals((current) => ({ ...next, addChapters: [...current.addChapters, ...next.addChapters].slice(-3) }))}
              footer={hasSuggestions ? suggestions : undefined}
            />

            <section aria-label="Profile detail" className="flex min-h-[480px] min-w-0 flex-col rounded-lg border border-border lg:min-h-0">
              <Tabs value={pane} onValueChange={(next) => setPane(next as ProfilePane)} className="flex min-h-0 flex-1 flex-col gap-0">
              <TabsList variant="line" aria-label="Profile sections" className="w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border px-1 group-data-horizontal/tabs:h-auto [scrollbar-width:none]">
                {(Object.keys(paneNames) as ProfilePane[]).map((id) => (
                  <TabsTrigger key={id} value={id} className="flex-none px-2.5 py-2.5 font-semibold">
                    {paneNames[id]}{id === "chapters" && view.addedChapters.length ? ` (${view.addedChapters.length})` : ""}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={pane} className="min-h-0 overflow-y-auto p-5">
                {pane === "shape" && (
                  <div className="grid max-w-[760px] gap-8">
                    <Skyline areas={view.areas} targets={targets} compact />
                    {chosen && (
                      <div>
                        <h2 className="text-sm font-semibold">{chosen.missing.length ? `Still needed for ${chosen.title}` : `Everything ${chosen.title} needs is there`}</h2>
                        {chosen.missing.length > 0 && (
                          <ul className="mt-2 grid border-t border-border text-sm sm:grid-cols-2 sm:gap-x-8">
                            {chosen.missing.map((item) => (
                              <li key={item.chapter} className="flex justify-between gap-3 border-b border-border py-2">
                                <span className="min-w-0 truncate">{chapterTitle(item.chapter)}</span>
                                <span className="shrink-0 text-muted-foreground">{depthWords[item.need].toLowerCase()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {pane === "levels" && <LevelTable profile={view} targets={targets} />}

                {pane === "roles" && (
                  <>
                    <p className="text-sm text-muted-foreground">Closest first. Change any time; the baseline stays</p>
                    <ul className="mt-3 divide-y divide-border border-y border-border">
                      {[...view.roles].sort((a, b) => a.missing.length - b.missing.length).map((role) => (
                        <li key={role.roleId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{role.title}</p>
                            <p className="text-sm text-muted-foreground">{role.missing.length ? `${role.missing.length} chapters away` : "Ready"} · {levelWords(role.overall).toLowerCase()} now</p>
                            <p className="text-sm text-muted-foreground">{role.summary}</p>
                          </div>
                          {role.roleId === view.direction
                            ? <Pill tone="solid">Current direction</Pill>
                            : <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void setDirection(role.roleId)}>Choose</Button>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {pane === "chapters" && (
                  view.addedChapters.length ? (
                    <ul className="space-y-4">
                      {view.addedChapters.map((chapter) => (
                        <li key={chapter.id} className="rounded-lg border border-border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{chapter.title}</p>
                            <Pill tone={chapter.screened ? "neutral" : "quiet"}>{chapter.screened ? `${depthWords[chapter.depth as keyof typeof depthWords]}, estimate` : "Not assessed"}</Pill>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{chapter.reason}</p>
                          {!chapter.started && <Button size="sm" className="mt-3" disabled={Boolean(busy)} onClick={() => void run(chapter.id, () => post("/api/lab/screens/added", { chapterId: chapter.id }))}>{busy === chapter.id ? "Writing questions…" : "Placement check"}</Button>}
                          {chapter.next && <div className="mt-4"><AddedChapterScreen chapter={chapter} /></div>}
                        </li>
                      ))}
                    </ul>
                  ) : <div className="text-sm"><p className="font-semibold">No added chapters</p><p className="mt-1 text-muted-foreground">Add one from a Guide suggestion. Each starts with a placement check</p></div>
                )}

                {pane === "radar" && (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm" variant="outline" disabled={!view.direction || view.radar.checked || Boolean(busy)} onClick={() => void run("radar", () => post("/api/lab/radar"), "Radar updated")}>
                        {busy === "radar" ? "Scanning…" : view.radar.checked ? `Scanned · ${view.radar.week}` : "Scan now"}
                      </Button>
                      <p className="text-sm text-muted-foreground">{view.direction ? "Weekly scan of official docs and release notes · up to 5 items" : "Choose a direction first"}</p>
                    </div>
                    {view.direction && (
                      <details className="group mt-2 text-sm">
                        <DisclosureSummary className="text-muted-foreground">How this works</DisclosureSummary>
                        <p className="mt-2 pl-6 text-muted-foreground">Sources are official docs, release notes and changelogs. A proven topic whose facts changed gets a re-check flag</p>
                      </details>
                    )}
                    {view.radar.items.length ? (
                      <ul className="mt-4 divide-y divide-border border-y border-border">
                        {view.radar.items.map((item) => (
                          <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold"><Pill tone={item.tag === "recheck" ? "gap" : "neutral"}>{radarTagWords[item.tag]}</Pill>{item.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                              {item.topicId ? <Link href={engineering.topic(item.topicId, "check")} className="text-sm underline underline-offset-4">Re-check</Link>
                                : item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">Source<ExternalLink size={12} aria-hidden="true" /></a>}
                            </div>
                            <Button size="icon" variant="ghost" aria-label={`Dismiss ${item.title}`} onClick={() => void run(item.id, () => post("/api/lab/profile", { action: "dismissRadar", id: item.id }))}><X size={15} aria-hidden="true" /></Button>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-4 text-sm text-muted-foreground">Nothing flagged</p>}
                  </>
                )}

                {pane === "assessments" && (
                  <>
                    <p className="text-sm text-muted-foreground">Every question, answer and grade</p>
                    <ul className="mt-3 divide-y divide-border border-y border-border text-sm">
                      {view.baseline.runId && (
                        <li className="flex justify-between gap-3 py-3">
                          <Link href={view.baseline.completedAt ? engineering.results(view.baseline.runId) : engineering.assessment({ run: view.baseline.runId })} className="font-semibold underline underline-offset-4">Baseline</Link>
                          <span className="text-muted-foreground">{view.baseline.completedAt ? `Finished ${formatDay(view.baseline.completedAt)}` : "In progress"}</span>
                        </li>
                      )}
                      {view.checkpoint.done.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3 py-3">
                          <Link href={engineering.results(item.id)} className="font-semibold underline underline-offset-4">Checkpoint</Link>
                          <span className="text-muted-foreground">Finished {formatDay(item.completedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {pane === "definitions" && (
                  <div className="grid gap-6 text-sm leading-6 md:grid-cols-2">
                    <div>
                      <p className="font-semibold">Developer</p><p>{view.careers.definitions.developer}</p>
                      <p className="mt-4 font-semibold">Engineer</p><p>{view.careers.definitions.engineer}</p>
                    </div>
                    <ul className="space-y-3">
                      {view.careers.levels.map((level) => (
                        <li key={level.id}>
                          <p className="font-semibold">{level.title}</p>
                          <p>{level.summary}</p>
                          <p className="text-muted-foreground">Based on {level.sources.map((id) => {
                            const source = view.careers.sources.find((item) => item.id === id)!;
                            return <a key={id} href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.title}</a>;
                          })}</p>
                        </li>
                      ))}
                    </ul>
                    <p className="text-muted-foreground md:col-span-2">{view.careers.status === "draft" ? "Draft · not approved" : `Approved ${view.careers.approvedOn}`} · {view.careers.note}</p>
                  </div>
                )}
              </TabsContent>
              </Tabs>
            </section>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
