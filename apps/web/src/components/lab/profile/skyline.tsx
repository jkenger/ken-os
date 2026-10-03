import { LEVELS, levelRank, type Level } from "@ken-os/domain";
import type { AreaView } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { levelWords } from "../words";

// The shape of your skills: one column per area, built up block by block from junior to senior.
// Chosen on 2026-10-03 from the design exploration (/design-preview?view=lab-explore&d=skyline).

/** Solid blocks are proven or placed; hatched ones rest on screening only; the red line is the direction's target. */
export function Skyline({ areas, targets, compact = false }: { areas: AreaView[]; targets: Partial<Record<string, Level>>; compact?: boolean }) {
  const hasTargets = Object.keys(targets).length > 0;
  return (
    <figure aria-labelledby="skyline-caption">
      <div className="grid grid-cols-5 items-end gap-2 sm:gap-4" aria-hidden="true">
        {areas.map((area) => {
          const reached = levelRank(area.now.level) + 1;
          const fraction = area.now.next && area.now.next.total ? area.now.next.met / area.now.next.total : 0;
          const target = targets[area.area];
          return (
            <div key={area.area} className="flex flex-col-reverse gap-1">
              {LEVELS.map((level, index) => {
                const full = index < reached;
                const partial = index === reached ? fraction : 0;
                return (
                  <div key={level} className={cn("relative overflow-hidden rounded-[4px] bg-muted", compact ? "h-10" : "h-16 sm:h-20")}>
                    {(full || partial > 0) && (
                      <div
                        className={cn("absolute inset-x-0 bottom-0", area.now.estimate ? "bg-[repeating-linear-gradient(135deg,var(--color-foreground)_0_2px,transparent_2px_7px)]" : "bg-foreground")}
                        style={{ height: full ? "100%" : `${partial * 100}%` }}
                      />
                    )}
                    {target === level && <span className="absolute inset-x-0 top-0 h-0.5 bg-status-gap" />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-4">
        {areas.map((area) => (
          <div key={area.area} className="min-w-0 text-[11px] leading-4 break-words hyphens-auto sm:text-sm sm:leading-5">
            <p className="font-semibold">{area.title}</p>
            <p className="text-muted-foreground">{levelWords(area.now.level)}{area.now.estimate ? ", estimate" : ""}</p>
          </div>
        ))}
      </div>
      <figcaption id="skyline-caption" className="mt-4 text-sm text-muted-foreground">
        Solid: proven or placed · Hatched: estimate from placement check{hasTargets ? " · Red line: direction target" : ""}
        <span className="sr-only">
          {" "}{areas.map((area) => `${area.title}: ${levelWords(area.now.level)}${area.now.estimate ? " (estimate)" : ""}${targets[area.area] ? `, target ${levelWords(targets[area.area]!)}` : ""}.`).join(" ")}
        </span>
      </figcaption>
    </figure>
  );
}
