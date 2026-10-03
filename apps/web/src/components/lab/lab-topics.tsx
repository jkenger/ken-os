"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleDashed } from "lucide-react";
import { isKnown, isUnassessed, type TopicMap, type TopicProgress, type Track } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { post } from "./topic/client";
import { label, statusWords, toneFor } from "./words";

type Row =
  | { kind: "written"; id: string; title: string; progress: TopicProgress; locked: boolean; assessable: boolean }
  | { kind: "planned"; title: string };

/** Known for the outline: proven, passed a placement check, or rated solid by the baseline. */
function knownHere(progress: TopicProgress) {
  return isKnown(progress) || progress.baselineLabel === "solid";
}

function StatusFor({ row }: { row: Extract<Row, { kind: "written" }> }) {
  const { progress } = row;
  if (progress.status === "VALIDATED") return <Pill tone="solid" icon={<Check size={12} aria-hidden="true" />}>Proven</Pill>;
  if (knownHere(progress) && progress.status === "NOT_STARTED") return <Pill tone="neutral">Known · skip</Pill>;
  if (isUnassessed(progress)) return <Pill tone="quiet" icon={<CircleDashed size={12} aria-hidden="true" />}>Not assessed yet</Pill>;
  if (row.locked) return <Pill tone="neutral">Waiting on prerequisites</Pill>;
  return <Pill tone={toneFor(progress.status)}>{statusWords[progress.status]}</Pill>;
}

/**
 * The whole course as a table of contents: tracks, then chapters, then topics, including ones not written yet.
 * "My gaps only" hides what assessment says you already know; topics nobody has assessed stay, with a placement check.
 */
export function LabTopics({ email, map, progress, assessable }: { email: string; map: TopicMap; progress: TopicProgress[]; assessable: string[] }) {
  const router = useRouter();
  const [trackId, setTrackId] = useState<Track>(map.tracks[0]?.id ?? "fullstack");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [placing, setPlacing] = useState("");
  const [problem, setProblem] = useState("");
  const byId = new Map(progress.map((item) => [item.topicId, item]));
  const track = map.tracks.find((item) => item.id === trackId)!;
  const chapters = map.modules.filter((module) => module.track === trackId).map((module) => {
    const rows: Row[] = [
      ...map.topics.filter((topic) => topic.module === module.id).map((topic): Row => {
        const item = byId.get(topic.id)!;
        return {
          kind: "written", id: topic.id, title: topic.title, progress: item, assessable: assessable.includes(topic.id),
          locked: item.status === "NOT_STARTED" && topic.requires.some((id) => !isKnown(byId.get(id)!)),
        };
      }),
      ...module.planned.map((title): Row => ({ kind: "planned", title })),
    ];
    return { module, rows };
  });
  const written = chapters.flatMap((chapter) => chapter.rows).filter((row): row is Extract<Row, { kind: "written" }> => row.kind === "written");
  const total = chapters.reduce((sum, chapter) => sum + chapter.rows.length, 0);
  const proven = written.filter((row) => row.progress.status === "VALIDATED").length;
  const gaps = written.filter((row) => !knownHere(row.progress)).length;

  async function place(topicId: string) {
    setPlacing(topicId); setProblem("");
    try {
      await post(`/api/lab/topics/${topicId}/assessment`, { kind: "placement" });
      router.push(`/lab/topics/${topicId}?step=check`);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not write the placement check.");
      setPlacing("");
    }
  }

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] border-x border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <p className={label}>ENGINEERING LAB · COURSE</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">The whole course, in order.</h1>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-border">
          <div role="tablist" aria-label="Tracks" className="flex gap-1">
            {map.tracks.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={item.id === trackId} onClick={() => setTrackId(item.id)}
                className={cn("-mb-px border-b-2 px-4 py-3 text-sm font-semibold", item.id === trackId ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.title}</button>
            ))}
          </div>
          <div className="mb-2 flex items-center gap-3 text-sm font-semibold">
            <span id="gaps-label">My gaps only</span>
            <button type="button" role="switch" aria-checked={gapsOnly} aria-labelledby="gaps-label" onClick={() => setGapsOnly(!gapsOnly)}
              className={cn("relative h-6 w-11 rounded-full transition-colors", gapsOnly ? "bg-primary" : "bg-input")}>
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform", gapsOnly ? "translate-x-[22px]" : "translate-x-0.5")} />
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
          <p className="max-w-[560px] text-[15px] text-muted-foreground">{track.summary}</p>
          <p className="text-sm"><strong>{proven}</strong> of {total} proven{written.length ? <> · <strong>{gaps}</strong> gaps to close</> : null}</p>
        </div>
        {gapsOnly && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm">Showing only gaps: topics that the baseline, a placement check or a proof hasn&apos;t shown you know. Topics nobody has assessed yet stay, with a placement check.</p>}
        {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}

        <div className="mt-6 space-y-9">
          {chapters.map(({ module, rows }, chapterIndex) => {
            const writtenRows = rows.filter((row) => row.kind === "written");
            const done = writtenRows.filter((row) => row.kind === "written" && knownHere(row.progress)).length;
            const shown = gapsOnly ? rows.filter((row) => row.kind === "written" && !knownHere(row.progress)) : rows;
            const plannedCount = rows.length - writtenRows.length;
            return (
              <section key={module.id} aria-labelledby={`${module.id}-title`}>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <p className={label}>CHAPTER {chapterIndex + 1}</p>
                    <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]" id={`${module.id}-title`}>{module.title}</h2>
                  </div>
                  <div className="w-44 text-right text-sm">
                    {writtenRows.length ? <>{done} of {rows.length} known or proven</> : <span className="text-muted-foreground">Not written yet</span>}
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true"><div className="h-full bg-status-solid" style={{ width: `${(done / rows.length) * 100}%` }} /></div>
                  </div>
                </div>
                {shown.length > 0 && (
                  <ol className="divide-y divide-border">
                    {shown.map((row) => {
                      const number = `${chapterIndex + 1}.${rows.indexOf(row) + 1}`;
                      if (row.kind === "planned") {
                        return (
                          <li key={row.title} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                            <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">{number}</span>
                            <span className="min-w-0 flex-1 text-[15px] text-muted-foreground">{row.title}</span>
                            <Pill tone="neutral">Not written yet</Pill>
                          </li>
                        );
                      }
                      return (
                        <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                          <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">{number}</span>
                          <Link href={`/lab/topics/${row.id}`} className="min-w-0 flex-1 text-[15px] font-semibold underline-offset-4 hover:underline">{row.title}</Link>
                          <span className="flex flex-wrap items-center gap-2">
                            {isUnassessed(row.progress) && row.assessable && (
                              <Button type="button" size="sm" variant="outline" disabled={placing !== ""} onClick={() => void place(row.id)}>
                                {placing === row.id ? "Writing questions..." : "Placement check"}
                              </Button>
                            )}
                            <StatusFor row={row} />
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
                {gapsOnly && (
                  !writtenRows.length ? <p className="py-3 text-sm text-muted-foreground">{plannedCount} topics planned, not written yet.</p>
                    : !shown.length ? <p className="py-3 text-sm text-muted-foreground">No gaps here: everything written is known or proven.</p>
                      : plannedCount ? <p className="pb-1 pt-2 text-sm text-muted-foreground">Plus {plannedCount} not written yet.</p> : null
                )}
              </section>
            );
          })}
        </div>
      </div>
    </WorkspaceShell>
  );
}
