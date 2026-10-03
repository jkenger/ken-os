"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
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
  return <Question assessment={view} index={index} heading={`${position} OF ${total} · ${entry.topicTitle.toUpperCase()}`} onDone={onDone} />;
}

export function LabPractice({ email, daily }: { email: string; daily: DailyView | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function write() {
    setBusy(true); setProblem("");
    try { await post("/api/lab/daily"); router.refresh(); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Could not write today's set."); }
    finally { setBusy(false); }
  }

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[860px] border-x border-border px-5 py-8 sm:px-8 lg:py-10">
        <p className={label}>ENGINEERING LAB · TODAY&apos;S PRACTICE</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em]">{daily?.done ? "Done for today." : "Fifteen minutes, mixed."}</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
          Items mix topics on purpose: switching is what makes recall stick. Answers count as reviews, so a solid one pushes a review further out and a slip brings a topic back. No streaks; missing a day costs nothing.
        </p>
        {problem && <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
        {!daily ? (
          <Button size="lg" className="mt-8" disabled={busy} onClick={() => void write()}>{busy ? "Writing today's set..." : "Write today's set"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Button>
        ) : (
          <div className="mt-8 space-y-4">
            {daily.warmUp && <p className="rounded-lg bg-muted px-4 py-3 text-sm">A warm-up from topics in progress, until your first topic is proven.</p>}
            {daily.items.map((entry, index) => entry.type === "lab" ? (
              <article key={entry.labId} className="rounded-xl border border-border p-5">
                <p className={label}>{index + 1} OF {daily.items.length} · HANDS-ON FIX · {entry.topicTitle.toUpperCase()}</p>
                <p className="mt-2 text-[15px] font-semibold">{entry.labTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">Start again from the starter code and make the tests pass, without opening the solution.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button asChild variant="outline"><Link href={`/lab/topics/${entry.topicId}?step=lab`}>Open the lab</Link></Button>
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
