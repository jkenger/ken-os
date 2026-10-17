import { chapterTone } from "@/features/engineering-lab/roadmap-layout";
import { cn } from "@/lib/utils";

// A chapter's accent (docs/architecture/roadmap-ui.md): one of six colours in roadmap order, so chapters are easy to
// tell apart in Lanes and Graph. Chapter colours never mean a status. Class names are spelled out for Tailwind.

const tones = {
  1: { tile: "bg-chapter-1-soft text-chapter-1", fill: "bg-chapter-1" },
  2: { tile: "bg-chapter-2-soft text-chapter-2", fill: "bg-chapter-2" },
  3: { tile: "bg-chapter-3-soft text-chapter-3", fill: "bg-chapter-3" },
  4: { tile: "bg-chapter-4-soft text-chapter-4", fill: "bg-chapter-4" },
  5: { tile: "bg-chapter-5-soft text-chapter-5", fill: "bg-chapter-5" },
  6: { tile: "bg-chapter-6-soft text-chapter-6", fill: "bg-chapter-6" },
} as const;

/** The accent classes for the chapter at this 0-based position. */
export function chapterClasses(index: number) {
  return tones[chapterTone(index)];
}

/** The chapter's number on its accent, as in "01". */
export function ChapterMark({ index, className }: { index: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-medium",
        chapterClasses(index).tile,
        className,
      )}
    >
      {String(index + 1).padStart(2, "0")}
    </span>
  );
}

/** A thin bar for how much of a chapter is learned, in the chapter's accent. */
export function ChapterBar({ index, learned, total }: { index: number; learned: number; total: number }) {
  const percent = total ? Math.round((learned / total) * 100) : 0;
  return (
    <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", chapterClasses(index).fill)} style={{ width: `${percent}%` }} />
    </div>
  );
}
