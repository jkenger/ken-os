"use client";

import { Button } from "@/components/ui/button";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import { cn } from "@/lib/utils";
import { StatusIcon, statusWords } from "./status";

// The roadmap as lanes (docs/architecture/engineering-claude-first.md, section 1): chapters as columns in roadmap order,
// topics stacked in each. Columns scroll sideways on wide screens and stack on a phone.

export function RoadmapLanes({
  view,
  selected,
  onSelect,
}: {
  view: RoadmapView;
  selected: string | null;
  onSelect: (topicId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:auto-cols-[minmax(13rem,1fr)] md:grid-flow-col md:overflow-x-auto md:pb-2">
      {view.chapters.map((chapter, index) => {
        const learned = chapter.topics.filter((topic) => topic.status === "learned").length;
        return (
          <section key={chapter.id} aria-label={chapter.title} className="min-w-0">
            <h2 className="text-xs font-semibold">
              {index + 1} · {chapter.title}
            </h2>
            <p className="mb-2 text-xs text-muted-foreground">
              {chapter.area} · {learned} of {chapter.topics.length} learned
            </p>
            <ul className="grid gap-1.5">
              {chapter.topics.map((topic) => (
                <li key={topic.id}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSelect(topic.id)}
                    aria-label={`${topic.title}, ${statusWords[topic.status]}${topic.custom ? ", added by Claude" : ""}`}
                    aria-pressed={topic.id === selected}
                    className={cn(
                      "h-auto w-full justify-start gap-2 py-2 text-left text-xs whitespace-normal",
                      topic.id === selected && "border-ring ring-2 ring-ring/40",
                      topic.status === "skipped" && "text-muted-foreground",
                    )}
                  >
                    <StatusIcon status={topic.status} size={14} />
                    <span className="min-w-0 flex-1">{topic.title}</span>
                    {topic.custom && <span className="text-muted-foreground">Claude</span>}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
