"use client";

import type { ReactNode } from "react";
import type { TopicStatus } from "@ken-os/domain";
import { DotSeparator } from "@/components/dot-separator";
import { formatDate } from "@/features/engineering-lab/words";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import type { RoadmapSummary } from "@/features/engineering-lab/roadmap-summary";
import { nextTopic } from "@/features/engineering-lab/topic-steps";
import { StatusIcon, statusWords } from "./status";

// The roadmap's progress line (docs/architecture/roadmap-ui.md): learned out of total, the topic you're on, the one
// after it, and the roadmap's size. Every number comes from the roadmap view; nothing is estimated.

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-card px-4 py-3">
      <p className="panel-head">{label}</p>
      {children}
    </div>
  );
}

function TopicCell({
  label,
  topic,
  onSelect,
}: {
  label: string;
  topic: { id: string; title: string; status: TopicStatus; chapter: string };
  onSelect: (topicId: string) => void;
}) {
  return (
    <Cell label={label}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSelect(topic.id)}
        className="-mx-2 h-auto min-w-0 justify-start gap-2 px-2 py-1 text-left text-sm font-semibold whitespace-normal"
      >
        <StatusIcon status={topic.status} />
        <span className="min-w-0">{topic.title}</span>
      </Button>
      <p className="text-xs text-muted-foreground">
        {statusWords[topic.status]}
        <DotSeparator />
        {topic.chapter}
      </p>
    </Cell>
  );
}

export function RoadmapProgress({
  view,
  summary,
  onSelect,
}: {
  view: RoadmapView;
  summary: RoadmapSummary | null;
  onSelect: (topicId: string) => void;
}) {
  const { counts, current, chapters } = view;
  const percent = summary ? 100 : counts.total ? Math.round((counts.learned / counts.total) * 100) : 0;
  const after = current ? nextTopic(chapters, current.id) : null;
  const findTopic = (topicId: string) => {
    for (const chapter of chapters) {
      const topic = chapter.topics.find((item) => item.id === topicId);
      if (topic) return { ...topic, chapter: chapter.title };
    }
    return null;
  };
  const next = after ? findTopic(after.id) : null;
  return (
    // Columns follow the strip's own width, not the window's, so it stays two across beside the docked topic panel.
    <div className="@container">
      <section
        aria-label="Progress"
        className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border @lg:grid-cols-2 @3xl:grid-cols-4"
      >
        <Cell label={summary ? "Complete" : "Progress"}>
          <p className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tracking-tight tabular-nums">
              {counts.learned} of {counts.total}
            </span>
            <span className="text-sm text-muted-foreground">learned</span>
          </p>
          <div className="flex items-center gap-2.5">
            <Progress value={percent} aria-label={`${counts.learned} of ${counts.total} learned`} className="flex-1" />
            <span className="font-mono text-xs text-muted-foreground">{percent}%</span>
          </div>
        </Cell>
        {current && !summary ? (
          <TopicCell label="Now" topic={{ ...current }} onSelect={onSelect} />
        ) : (
          <Cell label="Finished">
            <p className="text-sm font-semibold">
              {summary?.finishedAt ? formatDate(summary.finishedAt) : "Nothing in progress"}
            </p>
          </Cell>
        )}
        {next && next.id !== current?.id ? (
          <TopicCell label="Next" topic={next} onSelect={onSelect} />
        ) : (
          <Cell label="Next">
            <p className="text-sm font-semibold">{summary ? "Every topic is done" : "Nothing after this"}</p>
          </Cell>
        )}
        <Cell label="Roadmap">
          <p className="text-sm font-semibold">
            {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
          </p>
          <p className="text-xs text-muted-foreground">
            {counts.inProgress} in progress
            <DotSeparator />
            {counts.skipped} skipped
          </p>
        </Cell>
      </section>
    </div>
  );
}
