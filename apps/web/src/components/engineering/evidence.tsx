import { QUESTION_KIND_LABELS } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CodeBlock, Markdown } from "@/components/lab/markdown";
import { RubricChecklist } from "@/components/lab/topic/feedback";
import { formatDate, labelWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import type { AreaName } from "./assessment";
import { Back, eyebrow, PageHeading, panel } from "./kit";
import type { ResultsItem } from "./results";

// One assessment's evidence: each question, answer, confidence, grade, feedback, rubric and grader version.
// Spec: docs/architecture/engineering-rebuild.md, section 3 (Profile). A taken assessment never changes.

export function Evidence({ email, completedAt, items, areas }: { email: string; completedAt: string | null; items: ResultsItem[]; areas: AreaName[] }) {
  return (
    <WorkspaceShell email={email} active="lab" tab="profile">
      <div className="mx-auto max-w-[1000px] px-3 pb-9 pt-6 md:px-5 md:pt-[30px]">
        <Back href={engineering.profile}>Profile</Back>
        <PageHeading title="Evidence" badge={completedAt ? formatDate(completedAt) : "In progress"} />
        <ol className="mx-[5px] space-y-4 md:mx-3.5">
          {items.map((item) => (
            <li key={item.index} className={cn(panel, "p-[23px] md:p-[28px]")}>
              <div className={eyebrow}>{areas.find((area) => area.id === item.question.area)?.title} · {QUESTION_KIND_LABELS[item.question.kind]}</div>
              <div className="text-[15px] leading-[1.6] [&_p]:text-foreground"><Markdown text={item.question.prompt} /></div>
              {item.question.code && <div className="mt-3"><CodeBlock code={item.question.code} label="Question code" /></div>}
              {item.answer ? (
                <>
                  {item.answer.output && <><p className="mt-5 text-[13px] font-semibold">Output</p><pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 font-mono text-[13px]">{item.answer.output.join("\n")}</pre></>}
                  <p className="mt-5 text-[13px] font-semibold">Answer · Confidence {item.answer.selfRating} of 5</p>
                  <blockquote className="mt-2 whitespace-pre-wrap border-l-[3px] border-rail-soft pl-[15px] text-sm leading-[1.6]">{item.answer.answer}</blockquote>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {item.answer.label ? <Pill tone={toneFor(item.answer.label)}>{labelWords[item.answer.label]}</Pill> : <Pill tone="neutral">Not graded</Pill>}
                    {item.answer.feedback && <span className="text-sm text-muted-foreground">{item.answer.feedback}</span>}
                  </div>
                  {item.answer.rubric && <RubricChecklist items={item.answer.rubric} />}
                  <p className="mt-3 text-xs text-muted-foreground">Answered {formatDate(item.answer.answeredAt)}{item.answer.graderVersion ? ` · Grader ${item.answer.graderVersion}` : ""}</p>
                </>
              ) : <p className="mt-4 text-[13px] text-muted-foreground">No answer</p>}
            </li>
          ))}
        </ol>
      </div>
    </WorkspaceShell>
  );
}
