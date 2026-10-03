import Link from "next/link";
import { CircleDashed } from "lucide-react";
import { LEVELS, levelRank, type AreaLevel, type Level } from "@ken-os/domain";
import { Pill } from "@/components/ui/pill";
import type { AreaView, ProfileView, RoadmapChapter } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { depthWords, label, levelWords, statusWords, toneFor } from "../words";

// The three pictures of the profile: levels per area, distance to each role, and the roadmap.
// Design: docs/architecture/engineering-lab-profile.md, section 5. Every picture has the same facts in words.

/** Where a level sits on a 0 to 3 scale: whole steps per level, plus how much of the next step is done. */
function position(level: AreaLevel) {
  const reached = levelRank(level.level) + 1;
  if (!level.next || !level.next.total) return reached;
  return reached + level.next.met / level.next.total;
}

function levelSentence(level: AreaLevel) {
  const now = levelWords(level.level);
  if (!level.next) return `${now}${level.estimate ? " (estimate)" : ""}.`;
  return `${now}${level.estimate ? " (estimate)" : ""}. ${level.next.met} of ${level.next.total} chapters done toward ${levelWords(level.next.level).toLowerCase()}.`;
}

export function LevelBars({ areas, targets }: { areas: AreaView[]; targets: Partial<Record<string, Level>> }) {
  return (
    <ul className="divide-y divide-border">
      {areas.map((area) => {
        const now = position(area.now);
        const before = area.atBaseline ? position(area.atBaseline) : null;
        const target = targets[area.area];
        const targetAt = target ? levelRank(target) + 1 : null;
        return (
          <li key={area.area} className="grid gap-3 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
            <div>
              <p className="text-sm font-semibold">{area.title}</p>
              <p className="text-sm text-muted-foreground">{levelWords(area.now.level)}{area.now.estimate ? " · estimate" : ""}</p>
            </div>
            <div>
              <div className="relative h-3 rounded-full bg-muted" aria-hidden="true">
                <div
                  className={cn("absolute inset-y-0 left-0 rounded-full", area.now.estimate ? "border-2 border-dashed border-foreground/70 bg-transparent" : "bg-foreground")}
                  style={{ width: `${Math.max(now / 3, 0.015) * 100}%` }}
                />
                {[1, 2].map((step) => <span key={step} className="absolute inset-y-0 w-px bg-background" style={{ left: `${(step / 3) * 100}%` }} />)}
                {before !== null && <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background" style={{ left: `${Math.min(before / 3, 1) * 100}%` }} title="Baseline" />}
                {targetAt !== null && <span className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 bg-status-gap" style={{ left: `${(targetAt / 3) * 100}%` }} title="Target" />}
              </div>
              <div className="mt-1.5 grid grid-cols-3 text-[11px] font-semibold text-muted-foreground" aria-hidden="true">
                {LEVELS.map((level) => <span key={level} className="text-right">{levelWords(level)}</span>)}
              </div>
              <p className="sr-only">
                {area.title}: {levelSentence(area.now)}
                {area.atBaseline ? ` At the baseline: ${levelWords(area.atBaseline.level)}.` : ""}
                {target ? ` Your direction needs ${levelWords(target).toLowerCase()}.` : " Your direction doesn't need this area."}
              </p>
              {area.checkpoints.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Checkpoints: {area.checkpoints.map((item) => `${new Date(item.on).toLocaleDateString("en", { month: "short", day: "numeric" })} ${levelWords(item.level.level).toLowerCase()}`).join(" · ")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function LevelKey() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <li className="flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-foreground" aria-hidden="true" />Where you are</li>
      <li className="flex items-center gap-2"><span className="h-2 w-6 rounded-full border-2 border-dashed border-foreground/70" aria-hidden="true" />Estimate from screening only</li>
      <li className="flex items-center gap-2"><span className="size-3 rounded-full border-2 border-foreground" aria-hidden="true" />At your baseline</li>
      <li className="flex items-center gap-2"><span className="h-3 w-0.5 bg-status-gap" aria-hidden="true" />Your direction&apos;s target</li>
    </ul>
  );
}

export function RoleDistances({ view, chapterTitle }: { view: ProfileView; chapterTitle: (id: string) => string }) {
  const chosen = view.roles.find((role) => role.roleId === view.direction);
  const chosenMissing = new Set(chosen?.missing.map((item) => item.chapter) ?? []);
  const sorted = [...view.roles].sort((a, b) => a.missing.length - b.missing.length);
  return (
    <ul className="space-y-2">
      {sorted.map((role) => {
        const shared = chosen && role.roleId !== chosen.roleId ? role.missing.filter((item) => chosenMissing.has(item.chapter)).length : 0;
        const isChosen = role.roleId === view.direction;
        return (
          <li key={role.roleId} className={cn("rounded-lg border px-4 py-3", isChosen ? "border-foreground" : "border-border")}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{role.title}{isChosen && <span className="ml-2 text-xs font-bold tracking-[0.12em] text-muted-foreground">YOUR DIRECTION</span>}</p>
              <p className="text-sm">{role.missing.length ? `${role.missing.length} chapter${role.missing.length === 1 ? "" : "s"} away` : "All there"}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;re {levelWords(role.overall).toLowerCase()} for this role.
              {shared > 0 && ` Shares ${shared} of its missing chapters with your direction.`}
              {role.missing.length > 0 && role.missing.length <= 3 && ` Missing: ${role.missing.map((item) => chapterTitle(item.chapter)).join(", ")}.`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function RoadmapTopics({ step }: { step: RoadmapChapter }) {
  if (!step.topics.length && !step.planned.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {step.topics.map((topic) => (
        <Link key={topic.topicId} href={`/lab/topics/${topic.topicId}`} className="rounded-md focus-visible:outline-2">
          <Pill tone={topic.known ? "solid" : toneFor(topic.status)}>{topic.title}<span className="sr-only">: {topic.known ? "known" : statusWords[topic.status]}</span></Pill>
        </Link>
      ))}
      {step.planned.map((title) => <Pill key={title} tone="quiet" icon={<CircleDashed size={12} aria-hidden="true" />}>{title}<span className="sr-only">: not written yet</span></Pill>)}
    </div>
  );
}

export function Roadmap({ steps, pace }: { steps: RoadmapChapter[]; pace: ProfileView["pace"] }) {
  if (!steps.length) return <p className="text-sm text-muted-foreground">Nothing left for your direction. Pick a further one, or take a checkpoint.</p>;
  return (
    <>
      <p className="text-sm text-muted-foreground">
        At {pace.weeklyHours} hours a week{pace.source === "history" ? `, and about ${pace.hoursPerTopic} hours per topic from your own history` : ", using a starting guess until three topics are proven"}. An estimate; it moves as you go.
      </p>
      <ol className="relative mt-4 space-y-0 border-l border-border pl-6">
        {steps.map((step, index) => (
          <li key={`${step.chapter}-${step.need}`} className="relative pb-6 last:pb-0">
            <span className={cn("absolute -left-[31px] top-1 size-3.5 rounded-full border-2", index === 0 ? "border-foreground bg-foreground" : "border-border bg-background")} aria-hidden="true" />
            {index === 0 && <p className={cn(label, "mb-1")}>YOU ARE HERE</p>}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] font-semibold">{step.title}</p>
              <p className="text-sm text-muted-foreground">by week {step.doneByWeek} · about {step.hours} h</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {depthWords[step.have]} → {depthWords[step.need]}, for {levelWords(step.forLevel).toLowerCase()}{step.added ? " · a chapter you added" : ""}
            </p>
            <RoadmapTopics step={step} />
          </li>
        ))}
      </ol>
    </>
  );
}
