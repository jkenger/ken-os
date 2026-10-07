import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import Link from "next/link";
import { Check } from "lucide-react";
import { depthAtLeast, LEVELS, levelRank, type ChapterState, type Level } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { careers, findTopic, topicMap } from "@/features/engineering-lab/curriculum";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import type { NextStep } from "@/features/engineering-lab/steps";
import type { TodayView } from "@/features/engineering-lab/store";
import { cn } from "@/lib/utils";
import { depthWords, levelWords } from "../words";
import { RailTrack, RoadAhead, tracks, type Track } from "./road-tracks";

// Design exploration for the lab home, development preview only. Three layout directions over the same sample
// learner, on the Ken OS visual baseline (the Claude design system). Nothing here ships until one is chosen.

export type Direction = "report" | "route" | "skyline";

export interface ExploreData {
  profile: ProfileView;
  today: TodayView;
  next: NextStep | null;
  states: ChapterState[];
}

const directions: { id: Direction; name: string; idea: string }[] = [
  { id: "report", name: "Report", idea: "Leads with a plain sentence about where you are, then one table of every level." },
  { id: "route", name: "Route", idea: "Leads with the road ahead: chapters in order, with the points where each level is reached." },
  { id: "skyline", name: "Skyline", idea: "Leads with the shape of your skills: one column per area, so the uneven parts stand out." },
];

function chapterTitle(id: string) {
  return topicMap.modules.find((module) => module.id === id)?.title ?? id;
}

function useFacts({ profile, today, next }: ExploreData) {
  const role = profile.roles.find((item) => item.roleId === profile.direction)!;
  const targets = Object.fromEntries(role.areas.map((area) => [area.area, area.target])) as Partial<Record<string, Level>>;
  const topic = today.plan ? findTopic(today.plan.topicId) : undefined;
  const step = next?.steps.find((item) => item.id === next.suggested);
  const weeks = profile.roadmap.at(-1)?.doneByWeek ?? 0;
  const radar = profile.radar.items[0];
  return { role, targets, topic, step, weeks, radar };
}

/** "Junior in Frontend and Applied AI. Not yet junior in Foundations, Backend and Production." */
function shapeSentence(profile: ProfileView) {
  const groups = new Map<string, string[]>();
  for (const area of profile.areas) {
    const key = levelWords(area.now.level);
    groups.set(key, [...(groups.get(key) ?? []), area.title + (area.now.estimate ? " (estimate)" : "")]);
  }
  const order = ["Senior", "Mid-level", "Junior", "Not yet junior"];
  const list = (items: string[]) => items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0];
  return order.filter((key) => groups.has(key)).map((key) => `${key} in ${list(groups.get(key)!)}.`);
}

function Switcher({ active, track }: { active: Direction; track: Track }) {
  return (
    <nav aria-label="Design directions" className="mb-8 rounded-lg bg-muted px-4 py-3">
      <p className="text-sm text-muted-foreground">Design exploration, sample data. Compare the directions, then pick one or mix parts.</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {directions.map((item) => (
          <li key={item.id}>
            <Link href={`/design-preview?view=lab-explore&d=${item.id}`} aria-current={item.id === active ? "page" : undefined}
              className={cn("inline-flex h-8 items-center rounded-md border px-3 text-sm font-semibold", item.id === active ? "border-foreground bg-background" : "border-border text-muted-foreground hover:text-foreground")}>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">{directions.find((item) => item.id === active)!.idea}</p>
      {active === "skyline" && (
        <>
          <p className="mt-4 text-sm font-semibold">Road ahead</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {tracks.map((item) => (
              <li key={item.id}>
                <Link href={`/design-preview?view=lab-explore&d=skyline&t=${item.id}`} aria-current={item.id === track ? "page" : undefined}
                  className={cn("inline-flex h-8 items-center rounded-md border px-3 text-sm font-semibold", item.id === track ? "border-foreground bg-background" : "border-border text-muted-foreground hover:text-foreground")}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">{tracks.find((item) => item.id === track)!.idea}</p>
        </>
      )}
    </nav>
  );
}

// ---- Shared pieces of the Today strip, worded the same in every direction ----

function TodayFacts({ data, layout }: { data: ExploreData; layout: "row" | "bar" | "rail" }) {
  const { topic, step, radar } = useFacts(data);
  const items = [
    { title: "Practice", body: "Four questions and one hands-on fix, about 15 minutes.", action: "Start practice", href: "#" },
    { title: "Continue", body: topic && step ? `${topic.title}, ${step.label.toLowerCase()} step.` : "Nothing in progress.", action: "Continue", href: "#" },
    { title: "Radar", body: radar ? radar.title : "Nothing flagged this week.", action: "See why", href: "#" },
  ];
  if (layout === "bar") {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-3 text-sm">
        {items.map((item) => (
          <a key={item.title} href={item.href} className="group flex min-w-0 items-baseline gap-2 rounded-sm focus-visible:outline-2">
            <span className="font-semibold">{item.title}</span>
            <span className="truncate text-muted-foreground group-hover:text-foreground">{item.body}</span>
          </a>
        ))}
      </div>
    );
  }
  if (layout === "rail") {
    return (
      <div className="space-y-5">
        {items.map((item, index) => (
          <section key={item.title} aria-labelledby={`rail-${item.title}`} className={cn(index > 0 && "border-t border-border pt-5")}>
            <h3 className="font-display text-base font-semibold" id={`rail-${item.title}`}>{item.title}</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.body}</p>
            <Button size="sm" variant={index === 0 ? "default" : "outline"} className="mt-3">{item.action}</Button>
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="grid border-y border-border md:grid-cols-3">
      {items.map((item, index) => (
        <section key={item.title} aria-labelledby={`row-${item.title}`} className={cn("py-4 md:px-5", index > 0 && "border-t border-border md:border-l md:border-t-0", index === 0 && "md:pl-0")}>
          <h3 className="font-display text-base font-semibold" id={`row-${item.title}`}>{item.title}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.body}</p>
          <a href={item.href} className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">{item.action}</a>
        </section>
      ))}
    </div>
  );
}

// ---- Direction 1: Report ----

function Report({ data }: { data: ExploreData }) {
  const { profile, states } = data;
  const { role, targets, weeks } = useFacts(data);
  const state = (chapter: string) => states.find((item) => item.chapterId === chapter);
  return (
    <>
      <h1 className="max-w-[760px] font-display text-[28px] font-bold leading-[1.15] tracking-[-0.04em] sm:text-[44px] sm:leading-[1.1]">
        {shapeSentence(profile).map((line) => <span key={line} className="block">{line}</span>)}
      </h1>
      <p className="mt-4 max-w-[640px] text-[17px] leading-7 text-muted-foreground">
        Your direction, {role.title}, needs mid-level in every area it covers. That is {role.missing.length} chapters away, about {weeks} weeks at {profile.pace.weeklyHours} hours a week.
      </p>

      <div className="mt-8"><TodayFacts data={data} layout="row" /></div>

      <section className="mt-10" aria-labelledby="matrix-title">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]" id="matrix-title">What each level needs</h2>
        <p className="mt-1 text-sm text-muted-foreground">A tick means that chapter is deep enough. Your direction&apos;s target is outlined.</p>
        <div className="mt-4 overflow-x-auto">
          <Table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <TableHeader>
              <TableRow className="border-b border-foreground">
                <TableHead scope="col" className="pl-0 w-[180px] py-2 pr-4 font-semibold">Area</TableHead>
                {LEVELS.map((level) => <TableHead key={level} scope="col" className="pl-0 py-2 pr-4 font-semibold">{levelWords(level)}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {careers.areas.map((ladder) => {
                const area = profile.areas.find((item) => item.area === ladder.id)!;
                return (
                  <TableRow key={ladder.id} className="border-b border-border align-top">
                    <TableHead scope="row" className="pl-0 py-3 pr-4 font-normal">
                      <span className="block font-semibold">{ladder.title}</span>
                      <span className="text-muted-foreground">{levelWords(area.now.level)}{area.now.estimate ? ", estimate" : ""}</span>
                    </TableHead>
                    {LEVELS.map((level) => {
                      const reached = levelRank(area.now.level) >= levelRank(level);
                      const isTarget = targets[ladder.id] === level;
                      return (
                        <TableCell key={level} className="pl-0 py-2 pr-2">
                          <div className={cn("rounded-md p-2", reached && "bg-status-solid-surface", isTarget && "outline-2 outline-foreground")}>
                            <ul className="space-y-1">
                              {ladder.levels[level].map((requirement) => {
                                const met = depthAtLeast(state(requirement.chapter)?.depth ?? "none", requirement.depth);
                                return (
                                  <li key={requirement.chapter} className="flex items-start gap-1.5">
                                    {met ? <Check size={14} className="mt-0.5 shrink-0 text-status-solid" aria-label="Done" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full border border-muted-foreground" aria-label="Not yet" />}
                                    <span>{chapterTitle(requirement.chapter)} <span className="text-muted-foreground">({depthWords[requirement.depth].toLowerCase()})</span></span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="order-title">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]" id="order-title">In this order</h2>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {profile.roadmap.map((step, index) => (
              <li key={`${step.chapter}-${step.need}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 py-3 text-sm">
                <span className="font-display font-semibold text-muted-foreground">{index + 1}</span>
                <span><span className="font-semibold">{step.title}</span> to {depthWords[step.need].toLowerCase()}, for {levelWords(step.forLevel).toLowerCase()}</span>
                <span className="text-muted-foreground">week {step.doneByWeek}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="roles-title">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]" id="roles-title">Other directions</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
            {[...profile.roles].sort((a, b) => a.missing.length - b.missing.length).map((item) => (
              <li key={item.roleId} className="flex justify-between gap-3 py-3">
                <span className={cn(item.roleId === role.roleId && "font-semibold")}>{item.title}{item.roleId === role.roleId ? " (yours)" : ""}</span>
                <span className="shrink-0 text-muted-foreground">{item.missing.length} chapters away</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

// ---- Direction 2: Route ----

function Route({ data }: { data: ExploreData }) {
  const { profile } = data;
  const { role, weeks } = useFacts(data);
  const steps = profile.roadmap;
  return (
    <>
      <div className="mb-8"><TodayFacts data={data} layout="bar" /></div>
      <h1 className="max-w-[820px] font-display text-[40px] font-bold leading-[1.1] tracking-[-0.05em] sm:text-5xl">
        {steps.length} stages to {role.title}, about {weeks} weeks.
      </h1>
      <p className="mt-3 max-w-[640px] text-[17px] leading-7 text-muted-foreground">At {profile.pace.weeklyHours} hours a week. The estimate moves as you prove topics.</p>

      <section className="mt-10" aria-labelledby="route-title">
        <h2 className="sr-only" id="route-title">The route</h2>
        <RailTrack steps={steps} />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="areas-title">
          <h2 className="font-display text-xl font-semibold" id="areas-title">Where each area is</h2>
          <ul className="mt-4 space-y-3">
            {profile.areas.map((area) => (
              <li key={area.area} className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3 text-sm">
                <span><span className="font-semibold">{area.title}</span><span className="block text-muted-foreground">{levelWords(area.now.level)}{area.now.estimate ? ", estimate" : ""}</span></span>
                <span className="grid grid-cols-3 gap-1" aria-hidden="true">
                  {LEVELS.map((level) => <span key={level} className={cn("h-2 rounded-full", levelRank(area.now.level) >= levelRank(level) ? area.now.estimate ? "border border-dashed border-foreground" : "bg-foreground" : "bg-muted")} />)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="else-title">
          <h2 className="font-display text-xl font-semibold" id="else-title">If you changed direction</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {[...profile.roles].filter((item) => item.roleId !== role.roleId).sort((a, b) => a.missing.length - b.missing.length).map((item) => (
              <li key={item.roleId} className="flex justify-between gap-3 border-b border-border pb-2">
                <span>{item.title}</span><span className="shrink-0 text-muted-foreground">{item.missing.length} chapters</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

// ---- Direction 3: Skyline ----

function Skyline({ data, track }: { data: ExploreData; track: Track }) {
  const { profile } = data;
  const { role, targets } = useFacts(data);
  return (
    <>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
        <h1 className="font-display text-[40px] font-bold leading-[1.1] tracking-[-0.05em] sm:text-5xl">Your shape as an engineer</h1>
        <p className="mt-3 max-w-[600px] text-[17px] leading-7 text-muted-foreground">
          Each column is an area, built up from junior to senior. The line marks what {role.title} needs.
        </p>

        <figure className="mt-8" aria-labelledby="skyline-caption">
          <div className="grid grid-cols-5 items-end gap-2 sm:gap-4" aria-hidden="true">
            {profile.areas.map((area) => {
              const reached = levelRank(area.now.level) + 1;
              const fraction = area.now.next && area.now.next.total ? area.now.next.met / area.now.next.total : 0;
              const target = targets[area.area];
              return (
                <div key={area.area} className="relative flex flex-col-reverse gap-1">
                  {LEVELS.map((level, index) => {
                    const full = index < reached;
                    const partial = index === reached ? fraction : 0;
                    return (
                      <div key={level} className="relative h-16 overflow-hidden rounded-[4px] bg-muted sm:h-20">
                        {(full || partial > 0) && (
                          <div
                            className={cn("absolute inset-x-0 bottom-0", area.now.estimate ? "bg-[repeating-linear-gradient(135deg,var(--color-foreground)_0_2px,transparent_2px_7px)]" : "bg-foreground")}
                            style={{ height: full ? "100%" : `${partial * 100}%` }}
                          />
                        )}
                        {target === level && <span className="absolute inset-x-[-4px] top-0 h-0.5 bg-status-gap" />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-4">
            {profile.areas.map((area) => (
              <div key={area.area} className="text-sm leading-5">
                <p className="font-semibold">{area.title}</p>
                <p className="text-muted-foreground">{levelWords(area.now.level)}{area.now.estimate ? ", estimate" : ""}</p>
              </div>
            ))}
          </div>
          <figcaption id="skyline-caption" className="mt-4 text-sm text-muted-foreground">
            Solid blocks are proven or placed. Hatched blocks rest on screening answers only. The red line is your direction&apos;s target.
            <span className="sr-only"> {profile.areas.map((area) => `${area.title}: ${levelWords(area.now.level)}${area.now.estimate ? " (estimate)" : ""}, target ${levelWords(targets[area.area] ?? null)}.`).join(" ")}</span>
          </figcaption>
        </figure>

      </div>
      <aside aria-label="Today" className="lg:sticky lg:top-6 lg:self-start lg:border-l lg:border-border lg:pl-6">
        <h2 className="font-display text-xl font-semibold">Today</h2>
        <div className="mt-4"><TodayFacts data={data} layout="rail" /></div>
      </aside>
    </div>
    <RoadAhead profile={profile} track={track} />
    </>
  );
}

export function LabHomeExplore({ data, direction, track = "rail" }: { data: ExploreData; direction: Direction; track?: Track }) {
  return (
    <WorkspaceShell email="preview@example.invalid" active="lab" preview>
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] border-x border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Switcher active={direction} track={track} />
        {direction === "report" && <Report data={data} />}
        {direction === "route" && <Route data={data} />}
        {direction === "skyline" && <Skyline data={data} track={track} />}
      </div>
    </WorkspaceShell>
  );
}
