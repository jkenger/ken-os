import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { findTopic, topicMap } from "@/features/engineering-lab/curriculum";
import type { NextStep } from "@/features/engineering-lab/steps";
import type { TodayView } from "@/features/engineering-lab/store";
import { cn } from "@/lib/utils";
import { formatDate, label, statusWords, toneFor } from "./words";

const kindHeading = { review: "Review", continue: "Continue", prerequisite: "Fix a prerequisite first", new: "Start next" } as const;

function ContinueCard({ today, next }: { today: TodayView; next: NextStep | null }) {
  const plan = today.plan;
  const topic = plan ? findTopic(plan.topicId) : undefined;
  if (!plan || !topic || !next) {
    return (
      <article className="rounded-xl border border-border p-6 sm:p-8">
        <p className={label}>ALL CAUGHT UP</p>
        <p className="mt-3 text-[15px] leading-6">Every written topic is known or proven, and nothing is due for review. New chapters come next.</p>
      </article>
    );
  }
  const index = next.steps.findIndex((step) => step.id === next.suggested);
  const step = next.steps[index];
  return (
    <article className="rounded-xl border border-border p-6 sm:p-8" aria-labelledby="continue-title">
      <p className={label}>{kindHeading[plan.kind].toUpperCase()} · {next.place.track.toUpperCase()} · CHAPTER {next.place.chapterNumber}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.05em]" id="continue-title">{topic.title}</h2>
      <p className="mt-2 text-[15px] text-muted-foreground">Step {index + 1} of {next.steps.length} · {step.label} · {step.detail}</p>
      <div className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${next.steps.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {next.steps.map((item) => <span key={item.id} className={cn("h-1.5 rounded-full", item.done ? "bg-status-solid" : item.id === next.suggested ? "bg-foreground" : "bg-border")} />)}
      </div>
      <p className="mt-5 max-w-[640px] text-[15px] leading-6">{plan.reason}</p>
      <Button asChild size="lg" className="mt-6">
        <Link href={`/lab/topics/${topic.id}?step=${next.suggested}`}>{plan.kind === "new" && index === 0 ? "Start" : "Continue"}: {step.label}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Link>
      </Button>
    </article>
  );
}

export function LabToday({ email, today, next }: { email: string; today: TodayView; next: NextStep | null }) {
  const weak = today.progress.filter((item) => item.weaknesses.length > 0 && item.status !== "VALIDATED").slice(0, 4);
  const proven = today.progress.filter((item) => item.status === "VALIDATED").length;
  const reviews = today.reviewsDue.filter((id) => id !== today.plan?.topicId);

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] border-x border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={label}>ENGINEERING LAB · TODAY</p>
          <p className={label}>{proven} OF {topicMap.topics.length} WRITTEN TOPICS PROVEN</p>
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">Pick up where you left off.</h1>

        <div className="mt-8"><ContinueCard today={today} next={next} /></div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border p-5" aria-labelledby="due-title">
            <p className={label} id="due-title">REVIEWS DUE · {reviews.length}</p>
            {reviews.length ? (
              <ul className="mt-3 space-y-2">
                {reviews.map((id) => {
                  const item = today.progress.find((entry) => entry.topicId === id)!;
                  return (
                    <li key={id}>
                      <Link href={`/lab/topics/${id}?step=check`} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/60">
                        <span className="text-sm font-semibold">{findTopic(id)?.title ?? id}</span>
                        <Pill tone={toneFor(item.status)}>{item.status === "NEEDS_REVISIT" ? statusWords.NEEDS_REVISIT : "Review due"}</Pill>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-3 text-sm text-muted-foreground">Nothing else due.</p>}
          </section>

          <section className="rounded-xl border border-border p-5" aria-labelledby="weak-title">
            <p className={label} id="weak-title">OPEN MISCONCEPTIONS</p>
            {weak.length ? (
              <ul className="mt-3 space-y-3 text-sm">
                {weak.map((item) => (
                  <li key={item.topicId}>
                    <Link href={`/lab/topics/${item.topicId}`} className="font-semibold underline-offset-4 hover:underline">{findTopic(item.topicId)?.title}</Link>
                    <p className="text-muted-foreground">{item.weaknesses[0]}{item.weaknesses.length > 1 ? ` (+${item.weaknesses.length - 1} more)` : ""}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted-foreground">No open misconceptions.</p>}
          </section>
        </div>

        <section className="mt-8" aria-labelledby="changes-title">
          <p className={label} id="changes-title">RECENT CHANGES</p>
          {today.recentChanges.length ? (
            <ul className="mt-3 divide-y divide-border border-y border-border text-sm">
              {today.recentChanges.map((change, index) => (
                <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span><span className="font-semibold">{findTopic(change.topicId)?.title}</span> <span className="text-muted-foreground">({change.reason})</span></span>
                  <span className="flex items-center gap-2"><Pill tone={toneFor(change.to)}>{statusWords[change.to as keyof typeof statusWords]}</Pill><span className="text-muted-foreground">{formatDate(change.at)}</span></span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">No progress changes yet. Your baseline from {formatDate("2026-10-01T12:00:00Z")} is the starting point.</p>}
        </section>

        <p className="mt-8 text-sm text-muted-foreground">AI use today: {today.generationsUsed} of {today.generationLimit} lessons and question sets.</p>
      </div>
    </WorkspaceShell>
  );
}
