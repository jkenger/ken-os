import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { QUESTION_KIND_LABELS, type AssessmentQuestion } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { labelWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import type { AnswerView } from "@/features/engineering-lab/assessment-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { PageHeading, panel } from "./kit";
import type { AreaName } from "./assessment";
import { Button } from "@/components/ui/button";

// Results after an assessment. Spec: docs/architecture/engineering-rebuild.md, section 3 (Results).

export interface ResultsItem { index: number; question: AssessmentQuestion; answer: AnswerView | null }

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn(panel, "p-4.5 md:p-5.5")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 text-3xl font-bold tracking-tight">{value}</dd>
    </div>
  );
}

export function Results({ email, runId, items, areas }: { email: string; runId: string; items: ResultsItem[]; areas: AreaName[] }) {
  const answered = items.filter((item) => item.answer);
  const solid = answered.filter((item) => item.answer?.label === "solid").length;
  return (
    <WorkspaceShell email={email} active="lab" tab="profile">
      <div className="mx-auto max-w-5xl px-3 pb-9 pt-6 md:px-5 md:pt-7.5">
        <PageHeading title="Assessment complete" />
        <dl className="mx-1.5 mb-6 grid grid-cols-3 gap-3 md:mx-3.5">
          <Count label="Areas assessed" value={new Set(answered.map((item) => item.question.area)).size} />
          <Count label="Answers" value={answered.length} />
          <Count label="Solid answers" value={solid} />
        </dl>
        <ol className={cn(panel, "mx-1.5 md:mx-3.5")}>
          {items.map((item) => (
            <li key={item.index} className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 first:border-t-0 md:flex-nowrap">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{areas.find((area) => area.id === item.question.area)?.title} · {QUESTION_KIND_LABELS[item.question.kind]}</p>
                <p className="mt-1 text-xs font-medium">{item.question.prompt}</p>
              </div>
              {item.answer?.label ? <Pill tone={toneFor(item.answer.label)}>{labelWords[item.answer.label]}</Pill> : <Pill tone="neutral">Not graded</Pill>}
              <span className="shrink-0 text-xs text-muted-foreground">{item.answer ? `Confidence ${item.answer.selfRating} of 5` : "No answer"}</span>
            </li>
          ))}
        </ol>
        <div className="mx-1.5 mt-6 flex flex-wrap items-center gap-5 md:mx-3.5">
          <Button asChild><Link href={engineering.direction}>Choose direction<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
          <Button asChild variant="link"><Link href={engineering.evidence(runId)}>View evidence</Link></Button>
        </div>
      </div>
    </WorkspaceShell>
  );
}
