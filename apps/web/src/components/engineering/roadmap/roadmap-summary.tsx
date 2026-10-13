"use client";

import { formatDate } from "@/components/lab/words";
import { Button } from "@/components/ui/button";
import type { RoadmapSummary as Summary } from "@/features/engineering-lab/roadmap-summary";
import { panel } from "../kit";
import { StatusIcon, statusWords } from "./status";

// A finished roadmap (docs/architecture/engineering-progressive-flow.md, section 4): the counts, the span, and each
// topic with the date and the owner's own words, then Plan next roadmap. The graph and lanes stay below it.

function span(summary: Summary) {
  const { startedAt, finishedAt } = summary;
  if (!startedAt || !finishedAt) return "None";
  const from = formatDate(startedAt);
  const to = formatDate(finishedAt);
  return from === to ? from : `${from}–${to}`;
}

export function RoadmapSummary({
  summary,
  onNew,
  onArchive,
  onSelect,
}: {
  summary: Summary;
  /** Plan next roadmap: New roadmap, which checks the limit first. */
  onNew: () => void;
  /** Archives this roadmap; null when it's already archived. */
  onArchive: (() => void) | null;
  onSelect: (topicId: string) => void;
}) {
  const facts = [
    ["Learned", String(summary.counts.learned)],
    ["Skipped", String(summary.counts.skipped)],
    ["Chapters", String(summary.counts.chapters)],
    ["Span", span(summary)],
  ];
  return (
    <section aria-labelledby="summary-title" className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h2 id="summary-title" className="font-semibold">
          Summary
        </h2>
        <div className="flex flex-wrap gap-2">
          {onArchive && (
            <Button type="button" size="sm" variant="outline" onClick={onArchive}>
              Archive
            </Button>
          )}
          <Button type="button" size="sm" onClick={onNew}>
            Plan next roadmap
          </Button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-5 p-4">
        {summary.chapters.map((chapter) => (
          <section key={chapter.title} aria-label={chapter.title}>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{chapter.title}</h3>
            <ul className="divide-y border-y">
              {chapter.topics.map((topic) => (
                <li key={topic.id} className="grid gap-1 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusIcon status={topic.status} size={14} />
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm font-medium text-foreground"
                      onClick={() => onSelect(topic.id)}
                    >
                      {topic.title}
                    </Button>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {statusWords[topic.status]}
                      {topic.at ? ` · ${formatDate(topic.at)}` : ""}
                    </span>
                  </div>
                  {topic.words && <p className="pl-5.5 text-xs leading-relaxed text-muted-foreground">{topic.words}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
