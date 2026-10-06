import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Panel, Stat, TitleBar } from "@/components/lab/panel";
import { depthWords, levelWords, radarTagWords, statusWords, toneFor } from "@/components/lab/words";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import type { NextRequirement } from "@/features/engineering-lab/capabilities";
import { findTopic, topicMap } from "@/features/engineering-lab/curriculum";
import type { DailyView } from "@/features/engineering-lab/daily";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { engineering } from "@/features/engineering-lab/routes";
import type { NextStep } from "@/features/engineering-lab/steps";
import type { TodayView } from "@/features/engineering-lab/store";

// Overview: one next action, decided by the Planner (a due review comes first when there is one), then practice, the
// next requirement, radar and the road ahead. Design: docs/architecture/engineering-redesign.md.

const kindHeading = { review: "Review", continue: "Continue", prerequisite: "Prerequisite first", new: "Up next" } as const;

function NextAction({ today, next, profile }: { today: TodayView; next: NextStep | null; profile: ProfileView }) {
  if (profile.baseline.state !== "done") {
    const started = profile.baseline.state === "in_progress";
    return (
      <Panel title={started ? "Baseline · In progress" : "Baseline · Not started"} className="border-foreground">
        <p className="font-display text-lg font-semibold">{started ? "Continue the baseline" : "Take the baseline"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Intro, then closed-book questions by chapter. Pause between chapters</p>
        <details className="group mt-2 max-w-[680px] text-sm">
          <DisclosureSummary className="text-muted-foreground">How this works</DisclosureSummary>
          <ol className="mt-2 space-y-1 pl-6 leading-6">
            <li>1. Intro: what you build, what you use, hours a week. Never graded</li>
            <li>2. Assessment: chapter by chapter, no timer, topics you&apos;ve proven are skipped</li>
            <li>3. Profile: a level per area, then a direction</li>
          </ol>
        </details>
        <Button asChild className="mt-4">
          <Link href={engineering.assessment()}>{started ? "Continue baseline" : profile.intake ? "Start baseline" : "Start intro"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Link>
        </Button>
      </Panel>
    );
  }
  if (profile.checkpoint.inProgressRunId) {
    return (
      <Panel title="Checkpoint · In progress" className="border-foreground">
        <Button asChild><Link href={engineering.assessment({ run: profile.checkpoint.inProgressRunId })}>Continue checkpoint</Link></Button>
      </Panel>
    );
  }
  const plan = today.plan;
  const topic = plan ? findTopic(plan.topicId) : undefined;
  if (!plan || !topic || !next) return <Panel title="All caught up"><p className="text-sm text-muted-foreground">Nothing due</p></Panel>;
  const index = next.steps.findIndex((step) => step.id === next.suggested);
  const step = next.steps[index];
  return (
    <Panel title={kindHeading[plan.kind]} meta={`${next.place.track} · Chapter ${next.place.chapterNumber}`} className="border-foreground">
      <p className="font-display text-xl font-semibold">{topic.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">Step {index + 1} of {next.steps.length} · {step.label} · {step.detail}</p>
      <p className="mt-2 max-w-[680px] text-sm leading-6">{plan.reason}</p>
      <Button asChild className="mt-4">
        <Link href={engineering.topic(topic.id, next.suggested)}>{plan.kind === "new" && index === 0 ? "Start" : "Continue"}: {step.label}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Link>
      </Button>
    </Panel>
  );
}

function PracticeCard({ daily, closed }: { daily: DailyView | null; closed: boolean }) {
  const questions = daily?.items.filter((item) => item.type === "question") ?? [];
  const answered = questions.filter((item) => item.answered).length;
  const state = closed ? "Paused during the assessment" : !daily ? "Not started · ~15 min" : daily.done ? "Done" : `${answered} of ${questions.length} answered`;
  return (
    <Panel title="Today's practice">
      <p className="text-sm text-muted-foreground">{state}{daily?.warmUp && !closed ? " · Warm-up" : ""}</p>
      {!closed && (
        <Button asChild size="sm" variant={daily?.done ? "outline" : "default"} className="mt-3">
          <Link href={engineering.practice}>{!daily ? "Start practice" : daily.done ? "Review answers" : "Continue practice"}</Link>
        </Button>
      )}
    </Panel>
  );
}

function MilestoneCard({ next, profile }: { next: NextRequirement | null; profile: ProfileView }) {
  if (profile.baseline.state !== "done") return null;
  return (
    <Panel title="Next milestone" meta={next ? levelWords(next.requirement.level) : undefined}>
      {next ? (
        <>
          <p className="text-sm"><span className="font-semibold">{next.requirement.title}</span><span className="text-muted-foreground"> · {depthWords[next.requirement.need]}</span></p>
          <p className="mt-1 text-xs text-muted-foreground">{next.areaTitle} · {next.requirement.missing.length === 1 ? "1 topic left" : `${next.requirement.missing.length} topics left`}</p>
        </>
      ) : <p className="text-sm text-muted-foreground">Direction complete</p>}
      <Link href={engineering.profile} className="mt-3 inline-block text-sm underline underline-offset-4">Profile</Link>
    </Panel>
  );
}

function RadarCard({ profile }: { profile: ProfileView }) {
  const radar = profile.radar.items[0];
  const empty = !profile.direction ? "Starts after you choose a direction" : profile.radar.checked ? "Nothing flagged this week" : "Not scanned this week";
  return (
    <Panel title="Radar">
      {radar ? (
        <>
          <p className="text-sm leading-5"><Pill tone={radar.tag === "recheck" ? "gap" : "neutral"} className="mr-1.5 align-middle">{radarTagWords[radar.tag]}</Pill>{radar.title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{radar.reason}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 text-sm">
            {radar.topicId ? <Link href={engineering.topic(radar.topicId, "check")} className="underline underline-offset-4">Re-check</Link>
              : radar.sourceUrl && <a href={radar.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">Source<ExternalLink size={12} aria-hidden="true" /></a>}
            <Link href={engineering.direction("radar")} className="text-muted-foreground underline-offset-4 hover:underline">All</Link>
          </div>
        </>
      ) : <p className="text-sm text-muted-foreground">{empty}</p>}
    </Panel>
  );
}

function PathPanel({ profile }: { profile: ProfileView }) {
  if (profile.baseline.state !== "done") return null;
  const chosen = profile.roles.find((role) => role.roleId === profile.direction);
  const stages = profile.roadmap.slice(0, 3);
  const weeks = profile.roadmap.at(-1)?.doneByWeek ?? 0;
  return (
    <Panel className="mt-4" title="Path" meta={chosen && profile.roadmap.length ? `${profile.roadmap.length} stages · ~${weeks} weeks at ${profile.pace.weeklyHours} h/week · Estimate` : undefined} bodyClassName={stages.length ? "p-0" : undefined}>
      {!chosen ? (
        <p className="text-sm text-muted-foreground">No direction yet <Link href={engineering.direction()} className="ml-2 underline underline-offset-4">Choose direction</Link></p>
      ) : !stages.length ? <p className="text-sm text-muted-foreground">Direction complete</p> : (
        <ol className="divide-y divide-border">
          {stages.map((stage) => (
            <li key={`${stage.chapter}-${stage.need}`} className="px-4 py-3">
              <p className="text-sm"><span className="font-semibold">{stage.title}</span><span className="text-muted-foreground"> · {depthWords[stage.need]} · Week {stage.doneByWeek}</span></p>
              {stage.topics.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {stage.topics.map((topic) => (
                    <li key={topic.topicId}>
                      <Link href={engineering.topic(topic.topicId)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                        {topic.title}<span className="text-muted-foreground">· {topic.known && topic.status !== "VALIDATED" ? "Known" : statusWords[topic.status]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
      {stages.length > 0 && <Link href={engineering.learn} className="block border-t border-border px-4 py-2.5 text-sm underline-offset-4 hover:underline">All chapters</Link>}
    </Panel>
  );
}

export function EngineeringOverview({ email, today, next, profile, daily, nextRequirement, closedBook = false }: {
  email: string; today: TodayView; next: NextStep | null; profile: ProfileView; daily: DailyView | null; nextRequirement: NextRequirement | null; closedBook?: boolean;
}) {
  const chosen = profile.roles.find((role) => role.roleId === profile.direction);
  const proven = today.progress.filter((item) => item.status === "VALIDATED").length;
  const reviews = today.reviewsDue.filter((id) => id !== today.plan?.topicId);
  return (
    <WorkspaceShell email={email} active="lab" tab="overview" termLookup={!closedBook}>
      <div className="w-full px-5 py-6 sm:px-8">
        <TitleBar
          title="Overview"
          stats={<>
            {profile.baseline.state === "done" && <Stat label="Direction" value={chosen?.title ?? "None yet"} />}
            {profile.baseline.state === "done" && chosen && <Stat label="Level" value={levelWords(chosen.overall)} />}
            <Stat label="Proven" value={`${proven} of ${topicMap.topics.length}`} />
            <Stat label="AI uses" value={`${today.generationsUsed} of ${today.generationLimit}`} />
          </>}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <NextAction today={today} next={next} profile={profile} />
          <div className="space-y-4">
            <PracticeCard daily={daily} closed={closedBook} />
            <MilestoneCard next={nextRequirement} profile={profile} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Panel title="Reviews due" meta={String(reviews.length)} bodyClassName={reviews.length ? "p-0" : undefined}>
            {reviews.length ? (
              <ul className="divide-y divide-border">
                {reviews.map((id) => {
                  const item = today.progress.find((entry) => entry.topicId === id)!;
                  return (
                    <li key={id}>
                      <Link href={engineering.topic(id, "check")} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/60">
                        <span className="text-sm font-semibold">{findTopic(id)?.title ?? id}</span>
                        <Pill tone={toneFor(item.status)}>{item.status === "NEEDS_REVISIT" ? statusWords.NEEDS_REVISIT : "Review due"}</Pill>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nothing else due</p>}
          </Panel>
          <RadarCard profile={profile} />
        </div>

        <PathPanel profile={profile} />
      </div>
    </WorkspaceShell>
  );
}
