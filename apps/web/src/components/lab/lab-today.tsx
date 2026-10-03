import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { findTopic, topicMap } from "@/features/engineering-lab/curriculum";
import type { DailyView } from "@/features/engineering-lab/daily";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import type { NextStep } from "@/features/engineering-lab/steps";
import type { TodayView } from "@/features/engineering-lab/store";
import { LevelBars, LevelKey, Roadmap, RoleDistances } from "./profile/pictures";
import { cn } from "@/lib/utils";
import { formatDate, label, levelWords, radarTagWords, statusWords, toneFor } from "./words";

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

function chapterTitle(id: string, profile: ProfileView) {
  return topicMap.modules.find((module) => module.id === id)?.title ?? profile.addedChapters.find((chapter) => chapter.id === id)?.title ?? id;
}

/** Before the baseline exists, the home shows one thing: how to start it. */
function StartPanel({ profile }: { profile: ProfileView }) {
  const started = profile.baseline.state === "in_progress";
  return (
    <article className="rounded-xl border border-foreground p-6 sm:p-8" aria-labelledby="start-title">
      <p className={label}>{started ? "BASELINE IN PROGRESS" : "START HERE"}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.05em]" id="start-title">{started ? "Finish your baseline." : "Find out where you are first."}</h2>
      <ol className="mt-4 max-w-[640px] space-y-2 text-[15px] leading-6">
        <li><span className="font-semibold">1. A short talk, about 5 minutes.</span> What you build, what you use, and how many hours a week you have. It only steers where questions start.</li>
        <li><span className="font-semibold">2. The assessment, closed-book.</span> Chapter by chapter, at most about 54 questions, and you can pause between chapters for as long as you like.</li>
        <li><span className="font-semibold">3. Your profile.</span> Your level in each area, how far you are from each role, and a roadmap for the direction you pick.</li>
      </ol>
      <Button asChild size="lg" className="mt-6">
        <Link href="/lab/assessment">{started ? "Continue the baseline" : profile.intake ? "Start the assessment" : "Start the talk"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Link>
      </Button>
    </article>
  );
}

function DailyCard({ daily }: { daily: DailyView | null }) {
  const questions = daily?.items.filter((item) => item.type === "question") ?? [];
  const answered = questions.filter((item) => item.answered).length;
  const summary = !daily
    ? "A short mixed set from what you have learned, so it stays fresh."
    : daily.done ? "Done for today." : `${answered} of ${questions.length} questions answered${daily.items.some((item) => item.type === "lab") ? ", plus one hands-on fix" : ""}.`;
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-5" aria-labelledby="daily-title">
      <div>
        <p className={label} id="daily-title">TODAY&apos;S PRACTICE · ABOUT 15 MINUTES</p>
        <p className="mt-2 text-[15px]">{summary}{daily?.warmUp ? " A warm-up from topics in progress, until your first topic is proven." : ""}</p>
      </div>
      <Button asChild variant={daily?.done ? "outline" : "default"}>
        <Link href="/lab/practice">{!daily ? "Start practice" : daily.done ? "Review it" : "Continue practice"}</Link>
      </Button>
    </article>
  );
}

function RadarCard({ profile }: { profile: ProfileView }) {
  const item = profile.radar.items[0];
  const empty = !profile.direction ? "The radar starts once you pick a direction." : profile.radar.checked ? "Nothing flagged this week." : "This week's scan has not run yet.";
  return (
    <article className="rounded-xl border border-border p-5" aria-labelledby="radar-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={label} id="radar-title">THIS WEEK ON YOUR RADAR</p>
        <Link href="/lab/profile#radar" className="text-sm underline-offset-4 hover:underline">All radar items</Link>
      </div>
      {item ? (
        <div className="mt-2">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold"><Pill tone={item.tag === "recheck" ? "gap" : "neutral"}>{radarTagWords[item.tag]}</Pill>{item.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
          {item.topicId ? <Link href={`/lab/topics/${item.topicId}?step=check`} className="mt-1 inline-block text-sm underline underline-offset-4">Re-check it</Link>
            : item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm underline underline-offset-4">Source<ExternalLink size={12} aria-hidden="true" /></a>}
        </div>
      ) : <p className="mt-2 text-sm text-muted-foreground">{empty}</p>}
    </article>
  );
}

function ProfileSection({ profile }: { profile: ProfileView }) {
  const chosen = profile.roles.find((role) => role.roleId === profile.direction);
  const targets = Object.fromEntries(chosen?.areas.map((area) => [area.area, area.target]) ?? []);
  return (
    <section className="mt-10" aria-labelledby="profile-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.04em]" id="profile-title">{chosen ? `${chosen.title}: ${levelWords(chosen.overall).toLowerCase()}` : "Your profile"}</h2>
        <Link href="/lab/profile" className="text-sm underline-offset-4 hover:underline">{profile.direction ? "Change direction" : "Pick a direction"}</Link>
      </div>
      {profile.careers.status === "draft" && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm">The role and level definitions are a draft you have not approved yet. <Link href="/lab/profile#definitions" className="underline underline-offset-4">Read them</Link>.</p>}

      <div className="mt-6 rounded-xl border border-border p-5">
        <p className={label}>WHERE YOU ARE</p>
        <LevelBars areas={profile.areas} targets={targets} />
        <div className="mt-3"><LevelKey /></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-border p-5">
          <p className={cn(label, "mb-3")}>HOW FAR FROM EACH ROLE</p>
          <RoleDistances view={profile} chapterTitle={(id) => chapterTitle(id, profile)} />
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className={cn(label, "mb-3")}>WHERE YOU&apos;RE HEADING</p>
          {chosen ? <Roadmap steps={profile.roadmap} pace={profile.pace} /> : <p className="text-sm text-muted-foreground">Pick a direction and the roadmap draws the chapters it needs, in order, with a pace estimate. <Link href="/lab/profile" className="underline underline-offset-4">Talk it through</Link>.</p>}
        </div>
      </div>
    </section>
  );
}

export function LabToday({ email, today, next, profile, daily }: { email: string; today: TodayView; next: NextStep | null; profile: ProfileView; daily: DailyView | null }) {
  const baselineDone = profile.baseline.state === "done";
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
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">{baselineDone ? "Pick up where you left off." : "Start with where you are."}</h1>

        {baselineDone ? (
          <div className="mt-8 space-y-4">
            <DailyCard daily={daily} />
            <ContinueCard today={today} next={next} />
            <RadarCard profile={profile} />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <StartPanel profile={profile} />
            <ContinueCard today={today} next={next} />
          </div>
        )}

        {baselineDone && <ProfileSection profile={profile} />}

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
          ) : <p className="mt-3 text-sm text-muted-foreground">No progress changes yet. {profile.baseline.completedAt ? `Your baseline from ${formatDate(profile.baseline.completedAt)} is the starting point.` : "Your baseline will be the starting point."}</p>}
        </section>

        <p className="mt-8 text-sm text-muted-foreground">AI use today: {today.generationsUsed} of {today.generationLimit} lessons and question sets.</p>
      </div>
    </WorkspaceShell>
  );
}
