import { LEVELS, type Level } from "@ken-os/domain";
import { Timeline, TimelineContent, TimelineDate, TimelineHeader, TimelineIndicator, TimelineItem, TimelineSeparator, TimelineTitle } from "@/components/ui/timeline";
import type { RoadmapChapter } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { depthWords, levelWords } from "../words";

// The road ahead as a rail: week and level points above the line, chapter and depth below.
// Built on the ReUI timeline; chosen on 2026-10-03 from the design exploration (track "labels above").

interface Stop extends RoadmapChapter {
  startWeek: number;
  endWeek: number;
}

/** When each stage starts and ends, in weeks, from its hours at the weekly pace. */
function stops(steps: RoadmapChapter[], weeklyHours: number): Stop[] {
  const perWeek = Math.max(1, weeklyHours);
  let hours = 0;
  return steps.map((step) => {
    const startWeek = hours / perWeek;
    hours += step.hours;
    return { ...step, startWeek, endWeek: hours / perWeek };
  });
}

/** The stage after which each level is fully reached. */
function levelPoints(items: Stop[]): Map<number, Level> {
  const points = new Map<number, Level>();
  for (const level of LEVELS) {
    const index = items.map((item) => item.forLevel).lastIndexOf(level);
    if (index >= 0) points.set(index, level);
  }
  return points;
}

export function RoadRail({ steps, weeklyHours }: { steps: RoadmapChapter[]; weeklyHours: number }) {
  const items = stops(steps, weeklyHours);
  const points = levelPoints(items);
  return (
    <div>
      <div className="overflow-x-auto pb-2" aria-hidden="true">
        <Timeline value={1} orientation="horizontal" className="w-max data-[orientation=horizontal]:w-max">
          {items.map((step, index) => {
            const level = points.get(index);
            return (
              <TimelineItem key={`${step.chapter}-${step.need}`} step={index + 1}
                className="w-[184px] flex-none group-data-[orientation=horizontal]/timeline:mt-20 group-data-[orientation=horizontal]/timeline:not-last:pe-6">
                <TimelineHeader>
                  <div className="absolute -top-20 left-0 flex flex-col items-start gap-1 whitespace-nowrap">
                    <TimelineDate className="mb-0 text-sm font-normal">{index === 0 ? "Now" : `Week ${Math.ceil(step.startWeek) || 1}`}</TimelineDate>
                    {level && <span className="rounded bg-status-solid-surface px-1.5 py-0.5 text-[11px] font-semibold text-status-solid">{levelWords(level)} after this</span>}
                  </div>
                  <TimelineSeparator className="bg-border" />
                  <TimelineIndicator className={cn("size-3", index === 0 ? "border-foreground bg-foreground" : "border-foreground/40 bg-background")} />
                  <TimelineTitle className="font-display text-[15px] font-semibold leading-5">{step.title}</TimelineTitle>
                </TimelineHeader>
                <TimelineContent>to {depthWords[step.need].toLowerCase()}, about {step.hours} h{step.added ? ", a chapter you added" : ""}</TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      </div>
      <ol className="sr-only">
        {items.map((step, index) => (
          <li key={`${step.chapter}-${step.need}`}>
            {step.title}: {depthWords[step.have]} to {depthWords[step.need].toLowerCase()}, for {levelWords(step.forLevel).toLowerCase()}, starting {index === 0 ? "now" : `week ${Math.ceil(step.startWeek) || 1}`}.
            {points.has(index) ? ` ${levelWords(points.get(index)!)} is reached after this stage.` : ""}
          </li>
        ))}
      </ol>
    </div>
  );
}
