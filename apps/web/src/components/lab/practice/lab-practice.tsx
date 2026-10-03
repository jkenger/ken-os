"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import type { DailyItemView, DailyView } from "@/features/engineering-lab/daily";
import { Question, type AssessmentView } from "../topic/answers";
import { post } from "../topic/client";
import { label } from "../words";

// Daily practice, full screen. Design: docs/architecture/engineering-lab-v1.md section 9.

function PracticeQuestion({ entry, position, total, onDone }: { entry: DailyItemView; position: number; total: number; onDone: () => void }) {
  const index = entry.itemIndex!;
  const view: AssessmentView = {
    id: entry.assessmentId!, kind: "review", createdAt: "",
    items: Array.from({ length: index + 1 }, (_, item) => item === index ? { ...entry.item!, answered: entry.answered } : { mode: entry.item!.mode, prompt: "", code: null, answered: null }) as AssessmentView["items"],
  };
  return <Question assessment={view} index={index} heading={`${position} of ${total} · ${entry.topicTitle}`} onDone={onDone} />;
}

export function LabPractice({ email, daily }: { email: string; daily: DailyView | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function write() {
    setBusy(true); setProblem("");
    try { await post("/api/lab/daily"); router.refresh(); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't write today's practice. Try again"); }
    finally { setBusy(false); }
  }

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[860px] border-x border-border px-5 py-8 sm:px-8 lg:py-10">
        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em]">Today&apos;s practice</h1>
        <p className="mt-2 text-sm text-muted-foreground">{daily?.done ? "Done" : "~15 min"} · Mixed topics · answers count as reviews</p>
        <details className="group mt-3 text-sm">
          <DisclosureSummary className="text-muted-foreground">How this works</DisclosureSummary>
          <ul className="mt-2 list-disc space-y-1 pl-11 text-muted-foreground">
            <li>Topics are mixed on purpose: switching makes recall stick</li>
            <li>A solid answer pushes the next review out; a slip brings the topic back</li>
            <li>No streaks; missing a day costs nothing</li>
          </ul>
        </details>
        {problem && <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
        {!daily ? (
          <Button size="lg" className="mt-8" disabled={busy} onClick={() => void write()}>{busy ? "Writing…" : "Start practice"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Button>
        ) : (
          <div className="mt-8 space-y-4">
            {daily.warmUp && <p className="rounded-lg bg-muted px-4 py-3 text-sm">Warm-up until your first topic is proven</p>}
            {daily.items.map((entry, index) => entry.type === "lab" ? (
              <article key={entry.labId} className="rounded-xl border border-border p-5">
                <p className={label}>{index + 1} of {daily.items.length} · Lab fix · {entry.topicTitle}</p>
                <p className="mt-2 text-[15px] font-semibold">{entry.labTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">From the starter code, without the solution</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button asChild variant="outline"><Link href={`/lab/topics/${entry.topicId}?step=lab`}>Open lab</Link></Button>
                  {entry.passedToday && <Pill tone="solid" icon={<Check size={12} aria-hidden="true" />}>Passed today</Pill>}
                </div>
              </article>
            ) : entry.item ? (
              <PracticeQuestion key={`${entry.assessmentId}-${entry.itemIndex}`} entry={entry} position={index + 1} total={daily.items.length} onDone={() => router.refresh()} />
            ) : null)}
            <Button asChild variant="ghost"><Link href="/lab">Back to Today</Link></Button>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
