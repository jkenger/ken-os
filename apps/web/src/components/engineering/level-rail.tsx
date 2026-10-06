import { LEVELS, levelRank, type Level } from "@ken-os/domain";
import { levelWords } from "@/components/lab/words";
import { cn } from "@/lib/utils";

/**
 * Junior, mid and senior as three segments: filled up to where the evidence is, the target outlined. An estimate is
 * hatched rather than filled, so a level resting on placement checks never looks the same as a proven one. The words
 * underneath always say the same thing, so colour and fill never carry meaning alone.
 */
export function LevelRail({ current, target, estimate, className }: { current: Level | null; target: Level | null; estimate: boolean; className?: string }) {
  const reached = levelRank(current);
  const aim = levelRank(target);
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex gap-1" aria-hidden="true">
        {LEVELS.map((level, index) => (
          <span
            key={level}
            className={cn(
              "h-2 flex-1 rounded-[2px]",
              index <= reached ? (estimate ? "bg-[repeating-linear-gradient(135deg,var(--foreground)_0_2px,transparent_2px_5px)]" : "bg-foreground") : "bg-border",
              index === aim && index > reached && "outline-dashed outline-1 outline-offset-1 outline-foreground",
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs">
        <span className="font-semibold">{levelWords(current)}</span>
        {estimate && current && <span className="text-muted-foreground"> · Estimate</span>}
      </p>
    </div>
  );
}
