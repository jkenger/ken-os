import { AREAS, LEVELS, type Level } from "@ken-os/domain";
import { Timeline, TimelineContent, TimelineDate, TimelineHeader, TimelineIndicator, TimelineItem, TimelineSeparator, TimelineTitle } from "@/components/ui/timeline";
import { careers } from "@/features/engineering-lab/curriculum";
import type { ProfileView, RoadmapChapter } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { depthWords, levelWords } from "../words";

// Ways to draw the road ahead under the Skyline home. Design exploration, development preview only.

export type Track = "rail" | "reui-labels" | "reui-compact" | "segments" | "weeks" | "lanes" | "gates" | "list";

export const tracks: { id: Track; name: string; idea: string }[] = [
  { id: "rail", name: "Rail", idea: "The first Route track: stations in order, with the points where each level is reached." },
  { id: "reui-labels", name: "Rail: labels above", idea: "ReUI timeline. Week and level points sit above the line, chapter and depth below, so the line stays clean." },
  { id: "reui-compact", name: "Rail: compact", idea: "ReUI timeline, tightened so all stages fit one laptop-width line. Green dots mark where a level is reached." },
  { id: "segments", name: "Rail: segments", idea: "No dots: one bar split into stages, each as wide as its hours. The filled segment is now; level points sit underneath." },
  { id: "weeks", name: "Weeks", idea: "One row per stage on a week ruler, so long stages look long and the finish date is visible." },
  { id: "lanes", name: "Area lanes", idea: "One lane per area, matching the skyline's columns, so you see which column each stage builds." },
  { id: "gates", name: "Level gates", idea: "Stages grouped by the level they unlock, stepping up like stairs: junior, then mid-level, then senior." },
  { id: "list", name: "Report list", idea: "Report's numbered list: plain, dense and easy to scan." },
];

interface TimedStep extends RoadmapChapter {
  start: number;
  end: number;
}

/** Start and end of each stage in weeks, from the hours each takes at the weekly pace. */
function timed(steps: RoadmapChapter[], weeklyHours: number): TimedStep[] {
  let hours = 0;
  const perWeek = Math.max(1, weeklyHours);
  return steps.map((step) => {
    const start = hours / perWeek;
    hours += step.hours;
    return { ...step, start, end: hours / perWeek };
  });
}

/** Where each level is fully reached: the end of the last stage that level needs. */
function gatesOf(steps: TimedStep[]) {
  return LEVELS.map((level) => {
    const index = steps.map((step) => step.forLevel).lastIndexOf(level);
    return index < 0 ? null : { level, index, week: steps[index].end };
  }).filter((gate): gate is { level: Level; index: number; week: number } => gate !== null);
}

const key = (step: RoadmapChapter) => `${step.chapter}-${step.need}`;
const areaTitle = (area: string) => careers.areas.find((item) => item.id === area)?.title ?? area;

/** The same facts in words, for screen readers, under every drawn track. */
function SpokenSteps({ steps }: { steps: TimedStep[] }) {
  return (
    <ol className="sr-only">
      {steps.map((step) => <li key={key(step)}>{step.title}, {depthWords[step.have]} to {depthWords[step.need].toLowerCase()}, for {levelWords(step.forLevel).toLowerCase()}, done by week {Math.ceil(step.end)}.</li>)}
    </ol>
  );
}

export function RailTrack({ steps }: { steps: RoadmapChapter[] }) {
  const gates = gatesOf(timed(steps, 1));
  return (
    <div className="overflow-x-auto pb-4">
      <ol className="relative flex min-w-max items-start pt-8">
        <span className="absolute left-0 right-0 top-[51px] h-0.5 bg-border" aria-hidden="true" />
        {steps.map((step, index) => {
          const gate = gates.find((item) => item.index === index);
          return (
            <li key={key(step)} className="relative w-[188px] shrink-0 pr-5">
              {index === 0 && <p className="absolute -top-7 left-0 text-sm font-semibold">You are here</p>}
              <span className={cn("relative z-10 block size-4 rounded-full border-2 border-foreground", index === 0 ? "bg-foreground" : "bg-background")} aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">Week {step.doneByWeek}</p>
              <p className="mt-1 font-display text-[15px] font-semibold leading-5">{step.title}</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{depthWords[step.have]} to {depthWords[step.need].toLowerCase()}</p>
              {gate && <p className="mt-3 inline-flex rounded-md bg-status-solid-surface px-2 py-1 text-xs font-semibold text-status-solid">{levelWords(gate.level)} reached</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function WeekRuler({ total }: { total: number }) {
  const ticks = Array.from({ length: Math.ceil(total) + 1 }, (_, week) => week).filter((week) => week % 2 === 0 || total <= 10);
  return (
    <div className="relative h-6 border-b border-border text-xs text-muted-foreground" aria-hidden="true">
      {ticks.map((week) => (
        <span key={week} className="absolute bottom-1 -translate-x-1/2" style={{ left: `${(week / total) * 100}%` }}>{week === 0 ? "Now" : `W${week}`}</span>
      ))}
    </div>
  );
}

function GateLines({ gates, total }: { gates: { level: Level; week: number }[]; total: number }) {
  return (
    <>
      {gates.map((gate) => (
        <span key={gate.level} className="absolute inset-y-0 w-px bg-status-solid" style={{ left: `${(gate.week / total) * 100}%` }} aria-hidden="true">
          <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-status-solid-surface px-1.5 py-0.5 text-[11px] font-semibold text-status-solid">{levelWords(gate.level)}</span>
        </span>
      ))}
    </>
  );
}

function WeeksTrack({ steps, weeklyHours }: { steps: RoadmapChapter[]; weeklyHours: number }) {
  const rows = timed(steps, weeklyHours);
  const total = Math.max(1, rows.at(-1)?.end ?? 1);
  const gates = gatesOf(rows);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]" aria-hidden="true">
        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4">
          <span />
          <WeekRuler total={total} />
        </div>
        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4">
          <ol className="divide-y divide-border">
            {rows.map((step) => (
              <li key={key(step)} className="flex h-12 flex-col justify-center text-sm leading-5">
                <span className="truncate font-semibold">{step.title}</span>
                <span className="truncate text-muted-foreground">to {depthWords[step.need].toLowerCase()}</span>
              </li>
            ))}
          </ol>
          <div className="relative">
            <GateLines gates={gates} total={total} />
            {rows.map((step, index) => (
              <div key={key(step)} className="relative h-12 border-b border-border">
                <span
                  className={cn("absolute top-1/2 h-5 -translate-y-1/2 rounded-[4px]", index === 0 ? "bg-foreground" : "border border-foreground bg-background")}
                  style={{ left: `${(step.start / total) * 100}%`, width: `max(6px, ${((step.end - step.start) / total) * 100}%)` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <SpokenSteps steps={rows} />
      <p className="mt-3 text-sm text-muted-foreground">Filled bar: the stage you&apos;re on. Green lines: where each level is reached. Finish around week {Math.ceil(total)}.</p>
    </div>
  );
}

function LanesTrack({ steps, weeklyHours, areaOrder }: { steps: RoadmapChapter[]; weeklyHours: number; areaOrder: string[] }) {
  const rows = timed(steps, weeklyHours);
  const total = Math.max(1, rows.at(-1)?.end ?? 1);
  const gates = gatesOf(rows);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]" aria-hidden="true">
        <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-4">
          <span />
          <WeekRuler total={total} />
        </div>
        <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-4">
          <div className="divide-y divide-border">
            {areaOrder.map((area) => <p key={area} className="flex h-14 items-center text-sm font-semibold">{areaTitle(area)}</p>)}
          </div>
          <div className="relative">
            <GateLines gates={gates} total={total} />
            {areaOrder.map((area) => (
              <div key={area} className="relative h-14 border-b border-border">
                {rows.filter((step) => step.area === area).map((step) => (
                  <span
                    key={key(step)} title={`${step.title}, to ${depthWords[step.need].toLowerCase()}`}
                    className={cn("absolute top-1/2 flex h-9 -translate-y-1/2 items-center overflow-hidden rounded-[4px] px-2 text-xs font-semibold leading-4",
                      rows[0] === step ? "bg-foreground text-background" : "border border-foreground bg-background")}
                    style={{ left: `${(step.start / total) * 100}%`, width: `max(10px, calc(${((step.end - step.start) / total) * 100}% - 2px))` }}
                  >
                    <span className="truncate">{step.title}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <SpokenSteps steps={rows} />
      <p className="mt-3 text-sm text-muted-foreground">Lanes follow the skyline&apos;s columns. Hover a block for its full name. Areas with no blocks are already where your direction needs them.</p>
    </div>
  );
}

function GatesTrack({ steps, weeklyHours }: { steps: RoadmapChapter[]; weeklyHours: number }) {
  const rows = timed(steps, weeklyHours);
  const groups = LEVELS.map((level) => ({ level, items: rows.filter((step) => step.forLevel === level) })).filter((group) => group.items.length);
  return (
    <ol className="grid gap-4 md:grid-cols-3 md:items-start">
      {groups.map((group, index) => (
        <li key={group.level} className={cn("rounded-lg border p-4", index === 0 ? "border-foreground" : "border-border")} style={{ marginTop: `calc(${index} * var(--gate-step, 0px))` }}>
          <h3 className="font-display text-lg font-semibold">To {levelWords(group.level).toLowerCase()}</h3>
          <p className="text-sm text-muted-foreground">
            {group.items.length} stage{group.items.length === 1 ? "" : "s"}, weeks {Math.floor(group.items[0].start) + 1} to {Math.ceil(group.items.at(-1)!.end)}
          </p>
          <ol className="mt-3 space-y-2 text-sm">
            {group.items.map((step) => (
              <li key={key(step)} className="border-t border-border pt-2">
                <p className="font-semibold">{step.title}</p>
                <p className="text-muted-foreground">to {depthWords[step.need].toLowerCase()}, about {step.hours} h</p>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function ListTrack({ steps }: { steps: RoadmapChapter[] }) {
  return (
    <ol className="divide-y divide-border border-y border-border">
      {steps.map((step, index) => (
        <li key={key(step)} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 py-3 text-sm">
          <span className="font-display font-semibold text-muted-foreground">{index + 1}</span>
          <span><span className="font-semibold">{step.title}</span> to {depthWords[step.need].toLowerCase()}, for {levelWords(step.forLevel).toLowerCase()}</span>
          <span className="text-muted-foreground">week {step.doneByWeek}</span>
        </li>
      ))}
    </ol>
  );
}

export function RoadAhead({ profile, track }: { profile: ProfileView; track: Track }) {
  const steps = profile.roadmap;
  const weeks = steps.at(-1)?.doneByWeek ?? 0;
  return (
    <section className="mt-10" aria-labelledby="road-title">
      <h2 className="font-display text-xl font-semibold" id="road-title">The road ahead: {steps.length} stages, about {weeks} weeks</h2>
      <p className="mt-1 text-sm text-muted-foreground">At {profile.pace.weeklyHours} hours a week. The estimate moves as you prove topics.</p>
      <div className="mt-5 [--gate-step:24px]">
        {track === "rail" && <RailTrack steps={steps} />}
        {track === "reui-labels" && <ReuiLabelsTrack steps={steps} weeklyHours={profile.pace.weeklyHours} />}
        {track === "reui-compact" && <ReuiCompactTrack steps={steps} weeklyHours={profile.pace.weeklyHours} />}
        {track === "segments" && <SegmentsTrack steps={steps} weeklyHours={profile.pace.weeklyHours} />}
        {track === "weeks" && <WeeksTrack steps={steps} weeklyHours={profile.pace.weeklyHours} />}
        {track === "lanes" && <LanesTrack steps={steps} weeklyHours={profile.pace.weeklyHours} areaOrder={[...AREAS]} />}
        {track === "gates" && <GatesTrack steps={steps} weeklyHours={profile.pace.weeklyHours} />}
        {track === "list" && <ListTrack steps={steps} />}
      </div>
    </section>
  );
}

// ---- Rail variants: two on the ReUI timeline, one segmented bar ----

/** ReUI timeline with labels above the line: week and level reached above, chapter and depth below. */
function ReuiLabelsTrack({ steps, weeklyHours }: { steps: RoadmapChapter[]; weeklyHours: number }) {
  const rows = timed(steps, weeklyHours);
  const gates = gatesOf(rows);
  return (
    <div className="overflow-x-auto pb-2">
      <Timeline value={1} orientation="horizontal" className="w-max data-[orientation=horizontal]:w-max">
        {rows.map((step, index) => {
          const gate = gates.find((item) => item.index === index);
          return (
            <TimelineItem key={key(step)} step={index + 1} className="w-[184px] flex-none group-data-[orientation=horizontal]/timeline:mt-20 group-data-[orientation=horizontal]/timeline:not-last:pe-6">
              <TimelineHeader>
                <div className="absolute -top-20 left-0 flex flex-col items-start gap-1 whitespace-nowrap">
                  <TimelineDate className="mb-0 text-sm font-normal">{index === 0 ? "Now" : `Week ${Math.ceil(step.start) || 1}`}</TimelineDate>
                  {gate && <span className="rounded bg-status-solid-surface px-1.5 py-0.5 text-[11px] font-semibold text-status-solid">{levelWords(gate.level)} after this</span>}
                </div>
                <TimelineSeparator className="bg-border" />
                <TimelineIndicator className={cn("size-3", index === 0 ? "border-foreground bg-foreground" : "border-foreground/40 bg-background")} />
                <TimelineTitle className="font-display text-[15px] font-semibold leading-5">{step.title}</TimelineTitle>
              </TimelineHeader>
              <TimelineContent>to {depthWords[step.need].toLowerCase()}, about {step.hours} h</TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
      <SpokenSteps steps={rows} />
    </div>
  );
}

/** ReUI timeline, compact: every stage fits on one laptop-width line; level points get a green marker. */
function ReuiCompactTrack({ steps, weeklyHours }: { steps: RoadmapChapter[]; weeklyHours: number }) {
  const rows = timed(steps, weeklyHours);
  const gates = gatesOf(rows);
  return (
    <div className="overflow-x-auto pb-2">
      <Timeline value={1} orientation="horizontal" className="min-w-[880px]">
        {rows.map((step, index) => {
          const gate = gates.find((item) => item.index === index);
          return (
            <TimelineItem key={key(step)} step={index + 1} className="min-w-0 group-data-[orientation=horizontal]/timeline:mt-7 group-data-[orientation=horizontal]/timeline:not-last:pe-2">
              <TimelineSeparator className="bg-border group-data-[orientation=horizontal]/timeline:w-[calc(100%-0.75rem)] group-data-[orientation=horizontal]/timeline:translate-x-3" />
              <TimelineIndicator className={cn("size-2.5",
                index === 0 ? "border-foreground bg-foreground" : gate ? "border-status-solid bg-status-solid" : "border-foreground/40 bg-background")} />
              <TimelineDate className="mb-0 text-[11px]">{index === 0 ? "Now" : `W${Math.ceil(step.start) || 1}`}</TimelineDate>
              <TimelineTitle className="line-clamp-2 text-xs font-semibold leading-4" title={step.title}>{step.title}</TimelineTitle>
              <TimelineContent className="text-[11px] leading-4">{depthWords[step.need]}</TimelineContent>
              {gate && <p className="mt-1 text-[11px] font-semibold text-status-solid">{levelWords(gate.level)}</p>}
            </TimelineItem>
          );
        })}
      </Timeline>
      <SpokenSteps steps={rows} />
    </div>
  );
}

/** No dots: one bar split into stages, each as wide as its hours. Level points sit under the bar. */
function SegmentsTrack({ steps, weeklyHours }: { steps: RoadmapChapter[]; weeklyHours: number }) {
  const rows = timed(steps, weeklyHours);
  const total = Math.max(1, rows.at(-1)?.end ?? 1);
  const gates = gatesOf(rows);
  const grow = (step: TimedStep) => ({ flexGrow: step.end - step.start, flexBasis: 0 });
  return (
    <div>
      <div className="flex justify-between text-sm text-muted-foreground"><span>Now</span><span>Around week {Math.ceil(total)}</span></div>
      <div className="mt-2 flex h-12 gap-1" aria-hidden="true">
        {rows.map((step, index) => {
          return (
            <div key={key(step)} style={grow(step)} title={`${index + 1}. ${step.title}, to ${depthWords[step.need].toLowerCase()}`}
              className={cn("flex min-w-[18px] items-center justify-center overflow-hidden rounded-[4px] text-xs font-semibold",
                index === 0 ? "bg-foreground text-background" : "bg-muted text-foreground")}>
              <span className="truncate">{index + 1}</span>
            </div>
          );
        })}
      </div>
      <div className="flex h-7 gap-1" aria-hidden="true">
        {rows.map((step, index) => {
          const gate = gates.find((item) => item.index === index);
          return (
            <div key={key(step)} style={grow(step)} className="relative min-w-[18px]">
              {gate && (
                <span className="absolute right-0 top-0 flex flex-col items-end">
                  <span className="h-2 w-0.5 bg-status-solid" />
                  <span className="whitespace-nowrap text-[11px] font-semibold text-status-solid">{levelWords(gate.level)}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <ol className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((step, index) => (
          <li key={key(step)} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-1">
            <span className="font-display font-semibold text-muted-foreground">{index + 1}</span>
            <span><span className="font-semibold">{step.title}</span> <span className="text-muted-foreground">to {depthWords[step.need].toLowerCase()}, week {Math.ceil(step.end)}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
