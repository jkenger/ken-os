import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Panel, Stat, TitleBar } from "@/components/lab/panel";
import { formatDate, kindWords, labelWords, modeWords, toneFor } from "@/components/lab/words";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import type { EvidenceRole, EvidenceView } from "@/features/engineering-lab/evidence";
import { engineering } from "@/features/engineering-lab/routes";

// One graded answer exactly as recorded: the question as asked, the answer, confidence, grade, rubric and how it was
// graded. Read only. Design: docs/architecture/engineering-redesign.md, decision D7.

const roleWords: Record<EvidenceRole, string> = {
  proof: "Counts toward proof",
  placement: "Placement evidence",
  practice: "Practice · Not proof",
  legacy: "1 Oct summary · Not evidence",
  voided: "Thrown out · Question was wrong",
};

const gradedWords = { code: "Checked by running code", assessor: "Graded against the rubric", baseline: "Imported summary" } as const;
const rubricWords = { covered: "Covered", partly: "Partly", missed: "Missed" } as const;

function Lines({ lines }: { lines: string[] }) {
  return <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-5">{lines.join("\n") || " "}</pre>;
}

export function EngineeringEvidence({ email, view, closedBook = false }: { email: string; view: EvidenceView; closedBook?: boolean }) {
  const { question, response, result } = view;
  return (
    <WorkspaceShell email={email} active="lab" tab="profile" termLookup={!closedBook}>
      <div className="w-full max-w-[960px] px-5 py-6 sm:px-8">
        <Button asChild size="sm" variant="ghost" className="-ml-2 mb-2"><Link href={engineering.profile}><ArrowLeft size={14} aria-hidden="true" />Profile</Link></Button>
        <TitleBar
          kicker={`${kindWords[view.kind]} · ${modeWords[view.mode] ?? view.mode}`}
          title={view.topicTitle}
          stats={<>
            <Stat label="Answered" value={formatDate(view.at)} />
            {view.selfRating !== null && <Stat label="Confidence" value={`${view.selfRating} of 5`} />}
            <Stat label="Counts as" value={roleWords[view.role]} />
          </>}
          actions={<Button asChild size="sm" variant="outline"><Link href={engineering.topic(view.topicId)}>Open topic</Link></Button>}
        />

        <div className="mt-4 space-y-4">
          <Panel title="Question">
            {question.labTitle && !question.prompt && <p className="text-sm font-semibold">{question.labTitle}</p>}
            {question.prompt && <p className="whitespace-pre-wrap text-sm leading-6">{question.prompt}</p>}
            {question.code && <div className="mt-3"><CodeEditor value={question.code} readOnly label="Question code" /></div>}
          </Panel>

          <Panel title="Your answer">
            {response.lines && <><p className="mb-1 text-xs text-muted-foreground">Predicted output</p><Lines lines={response.lines} /></>}
            {response.why && <><p className="mb-1 mt-3 text-xs text-muted-foreground">Your why · Not graded</p><p className="whitespace-pre-wrap text-sm leading-6">{response.why}</p></>}
            {response.text && <p className="whitespace-pre-wrap text-sm leading-6">{response.text}</p>}
            {response.code && <CodeEditor value={response.code} readOnly label="Submitted code" />}
            {!response.lines && !response.text && !response.code && <p className="text-sm text-muted-foreground">No answer text</p>}
          </Panel>

            <Panel title="Result" meta={gradedWords[result.gradedBy]}>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={toneFor(result.label)}>{labelWords[result.label]}</Pill>
                {result.solutionSeen && <Pill tone="neutral">Solution seen first</Pill>}
              </div>
              {result.feedback && <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{result.feedback}</p>}
              {response.actual && <><p className="mb-1 mt-4 text-xs text-muted-foreground">What the code printed</p><Lines lines={response.actual} /></>}
              {question.expectedOutput && <><p className="mb-1 mt-4 text-xs text-muted-foreground">Expected when the question was written</p><Lines lines={question.expectedOutput} /></>}
              {result.run && <p className="mt-4 text-sm">Tests · {result.run.passed} passed, {result.run.failed} failed</p>}
              {result.rubric?.length ? (
                <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
                  {result.rubric.map((item, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 py-2">
                      <span className="leading-6">{item.point}</span>
                      <Pill tone={item.result === "covered" ? "solid" : item.result === "partly" ? "partial" : "gap"}>{rubricWords[item.result]}</Pill>
                    </li>
                  ))}
                </ul>
              ) : question.rubric?.length ? (
                <><p className="mb-1 mt-4 text-xs text-muted-foreground">Rubric</p><ul className="list-disc space-y-1 pl-5 text-sm leading-6">{question.rubric.map((point) => <li key={point}>{point}</li>)}</ul></>
              ) : null}
              {result.misconceptions.length > 0 && (
                <><p className="mb-1 mt-4 text-xs text-muted-foreground">Misconceptions</p><ul className="list-disc space-y-1 pl-5 text-sm leading-6">{result.misconceptions.map((item) => <li key={item}>{item}</li>)}</ul></>
              )}
            </Panel>

          {view.source && (
            <details className="group rounded-xl bg-card shadow-panel px-4 py-3 text-sm">
              <DisclosureSummary className="font-semibold">Record</DisclosureSummary>
              <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5">
                <dt className="text-muted-foreground">Written for</dt><dd>{view.source.runKind ? kindWords[view.source.runKind] : view.source.origin === "daily" ? "Today's practice" : "Topic page"}</dd>
                <dt className="text-muted-foreground">Question version</dt><dd className="font-mono text-xs leading-5">{view.source.promptVersion}</dd>
                <dt className="text-muted-foreground">Model</dt><dd className="font-mono text-xs leading-5">{view.source.model}</dd>
                <dt className="text-muted-foreground">Answer id</dt><dd className="font-mono text-xs leading-5">{view.id}</dd>
              </dl>
            </details>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
