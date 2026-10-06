"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleDashed } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import type { DailyItemView, DailyView } from "@/features/engineering-lab/daily";
import { cn } from "@/lib/utils";
import { Panel, Stat, TitleBar } from "../panel";
import { Question, type AssessmentView } from "../topic/answers";
import { post } from "../topic/client";
import { labelWords, toneFor } from "../words";
import { engineering } from "@/features/engineering-lab/routes";

// Today's practice. Design: docs/architecture/engineering-lab-v1.md section 9. Laid out in the lab's tight bordered
// layout (panel.tsx): the items in a reading-width column, with a panel listing them and where each stands.

function PracticeQuestion({ entry, position, total, onDone }: { entry: DailyItemView; position: number; total: number; onDone: () => void }) {
  const index = entry.itemIndex!;
  const view: AssessmentView = {
    id: entry.assessmentId!, kind: "review", createdAt: "",
    items: Array.from({ length: index + 1 }, (_, item) => item === index ? { ...entry.item!, answered: entry.answered } : { mode: entry.item!.mode, prompt: "", code: null, answered: null }) as AssessmentView["items"],
  };
  return <Question assessment={view} index={index} heading={`${position} of ${total} · ${entry.topicTitle}`} onDone={onDone} />;
}

/** Where one item stands, as a word: a grade once answered, "Passed today" for a lab, otherwise "Ready". */
function ItemState({ entry }: { entry: DailyItemView }) {
  if (entry.type === "lab") {
    return entry.passedToday
      ? <Pill tone="solid" icon={<Check size={12} aria-hidden="true" />}>Passed today</Pill>
      : <Pill tone="quiet" icon={<CircleDashed size={12} aria-hidden="true" />}>Ready</Pill>;
  }
  if (!entry.answered) return <Pill tone="quiet" icon={<CircleDashed size={12} aria-hidden="true" />}>Ready</Pill>;
  if (entry.answered.voided) return <Pill tone="neutral">Discarded</Pill>;
  return <Pill tone={toneFor(entry.answered.label)}>{labelWords[entry.answered.label as keyof typeof labelWords] ?? entry.answered.label}</Pill>;
}

export function LabPractice({ email, daily, closedBook = false }: { email: string; daily: DailyView | null; closedBook?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const questions = daily?.items.filter((item) => item.type === "question") ?? [];
  const answered = questions.filter((item) => item.answered).length;

  async function write() {
    setBusy(true); setProblem("");
    try { await post("/api/lab/daily"); router.refresh(); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't write today's practice. Try again"); }
    finally { setBusy(false); }
  }

  return (
    <WorkspaceShell email={email} active="lab" tab="practice" termLookup={!closedBook}>
      <div className="w-full px-5 py-6 sm:px-8">
        <TitleBar
          title="Today's practice"
          stats={<>
            <Stat label="State" value={daily?.done ? "Done" : daily ? `${answered} of ${questions.length} answered` : "Not started"} />
            <Stat label="Time" value="~15 min" />
          </>}
          actions={<Button asChild size="sm" variant="outline"><Link href={engineering.overview}>Overview</Link></Button>}
        />
        {problem && <p className="mt-4 rounded-md border border-border px-4 py-2.5 text-sm" role="alert">{problem}</p>}

        {!daily ? (
          <Panel className="mt-4 max-w-[760px] border-foreground" title="Today's practice · Not started" meta="Mixed topics · answers count as reviews">
            <HowItWorks />
            <Button className="mt-4" disabled={busy} onClick={() => void write()}>{busy ? "Writing…" : "Start practice"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Button>
          </Panel>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,880px)_280px] lg:items-start">
            <div className="min-w-0 space-y-4">
              {daily.warmUp && <p className="rounded-md border border-border px-4 py-2.5 text-sm">Warm-up until your first topic is proven</p>}
              {daily.items.map((entry, index) => entry.type === "lab" ? (
                <Panel key={entry.labId} id={`item-${index}`} title={`${index + 1} of ${daily.items.length} · Lab fix · ${entry.topicTitle}`}>
                  <p className="text-[15px] font-semibold">{entry.labTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">From the starter code, without the solution</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button asChild variant="outline"><Link href={engineering.topic(entry.topicId, "lab")}>Open lab</Link></Button>
                    {entry.passedToday && <Pill tone="solid" icon={<Check size={12} aria-hidden="true" />}>Passed today</Pill>}
                  </div>
                </Panel>
              ) : entry.item ? (
                <div key={`${entry.assessmentId}-${entry.itemIndex}`} id={`item-${index}`} className="scroll-mt-6">
                  <PracticeQuestion entry={entry} position={index + 1} total={daily.items.length} onDone={() => router.refresh()} />
                </div>
              ) : null)}
            </div>
            <aside className="lg:sticky lg:top-6">
              <Panel title="Items" meta="Mixed topics · answers count as reviews" bodyClassName="p-0">
                <ol className="divide-y divide-border">
                  {daily.items.map((entry, index) => (
                    <li key={entry.type === "lab" ? entry.labId : `${entry.assessmentId}-${entry.itemIndex}`}>
                      <a href={`#item-${index}`} className={cn("flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/60")}>
                        <span className="min-w-0 truncate"><span className="text-muted-foreground">{index + 1}.</span> {entry.type === "lab" ? `Lab fix · ${entry.topicTitle}` : entry.topicTitle}</span>
                        <ItemState entry={entry} />
                      </a>
                    </li>
                  ))}
                </ol>
                <div className="border-t border-border px-4 py-3"><HowItWorks /></div>
              </Panel>
            </aside>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

function HowItWorks() {
  return (
    <details className="group text-sm">
      <DisclosureSummary className="text-muted-foreground">How this works</DisclosureSummary>
      <ul className="mt-2 list-disc space-y-1 pl-11 text-muted-foreground">
        <li>Topics are mixed on purpose: switching makes recall stick</li>
        <li>A solid answer pushes the next review out; a slip brings the topic back</li>
        <li>No streaks; missing a day costs nothing</li>
      </ul>
    </details>
  );
}
