import Link from "next/link";
import { IconArrowRight, IconChevronRight, IconExternalLink } from "@tabler/icons-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { depthWords, radarTagWords, statusWords } from "@/components/lab/words";
import { findTopic } from "@/features/engineering-lab/curriculum";
import type { DailyView } from "@/features/engineering-lab/daily";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { engineering } from "@/features/engineering-lab/routes";
import type { NextStep } from "@/features/engineering-lab/steps";
import type { TodayView } from "@/features/engineering-lab/store";
import { cn } from "@/lib/utils";
import { RadarDialog } from "./radar";
import { Badge, eyebrow, PageHeading, panel, SectionTitle } from "./kit";
import { Button } from "@/components/ui/button";

// Overview, one to one with the selected 2026-10-06 prototype: one dominant next action decided by the Planner (a due
// review outranks new work), today's practice beside it, then the path, reviews and radar as lists.
// "From your projects" (knowledge debt) is deferred until real use validates the loop, as the handoff says.

const kindEyebrow = { review: "Review", continue: "Continue", prerequisite: "Prerequisite first", new: "Up next" } as const;
const row = "flex w-full flex-wrap items-center gap-3 border-t border-border py-4 text-left text-xs hover:bg-muted/50 md:flex-nowrap md:gap-5 md:text-sm";

function NextAction({ today, next, profile }: { today: TodayView; next: NextStep | null; profile: ProfileView }) {
  const shell = cn(panel, "p-6 md:p-7");
  if (profile.baseline.state !== "done") {
    const started = profile.baseline.state === "in_progress";
    return (
      <section className={shell}>
        <div className={eyebrow}>{started ? "Baseline · In progress" : "Establish your profile"}</div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{started ? "Continue the baseline" : "Take the baseline"}</h2>
        <div className="my-5 flex flex-wrap gap-6 text-xs text-muted-foreground"><span>Intro, then closed-book questions</span><span>13 chapters · No timer · Pause between chapters</span></div>
        <Button asChild><Link href={engineering.assessment()}>{started ? "Resume assessment" : profile.intake ? "Start baseline" : "Establish profile"}<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
      </section>
    );
  }
  if (profile.checkpoint.inProgressRunId) {
    return (
      <section className={shell}>
        <div className={eyebrow}>Checkpoint · In progress</div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Continue the checkpoint</h2>
        <Button asChild className="mt-5"><Link href={engineering.assessment({ run: profile.checkpoint.inProgressRunId })}>Resume assessment<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
      </section>
    );
  }
  const plan = today.plan;
  const topic = plan ? findTopic(plan.topicId) : undefined;
  if (!plan || !topic || !next) {
    return <section className={shell}><div className={eyebrow}>All caught up</div><h2 className="text-2xl font-bold tracking-tight md:text-3xl">Nothing due</h2></section>;
  }
  const index = next.steps.findIndex((step) => step.id === next.suggested);
  const step = next.steps[index];
  return (
    <section className={shell}>
      <div className={eyebrow}>{kindEyebrow[plan.kind]}</div>
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{topic.title}</h2>
      <p className="mb-4 mt-1.5 max-w-2xl text-sm leading-normal text-muted-foreground md:text-base">{plan.reason}</p>
      <div className="my-5 flex flex-wrap gap-6 text-xs text-muted-foreground">
        <span>Step {index + 1} of {next.steps.length} · {step.label}</span>
        <span>{next.place.track} · Chapter {next.place.chapterNumber}</span>
      </div>
      <Button asChild><Link href={engineering.topic(topic.id, next.suggested)}>{plan.kind === "new" && index === 0 ? "Start learning" : "Continue learning"}<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
    </section>
  );
}

function PracticePanel({ daily, closed }: { daily: DailyView | null; closed: boolean }) {
  const questions = daily?.items.filter((item) => item.type === "question") ?? [];
  const left = questions.filter((item) => !item.answered).length;
  const title = closed ? "Paused" : !daily ? "Not started" : daily.done ? "Practice complete" : `${left} ${left === 1 ? "review" : "reviews"} ready`;
  return (
    <section className={cn(panel, "p-6 md:p-7")}>
      <div className={eyebrow}>Practice</div>
      <h2 className="text-2xl font-bold tracking-tight md:text-2xl">{title}</h2>
      <p className="mb-4 mt-1.5 text-sm leading-normal text-muted-foreground">{closed ? "Resumes after the assessment" : `Mixed recall, a fix and an explanation · ~15 min${daily?.warmUp ? " · Warm-up" : ""}`}</p>
      {!closed && <Button asChild variant="outline"><Link href={engineering.practice}>{daily?.done ? "View summary" : daily ? "Continue practice" : "Start practice"}<IconArrowRight size={18} aria-hidden="true" /></Link></Button>}
    </section>
  );
}

export function EngineeringOverview({ email, today, next, profile, daily, closedBook = false }: {
  email: string; today: TodayView; next: NextStep | null; profile: ProfileView; daily: DailyView | null; closedBook?: boolean;
}) {
  const reviews = today.reviewsDue.filter((id) => id !== today.plan?.topicId);
  const stages = profile.roadmap.slice(0, 5);
  const chosen = profile.roles.find((role) => role.roleId === profile.direction);
  const radar = profile.radar.items;
  return (
    <WorkspaceShell email={email} active="lab" tab="overview" termLookup={!closedBook}>
      <div className="mx-auto max-w-375 px-3 pb-9 pt-6 md:px-5 md:pt-7 min-[1500px]:pt-9">
        <PageHeading title="Overview" description="Next step, today's practice and the path to the target role" badge={`AI uses · ${today.generationsUsed} of ${today.generationLimit}`} />

        <div className="mx-1 grid grid-cols-1 gap-4 md:mx-3.5 md:grid-cols-[2fr_1fr] md:gap-5">
          <NextAction today={today} next={next} profile={profile} />
          <PracticePanel daily={daily} closed={closedBook} />
        </div>

        {reviews.length > 0 && (
          <section className="mx-1 my-7 md:mx-3.5 md:my-8">
            <SectionTitle title="Reviews due" />
            {reviews.map((id) => {
              const status = today.progress.find((item) => item.topicId === id)?.status;
              return (
                <Link key={id} href={engineering.topic(id, "check")} className={row}>
                  <strong className="min-w-24 font-medium md:min-w-36">{findTopic(id)?.title ?? id}</strong>
                  <span className="text-muted-foreground">{status === "NEEDS_REVISIT" ? statusWords.NEEDS_REVISIT : "Review due"}</span>
                  <IconChevronRight size={18} className="ml-auto" aria-hidden="true" />
                </Link>
              );
            })}
          </section>
        )}

        {profile.baseline.state === "done" && (
          <section className="mx-1 my-7 md:mx-3.5 md:my-8">
            <SectionTitle title="Your path" action={<Button asChild variant="link"><Link href={engineering.learn}>View learning path<IconArrowRight size={17} aria-hidden="true" /></Link></Button>} />
            {!chosen ? (
              <Link href={engineering.direction()} className={row}><strong className="font-medium">No direction yet</strong><span className="text-muted-foreground">Choose direction</span><IconChevronRight size={18} className="ml-auto" aria-hidden="true" /></Link>
            ) : !stages.length ? <p className="text-sm text-muted-foreground">Direction complete</p> : stages.map((stage) => {
              const first = stage.topics.find((topic) => !topic.known) ?? stage.topics[0];
              return (
                <Link key={`${stage.chapter}-${stage.need}`} href={first ? engineering.topic(first.topicId) : engineering.learn} className={row}>
                  <strong className="min-w-24 font-medium md:min-w-36">{stage.title}</strong>
                  <span className="text-muted-foreground">{depthWords[stage.need]} · {stage.topics.filter((topic) => !topic.known).length} of {stage.topics.length} topics left</span>
                  <span className="text-xs text-muted-foreground md:text-sm">Week {stage.doneByWeek} · Estimate</span>
                  <IconChevronRight size={18} className="ml-auto" aria-hidden="true" />
                </Link>
              );
            })}
          </section>
        )}

        <section className="mx-1 my-7 md:mx-3.5 md:my-8">
          <SectionTitle title="Relevant changes" action={<RadarDialog profile={profile} />} />
          {radar.length ? radar.slice(0, 3).map((item) => (
            <div key={item.id} className={row}>
              <Badge>{radarTagWords[item.tag]}</Badge>
              <strong className="min-w-24 font-medium md:min-w-36">{item.title}</strong>
              <span className="text-muted-foreground">{item.reason}</span>
              {item.topicId ? <Button asChild variant="link" className="ml-auto"><Link href={engineering.topic(item.topicId, "check")}>Re-check</Link></Button>
                : item.sourceUrl ? <Button asChild variant="link" className="ml-auto"><a href={item.sourceUrl} target="_blank" rel="noreferrer">Source<IconExternalLink size={14} aria-hidden="true" /></a></Button> : null}
            </div>
          )) : <p className="text-sm text-muted-foreground">{!profile.direction ? "Starts after you choose a direction" : profile.radar.checked ? "No verified changes this week" : "Not scanned this week"}</p>}
        </section>
      </div>
    </WorkspaceShell>
  );
}
