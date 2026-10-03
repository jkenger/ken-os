"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { Question, type AnswerPayload, type AssessmentView } from "../topic/answers";
import { post } from "../topic/client";
import { depthWords, label, levelWords, radarTagWords } from "../words";
import { GuideChat, type GuideProposals } from "./guide-chat";
import { LevelBars, LevelKey } from "./pictures";

// The profile's own page: pick a direction with the Guide, read the definitions, manage added chapters, the radar,
// and see how you were assessed. Design: docs/architecture/engineering-lab-profile.md, sections 2, 3, 5 and 7.

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
      toast({ tone: "error", title: "That didn't work", description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy("");
    }
  }
  return { busy, run };
}

function Section({ id, title, children, intro }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 scroll-mt-24" id={id} aria-labelledby={`${id}-title`}>
      <h2 className="font-display text-2xl font-semibold tracking-[-0.04em]" id={`${id}-title`}>{title}</h2>
      {intro && <p className="mt-2 max-w-[720px] text-[15px] leading-6 text-muted-foreground">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AddedChapterScreen({ chapter }: { chapter: ProfileView["addedChapters"][number] }) {
  const router = useRouter();
  const next = chapter.next!;
  const view: AssessmentView = {
    id: next.id, kind: "screen", createdAt: chapter.addedAt,
    items: Array.from({ length: next.itemIndex + 1 }, (_, index) => index === next.itemIndex ? { ...next.item, answered: null } : { mode: next.item.mode, prompt: "", code: null, answered: null }) as AssessmentView["items"],
  };
  const submitTo = (payload: AnswerPayload) => post("/api/lab/screens", { screenId: next.id, text: payload.text ?? "", selfRating: payload.selfRating });
  return <Question key={next.id} assessment={view} index={next.itemIndex} heading={`${chapter.title.toUpperCase()} · QUESTION ${next.itemIndex + 1} OF 2`} submitTo={submitTo} onDone={() => router.refresh()} />;
}

export function LabProfile({ email, view }: { email: string; view: ProfileView }) {
  const { busy, run } = useAction();
  const [proposals, setProposals] = useState<GuideProposals>({ intake: null, direction: null, addChapters: [] });
  const baselineDone = view.baseline.state === "done";
  const chosen = view.roles.find((role) => role.roleId === view.direction);
  const targets = Object.fromEntries(chosen?.areas.map((area) => [area.area, area.target]) ?? []);
  const proposedRole = view.roles.find((role) => role.roleId === proposals.direction);
  const chapterTitle = (id: string) => view.roadmap.find((step) => step.chapter === id)?.title ?? id;

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] border-x border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <p className={label}>ENGINEERING LAB · PROFILE</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">{chosen ? chosen.title : "What do you want to become?"}</h1>
        <p className="mt-3 max-w-[720px] text-[15px] leading-6 text-muted-foreground">A direction, not a lock. Change it whenever your goals change; your baseline stays where it is and the roadmap redraws.</p>

        {!baselineDone ? (
          <p className="mt-8 rounded-xl border border-foreground p-6 text-[15px]">Your shape comes from the baseline, so the direction talk comes after it. <Link href="/lab/assessment" className="font-semibold underline underline-offset-4">{view.baseline.state === "in_progress" ? "Continue the baseline" : "Start the baseline"}</Link>.</p>
        ) : (
          <Section id="direction" title="Pick a direction" intro="Talk it through with the Guide. It only uses your real numbers, and it suggests rather than decides: you confirm every change here.">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <GuideChat
                phase="direction" history={view.conversation}
                opener="Here's your shape from the baseline. Tell me what you want to build over the next year, and I'll walk you through which roles fit and what each would take."
                onProposals={(next) => setProposals((current) => ({ ...next, addChapters: [...current.addChapters, ...next.addChapters].slice(-3) }))}
              />
              <div className="space-y-4">
                {proposedRole && proposedRole.roleId !== view.direction && (
                  <div className="rounded-xl border border-foreground p-5">
                    <p className={label}>THE GUIDE SUGGESTS</p>
                    <p className="mt-2 text-[15px] font-semibold">{proposedRole.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{proposedRole.missing.length} chapters away. You&apos;re {levelWords(proposedRole.overall).toLowerCase()} for it now.</p>
                    <Button className="mt-3" disabled={Boolean(busy)} onClick={() => void run("direction", () => post("/api/lab/profile", { action: "direction", roleId: proposedRole.roleId }), "Direction set")}>Make it my direction</Button>
                  </div>
                )}
                {proposals.addChapters.map((chapter) => (
                  <div key={chapter.title} className="rounded-xl border border-border p-5">
                    <p className={label}>SUGGESTED NEW CHAPTER</p>
                    <p className="mt-2 text-[15px] font-semibold">{chapter.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{chapter.reason}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" disabled={Boolean(busy)} onClick={() => void run(chapter.title, async () => { await post("/api/lab/profile", { action: "addChapter", chapter }); setProposals((current) => ({ ...current, addChapters: current.addChapters.filter((item) => item.title !== chapter.title) })); }, "Chapter added, unwritten")}>Add it</Button>
                      <Button size="sm" variant="ghost" onClick={() => setProposals((current) => ({ ...current, addChapters: current.addChapters.filter((item) => item.title !== chapter.title) }))}>No thanks</Button>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-border p-5">
                  <p className={cn(label, "mb-3")}>OR CHOOSE YOURSELF</p>
                  <ul className="space-y-2">
                    {[...view.roles].sort((a, b) => a.missing.length - b.missing.length).map((role) => (
                      <li key={role.roleId} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{role.title}</p>
                          <p className="text-sm text-muted-foreground">{role.missing.length ? `${role.missing.length} chapters away` : "All there"} · {levelWords(role.overall).toLowerCase()} now</p>
                        </div>
                        {role.roleId === view.direction
                          ? <Pill tone="solid">Your direction</Pill>
                          : <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void run(role.roleId, () => post("/api/lab/profile", { action: "direction", roleId: role.roleId }), "Direction set")}>Choose</Button>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Section>
        )}

        {baselineDone && (
          <Section id="levels" title="Where you are">
            <div className="rounded-xl border border-border p-5"><LevelBars areas={view.areas} targets={targets} /><div className="mt-3"><LevelKey /></div></div>
            {chosen && chosen.missing.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Still needed for {chosen.title.toLowerCase()}: {chosen.missing.map((item) => `${chapterTitle(item.chapter)} (${depthWords[item.need].toLowerCase()})`).join(", ")}.</p>
            )}
          </Section>
        )}

        {view.addedChapters.length > 0 && (
          <Section id="added" title="Chapters you added" intro="They join the outline unwritten. Each gets two short screening questions of its own, so the roadmap knows where you start. Your baseline never moves.">
            <ul className="space-y-4">
              {view.addedChapters.map((chapter) => (
                <li key={chapter.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold">{chapter.title}</p>
                    <Pill tone={chapter.screened ? "neutral" : "quiet"}>{chapter.screened ? `${depthWords[chapter.depth as keyof typeof depthWords]} · estimate` : "Not assessed yet"}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{chapter.reason}</p>
                  {!chapter.started && <Button size="sm" className="mt-3" disabled={Boolean(busy)} onClick={() => void run(chapter.id, () => post("/api/lab/screens/added", { chapterId: chapter.id }))}>{busy === chapter.id ? "Writing questions..." : "Assess this chapter"}</Button>}
                  {chapter.next && <div className="mt-4"><AddedChapterScreen chapter={chapter} /></div>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section id="radar" title="Your radar" intro="Once a week it checks official docs, release notes and changelogs for your direction's areas, and flags at most five things. A proven topic whose facts changed gets a re-check flag on its own.">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled={!view.direction || view.radar.checked || Boolean(busy)} onClick={() => void run("radar", () => post("/api/lab/radar"), "Radar updated")}>
              {busy === "radar" ? "Scanning..." : view.radar.checked ? `Scanned this week (${view.radar.week})` : "Scan this week"}
            </Button>
            {!view.direction && <p className="text-sm text-muted-foreground">Pick a direction first.</p>}
          </div>
          {view.radar.items.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {view.radar.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold"><Pill tone={item.tag === "recheck" ? "gap" : "neutral"}>{radarTagWords[item.tag]}</Pill>{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                    {item.topicId ? <Link href={`/lab/topics/${item.topicId}?step=check`} className="text-sm underline underline-offset-4">Re-check it</Link>
                      : item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">Source<ExternalLink size={12} aria-hidden="true" /></a>}
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Dismiss ${item.title}`} onClick={() => void run(item.id, () => post("/api/lab/profile", { action: "dismissRadar", id: item.id }))}><X size={15} aria-hidden="true" /></Button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-muted-foreground">Nothing on the radar right now.</p>}
        </Section>

        <Section id="assessed" title="How this was assessed" intro="Every question, answer and grade is saved, with the prompt versions and model, so any level here can be checked.">
          <ul className="space-y-2 text-sm">
            {view.baseline.runId && (
              <li><Link href={`/lab/assessment?run=${view.baseline.runId}`} className="font-semibold underline underline-offset-4">Baseline</Link> <span className="text-muted-foreground">{view.baseline.completedAt ? `finished ${new Date(view.baseline.completedAt).toLocaleDateString("en", { month: "long", day: "numeric" })}` : "in progress"}</span></li>
            )}
            {view.checkpoint.done.map((item) => (
              <li key={item.id}><Link href={`/lab/assessment?run=${item.id}`} className="font-semibold underline underline-offset-4">Checkpoint</Link> <span className="text-muted-foreground">finished {new Date(item.completedAt).toLocaleDateString("en", { month: "long", day: "numeric" })}</span></li>
            ))}
            {!view.baseline.runId && <li className="text-muted-foreground">No assessment yet.</li>}
          </ul>
          {baselineDone && (
            view.checkpoint.inProgressRunId
              ? <Button asChild variant="outline" className="mt-4"><Link href={`/lab/assessment?run=${view.checkpoint.inProgressRunId}`}>Continue your checkpoint</Link></Button>
              : <Button asChild variant="outline" className="mt-4"><Link href="/lab/assessment?new=1">Take a checkpoint</Link></Button>
          )}
        </Section>

        <Section id="definitions" title="What the levels and roles mean" intro={view.careers.status === "draft" ? "These definitions are a draft that you haven't approved yet. Read them before trusting a level." : `Approved on ${view.careers.approvedOn}.`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-5 text-sm leading-6">
              <p className={label}>DEVELOPER</p><p className="mt-1">{view.careers.definitions.developer}</p>
              <p className={cn(label, "mt-4")}>ENGINEER</p><p className="mt-1">{view.careers.definitions.engineer}</p>
            </div>
            <ul className="space-y-3 rounded-xl border border-border p-5 text-sm leading-6">
              {view.careers.levels.map((level) => (
                <li key={level.id}>
                  <p className="font-semibold">{level.title}</p>
                  <p>{level.summary}</p>
                  <p className="text-muted-foreground">Based on: {level.sources.map((id) => {
                    const source = view.careers.sources.find((item) => item.id === id)!;
                    return <a key={id} href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.title}</a>;
                  })}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{view.careers.note}</p>
        </Section>
      </div>
    </WorkspaceShell>
  );
}
