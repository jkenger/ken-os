"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import { isChapterDone } from "@/features/engineering-lab/topic-steps";
import { cn } from "@/lib/utils";
import { selectedSurface } from "../kit";
import { ChapterBar, ChapterMark, StepMark } from "./chapter-mark";
import { StatusIcon, statusWords } from "./status";

// The roadmap as lanes (docs/architecture/engineering-claude-first.md, section 1, and docs/architecture/roadmap-ui.md):
// one card per chapter in roadmap order, wrapping into as many columns as fit, with its topics listed inside. The topic
// you're on reads "Now"; the open topic has a dark outline. On a phone the cards stack. Chapter and topic
// numbers hang in a left margin outside one shared text edge, as a course catalog sets its course numbers; each topic's
// status icon closes its row.

export function RoadmapLanes({
  view,
  selected,
  onSelect,
}: {
  view: RoadmapView;
  selected: string | null;
  onSelect: (topicId: string) => void;
}) {
  const currentId = view.current?.id ?? null;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] items-start gap-3.5">
      {view.chapters.map((chapter, index) => {
        const learned = chapter.topics.filter((topic) => topic.status === "learned").length;
        const done = isChapterDone(chapter);
        return (
          <section
            key={chapter.id}
            aria-labelledby={`lane-${chapter.id}`}
            className="min-w-0 overflow-hidden rounded-xl border bg-card"
          >
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-y-2.5 px-3.5 pt-3.5 pb-3">
              <ChapterMark index={index} className="pt-0.5" />
              <div className="min-w-0">
                <h2 id={`lane-${chapter.id}`} className="font-heading text-[0.9375rem] leading-snug font-semibold">
                  {chapter.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {done ? "Done · " : ""}
                  {learned} of {chapter.topics.length} learned · {chapter.area}
                </p>
              </div>
              <div className="col-start-2">
                <ChapterBar index={index} learned={learned} total={chapter.topics.length} />
              </div>
            </div>
            <ul className="grid gap-px border-t px-1.5 pt-1 pb-2">
              {chapter.topics.map((topic, step) => {
                const isSelected = topic.id === selected;
                const isNow = topic.id === currentId;
                return (
                  <li key={topic.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onSelect(topic.id)}
                      aria-label={`${topic.title}, ${statusWords[topic.status]}${isNow ? ", now" : ""}${topic.custom ? ", added by Claude" : ""}`}
                      aria-pressed={isSelected}
                      className={cn(
                        "h-auto min-h-9 w-full justify-start gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-normal whitespace-normal",
                        isSelected && selectedSurface,
                        isNow && "font-semibold",
                        topic.status === "skipped" && "text-muted-foreground",
                      )}
                    >
                      <StepMark chapter={index} step={step} className="w-[1.625rem] shrink-0" />
                      <span className="min-w-0 flex-1">{topic.title}</span>
                      {isNow && (
                        <Badge variant="secondary" className="bg-topic-active-soft text-topic-active">
                          Now
                        </Badge>
                      )}
                      {topic.custom && (
                        <span className="text-xs font-normal text-muted-foreground" title="Added by Claude">
                          Claude
                        </span>
                      )}
                      <StatusIcon status={topic.status} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
