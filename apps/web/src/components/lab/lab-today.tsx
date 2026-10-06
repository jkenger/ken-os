import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import { findTopic, topicMap } from "@/features/engineering-lab/curriculum";
import type { DailyView } from "@/features/engineering-lab/daily";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import type { NextStep } from "@/features/engineering-lab/steps";
import type { TodayView } from "@/features/engineering-lab/store";
import { cn } from "@/lib/utils";
import { Panel, Stat, TitleBar } from "./panel";
import { RoadRail } from "./profile/road-rail";
import { Skyline } from "./profile/skyline";
import { formatDate, levelWords, radarTagWords, statusWords, toneFor } from "./words";
import { engineering } from "@/features/engineering-lab/routes";

// The lab home, in the lab's tight bordered layout (panel.tsx). Before the baseline: how to start it. After: your
// shape beside a Today panel, the road ahead as a rail, then roles, reviews and changes. Chosen on 2026-10-03.
// Design: docs/architecture/engineering-lab-profile.md, section 5.

const kindHeading = { review: "Review", continue: "Continue", prerequisite: "Prerequisite first", new: "Up next" } as const;

function chapterTitle(id: string, profile: ProfileView) {
  return topicMap.modules.find((module) => module.id === id)?.title ?? profile.addedChapters.find((chapter) => chapter.id === id)?.title ?? id;
}

/** Before the baseline exists, the home shows one thing: how to start it. */
function StartPanel({ profile }: { profile: ProfileView }) {
  const started = profile.baseline.state === "in_progress";
  return (
    <Panel title={started ? "Baseline · In progress" : "Baseline · Not started"} className="border-foreground">
      <p className="text-sm">Intro (~5 min), then up to ~54 questions. Pause between chapters</p>
      <details className="group mt-2 max-w-[680px] text-sm">
        <DisclosureSummary className="text-muted-foreground">How this works</DisclosureSummary>
        <ol className="mt-2 space-y-1 pl-6 leading-6">
          <li>1. Intro: what you build, what you use, hours a week</li>
          <li>2. Assessment: closed-book, chapter by chapter</li>
          <li>3. Profile: your level per area, distance to each role, roadmap</li>
        </ol>
      </details>
      <Button asChild className="mt-4">
        <Link href={engineering.assessment()}>{started ? "Continue baseline" : profile.intake ? "Start baseline" : "Start intro"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Link>
      </Button>
    </Panel>
  );
}

function ContinuePanel({ today, next }: { today: TodayView; next: NextStep | null }) {
  const plan = today.plan;
  const topic = plan ? findTopic(plan.topicId) : undefined;
  if (!plan || !topic || !next) return <Panel title="All caught up"><p className="text-sm">Nothing due. New chapters coming</p></Panel>;
  const index = next.steps.findIndex((step) => step.id === next.suggested);
  const step = next.steps[index];
  return (
    <Panel title={kindHeading[plan.kind]} meta={`${next.place.track}, chapter ${next.place.chapterNumber}`}>
      <p className="font-display text-lg font-semibold">{topic.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">Step {index + 1} of {next.steps.length}: {step.label}, {step.detail.toLowerCase()}</p>
      <p className="mt-2 max-w-[680px] text-sm leading-6">{plan.reason}</p>
      <Button asChild className="mt-3"><Link href={engineering.topic(topic.id, next.suggested)}>{plan.kind === "new" && index === 0 ? "Start" : "Continue"}: {step.label}</Link></Button>
    </Panel>
  );
}

/** Today, beside the skyline: practice first, then where you left off, then one radar item. */
function TodayPanel({ today, next, daily, profile }: { today: TodayView; next: NextStep | null; daily: DailyView | null; profile: ProfileView }) {
  const questions = daily?.items.filter((item) => item.type === "question") ?? [];
  const answered = questions.filter((item) => item.answered).length;
  const practice = !daily
    ? "~15 min"
    : daily.done ? "Done" : `${answered} of ${questions.length} answered${daily.items.some((item) => item.type === "lab") ? " · 1 lab fix" : ""}`;
  const topic = today.plan ? findTopic(today.plan.topicId) : undefined;
  const step = next?.steps.find((item) => item.id === next.suggested);
  const radar = profile.radar.items[0];
  const radarEmpty = !profile.direction ? "Starts after you choose a direction" : profile.radar.checked ? "Nothing flagged" : "Not scanned this week";
  return (
    <Panel title="Today" bodyClassName="p-0">
      <div className="divide-y divide-border">
        <section className="p-4" aria-labelledby="practice-title">
          <h3 className="text-sm font-semibold" id="practice-title">Practice</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{practice}{daily?.warmUp ? " · Warm-up until your first topic is proven" : ""}</p>
          <Button asChild size="sm" variant={daily?.done ? "outline" : "default"} className="mt-3">
            <Link href={engineering.practice}>{!daily ? "Start practice" : daily.done ? "Review answers" : "Continue practice"}</Link>
          </Button>
        </section>
        <section className="p-4" aria-labelledby="continue-title">
          <h3 className="text-sm font-semibold" id="continue-title">{today.plan ? kindHeading[today.plan.kind] : "Continue"}</h3>
          {topic && step ? (
            <>
              <p className="mt-1 text-sm leading-5"><span className="font-semibold">{topic.title}</span><span className="text-muted-foreground"> · {step.label}</span></p>
              <Button asChild size="sm" variant="outline" className="mt-3"><Link href={engineering.topic(topic.id, next!.suggested)}>{step.label}</Link></Button>
            </>
          ) : <p className="mt-1 text-sm leading-5 text-muted-foreground">Nothing due. New chapters coming</p>}
        </section>
        <section className="p-4" aria-labelledby="radar-title">
          <h3 className="text-sm font-semibold" id="radar-title">Radar</h3>
          {radar ? (
            <>
              <p className="mt-1 text-sm leading-5"><Pill tone={radar.tag === "recheck" ? "gap" : "neutral"} className="mr-1.5 align-middle">{radarTagWords[radar.tag]}</Pill>{radar.title}</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{radar.reason}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 text-sm">
                {radar.topicId ? <Link href={engineering.topic(radar.topicId, "check")} className="underline underline-offset-4">Re-check</Link>
                  : radar.sourceUrl && <a href={radar.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">Source<ExternalLink size={12} aria-hidden="true" /></a>}
                <Link href={engineering.direction("radar")} className="text-muted-foreground underline-offset-4 hover:underline">All</Link>
              </div>
            </>
          ) : <p className="mt-1 text-sm leading-5 text-muted-foreground">{radarEmpty}</p>}
        </section>
      </div>
    </Panel>
  );
}

function ProfileHome({ today, next, daily, profile }: { today: TodayView; next: NextStep | null; daily: DailyView | null; profile: ProfileView }) {
  const chosen = profile.roles.find((role) => role.roleId === profile.direction);
  const targets = Object.fromEntries(chosen?.areas.map((area) => [area.area, area.target]) ?? []);
  const weeks = profile.roadmap.at(-1)?.doneByWeek ?? 0;
  const roles = [...profile.roles].sort((a, b) => a.missing.length - b.missing.length);
  const chosenMissing = new Set(chosen?.missing.map((item) => item.chapter) ?? []);
  return (
    <>
      {profile.careers.status === "draft" && (
        <p className="mt-4 rounded-md border border-border px-4 py-2.5 text-sm">
          Role definitions · Draft <Link href={engineering.direction("definitions")} className="ml-2 underline underline-offset-4">Review</Link>
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Where you are" meta={chosen ? `Red line: what ${chosen.title} needs` : "Each column is an area, junior to senior"}>
          <Skyline areas={profile.areas} targets={targets} compact />
        </Panel>
        <TodayPanel today={today} next={next} daily={daily} profile={profile} />
      </div>

      <Panel className="mt-4" title="Roadmap" id="road-title"
        meta={chosen && profile.roadmap.length ? `${profile.roadmap.length} stages · ~${weeks} weeks at ${profile.pace.weeklyHours} h/week${profile.pace.source === "history" ? " · paced from your history" : ""}` : undefined}>
        {chosen ? (
          profile.roadmap.length
            ? <RoadRail steps={profile.roadmap} weeklyHours={profile.pace.weeklyHours} />
            : <p className="text-sm text-muted-foreground">Direction complete <Link href={engineering.direction("roles")} className="ml-2 underline underline-offset-4">Choose direction</Link> <Link href={engineering.assessment({ new: true })} className="ml-2 underline underline-offset-4">Start checkpoint</Link></p>
        ) : <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">No direction yet</span> · Choose one to see the chapters it needs <Link href={engineering.direction()} className="ml-2 underline underline-offset-4">Ask the Guide</Link></p>}
      </Panel>

      <Panel className="mt-4" title="Roles" meta={<Link href={engineering.direction("roles")} className="underline-offset-4 hover:underline">Compare and choose</Link>} bodyClassName="p-0">
        <ul className="divide-y divide-border text-sm">
          {roles.map((role) => {
            const isChosen = role.roleId === profile.direction;
            const shared = chosen && !isChosen ? role.missing.filter((item) => chosenMissing.has(item.chapter)).length : 0;
            return (
              <li key={role.roleId} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4">
                <span className={cn(isChosen && "font-semibold")}>
                  {role.title}{isChosen && <span className="ml-2 text-xs text-muted-foreground">Direction</span>}
                  <span className="block text-muted-foreground sm:inline sm:before:content-['_']">
                    {levelWords(role.overall).toLowerCase()} now{shared ? ` · ${shared} shared with direction` : ""}{role.missing.length > 0 && role.missing.length <= 3 ? ` · missing ${role.missing.map((item) => chapterTitle(item.chapter, profile)).join(", ")}` : ""}
                  </span>
                </span>
                <span className="text-muted-foreground">{role.missing.length ? `${role.missing.length} chapters away` : "Ready"}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

export function LabToday({ email, today, next, profile, daily }: { email: string; today: TodayView; next: NextStep | null; profile: ProfileView; daily: DailyView | null }) {
  const baselineDone = profile.baseline.state === "done";
  const weak = today.progress.filter((item) => item.weaknesses.length > 0 && item.status !== "VALIDATED").slice(0, 4);
  const proven = today.progress.filter((item) => item.status === "VALIDATED").length;
  const reviews = today.reviewsDue.filter((id) => id !== today.plan?.topicId);
  const chosen = profile.roles.find((role) => role.roleId === profile.direction);

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="w-full px-5 py-6 sm:px-8">
        <TitleBar
          title="Today"
          stats={<>
            {baselineDone && <Stat label="Direction" value={chosen?.title ?? "None yet"} />}
            {baselineDone && chosen && <Stat label="Level" value={levelWords(chosen.overall)} />}
            <Stat label="Proven" value={`${proven} of ${topicMap.topics.length}`} />
          </>}
          actions={baselineDone ? <Button asChild size="sm" variant="outline"><Link href={engineering.direction()}>Choose direction</Link></Button> : undefined}
        />

        {baselineDone ? <ProfileHome today={today} next={next} daily={daily} profile={profile} /> : (
          <div className="mt-4 space-y-4">
            <StartPanel profile={profile} />
            <ContinuePanel today={today} next={next} />
          </div>
        )}

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

          <Panel title="Misconceptions">
            {weak.length ? (
              <ul className="space-y-3 text-sm">
                {weak.map((item) => (
                  <li key={item.topicId}>
                    <Link href={engineering.topic(item.topicId)} className="font-semibold underline-offset-4 hover:underline">{findTopic(item.topicId)?.title}</Link>
                    <p className="text-muted-foreground">{item.weaknesses[0]}{item.weaknesses.length > 1 ? ` (+${item.weaknesses.length - 1} more)` : ""}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">None open</p>}
          </Panel>
        </div>

        <Panel className="mt-4" title="Recent changes" meta={`AI uses today · ${today.generationsUsed} of ${today.generationLimit}`} bodyClassName={today.recentChanges.length ? "p-0" : undefined}>
          {today.recentChanges.length ? (
            <ul className="divide-y divide-border text-sm">
              {today.recentChanges.map((change, index) => (
                <li key={index} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span><span className="font-semibold">{findTopic(change.topicId)?.title}</span> <span className="text-muted-foreground">({change.reason})</span></span>
                  <span className="flex items-center gap-2"><Pill tone={toneFor(change.to)}>{statusWords[change.to as keyof typeof statusWords]}</Pill><span className="text-muted-foreground">{formatDate(change.at)}</span></span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No changes yet · {profile.baseline.completedAt ? `Starting point: baseline, ${formatDate(profile.baseline.completedAt)}` : "Starting point: baseline"}</p>}
        </Panel>
      </div>
    </WorkspaceShell>
  );
}
