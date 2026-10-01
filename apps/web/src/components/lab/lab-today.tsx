import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { findTopic, topicMap } from "@/features/engineering-lab/curriculum";
import type { TodayView } from "@/features/engineering-lab/store";
import { cn } from "@/lib/utils";
import { formatDate, label, statusWords, toneFor } from "./words";

const kindHeading = { review: "Review", continue: "Continue", prerequisite: "Fix a prerequisite first", new: "Start next" } as const;

export function LabHeader({ eyebrow, title, intro, aside }: { eyebrow: string; title: string; intro: string; aside?: React.ReactNode }) {
  return (
    <header className="border-b border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className={label}>{eyebrow}</p>{aside}</div>
      <h1 className="mt-4 max-w-[760px] font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-[640px] text-base leading-6 text-muted-foreground sm:text-lg">{intro}</p>
    </header>
  );
}

export function StatusTag({ value, children }: { value: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-md px-2 text-xs font-semibold", toneFor(value))}>{children}</span>;
}

export function LabToday({ email, today }: { email: string; today: TodayView }) {
  const plan = today.plan;
  const planTopic = plan ? findTopic(plan.topicId) : undefined;
  const weak = today.progress.filter((item) => item.weaknesses.length > 0 && item.status !== "VALIDATED").slice(0, 5);
  const proven = today.progress.filter((item) => item.status === "VALIDATED").length;

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1320px] border-x border-border">
        <LabHeader
          eyebrow="ENGINEERING LAB · TODAY"
          title="Understand what you build."
          intro="One topic at a time, proven by running code and answering fresh questions. Reading a lesson never counts as knowing it."
          aside={<span className={label}>{proven} OF {topicMap.topics.length} TOPICS PROVEN</span>}
        />
        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
          <section className="border-b border-border px-5 py-7 sm:px-8 lg:border-r lg:px-10" aria-labelledby="next-title">
            <p className={label}>WHAT TO DO NEXT</p>
            {plan && planTopic ? (
              <div className="mt-3">
                <p className="text-sm font-semibold text-muted-foreground">{kindHeading[plan.kind]}</p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.05em]" id="next-title">{planTopic.title}</h2>
                <p className="mt-3 max-w-[620px] text-[15px] leading-6">{plan.reason}</p>
                <p className="mt-2 text-sm text-muted-foreground">To prove it: {plan.prove.join(", ")}.{plan.skipLesson ? " No lesson needed." : ""}</p>
                <Button asChild className="mt-6"><Link href={`/lab/topics/${planTopic.id}`}>Open topic<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Link></Button>
              </div>
            ) : (
              <p className="mt-3 text-[15px] leading-6" id="next-title">Every topic in the map is proven and nothing is due for review. New modules come next.</p>
            )}
          </section>

          <aside className="border-b border-border px-5 py-7 sm:px-8 lg:px-8" aria-label="Status">
            <p className={label}>REVIEWS DUE</p>
            {today.reviewsDue.length ? (
              <ul className="mt-3 space-y-2 text-sm">{today.reviewsDue.map((id) => <li key={id}><Link className="underline-offset-4 hover:underline" href={`/lab/topics/${id}`}>{findTopic(id)?.title ?? id}</Link></li>)}</ul>
            ) : <p className="mt-3 text-sm text-muted-foreground">Nothing due.</p>}

            <p className={cn(label, "mt-7")}>RECENTLY PROVEN</p>
            {today.recentlyValidated.length ? (
              <ul className="mt-3 space-y-2 text-sm">{today.recentlyValidated.map((item) => <li key={item.topicId} className="flex justify-between gap-3"><span>{findTopic(item.topicId)?.title}</span><span className="text-muted-foreground">{formatDate(item.at)}</span></li>)}</ul>
            ) : <p className="mt-3 text-sm text-muted-foreground">Nothing proven yet.</p>}

            <p className={cn(label, "mt-7")}>AI USE TODAY</p>
            <p className="mt-3 text-sm">{today.generationsUsed} of {today.generationLimit} lessons and question sets</p>
          </aside>
        </div>

        <section className="border-b border-border px-5 py-7 sm:px-8 lg:px-10" aria-labelledby="weak-title">
          <p className={label}>WEAK SPOTS</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]" id="weak-title">Open misconceptions</h2>
          {weak.length ? (
            <div className="mt-4 divide-y divide-border border-y border-border">
              {weak.map((item) => (
                <Link key={item.topicId} href={`/lab/topics/${item.topicId}`} className="flex flex-col gap-2 py-4 hover:bg-muted/50 sm:flex-row sm:items-start sm:justify-between sm:px-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{findTopic(item.topicId)?.title}</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">{item.weaknesses.slice(0, 3).map((weakness) => <li key={weakness}>{weakness}</li>)}</ul>
                  </div>
                  <StatusTag value={item.status}>{statusWords[item.status]}</StatusTag>
                </Link>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-muted-foreground">No open misconceptions.</p>}
        </section>

        <section className="px-5 py-7 sm:px-8 lg:px-10" aria-labelledby="changes-title">
          <p className={label}>HISTORY</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]" id="changes-title">Recent changes</h2>
          {today.recentChanges.length ? (
            <ul className="mt-4 space-y-2 text-sm">{today.recentChanges.map((change, index) => (
              <li key={index} className="flex flex-wrap gap-x-2"><span className="font-semibold">{findTopic(change.topicId)?.title}</span><span>{statusWords[change.from as keyof typeof statusWords]} → {statusWords[change.to as keyof typeof statusWords]}</span><span className="text-muted-foreground">({change.reason}, {formatDate(change.at)})</span></li>
            ))}</ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">No progress changes yet. Your baseline from {formatDate("2026-10-01T12:00:00Z")} is the starting point.</p>}
        </section>
      </div>
    </WorkspaceShell>
  );
}
