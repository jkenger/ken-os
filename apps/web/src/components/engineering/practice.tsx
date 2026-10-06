"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconCheck, IconCircle, IconCircleDot } from "@tabler/icons-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Explanation, YourAnswer } from "@/components/lab/topic/answers";
import { post } from "@/components/lab/topic/client";
import { PredictionDiff, RubricChecklist } from "@/components/lab/topic/feedback";
import { labelWords, modeWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import type { DailyItemView, DailyView } from "@/features/engineering-lab/daily";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { eyebrow, Notice, PageHeading, panel, primaryButton, secondaryButton, textButton } from "./kit";
import { Feedback, FlowLayout, FlowNotes, QuestionPanel, questionPanel, SuccessView, type QuestionPayload } from "./flow";

// Today's practice, as the selected 2026-10-06 prototype lays it out: one review at a time beside a notes column, then
// a summary. Questions are graded for real and count as reviews; on a topic that isn't proven yet they never prove it.
// Design: docs/architecture/engineering-lab-v1.md section 9.

const page = "mx-auto max-w-[1500px] px-3 pb-9 pt-6 md:px-5 md:pt-[30px] min-[1500px]:pt-9";

function isDone(entry: DailyItemView) {
  return entry.type === "lab" ? entry.passedToday : Boolean(entry.answered);
}

function Answered({ entry }: { entry: DailyItemView }) {
  const answered = entry.answered!;
  return (
    <>
      {answered.answer.lines && answered.answer.actual ? <PredictionDiff actual={answered.answer.actual} predicted={answered.answer.lines} /> : <YourAnswer answer={{ ...answered.answer, why: null }} />}
      {answered.rubric && <RubricChecklist items={answered.rubric} />}
      <Explanation text={answered.explanation} />
    </>
  );
}

export function EngineeringPractice({ email, daily, closedBook = false }: { email: string; daily: DailyView | null; closedBook?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const items = daily?.items ?? [];
  const firstOpen = items.findIndex((entry) => !isDone(entry));
  const [index, setIndex] = useState(firstOpen === -1 ? Math.max(items.length - 1, 0) : firstOpen);
  const entry = items[index];
  // A finished day opens on its summary; "Review answers" walks back through it.
  const [finished, setFinished] = useState(Boolean(daily?.done) && firstOpen === -1);

  async function write() {
    setBusy(true); setProblem("");
    try { await post("/api/lab/daily"); router.refresh(); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't write today's practice. Try again"); }
    finally { setBusy(false); }
  }

  async function submit(payload: QuestionPayload) {
    await post("/api/lab/attempts", {
      type: "answer", assessmentId: entry.assessmentId, itemIndex: entry.itemIndex, selfRating: payload.selfRating,
      response: payload.lines ? { lines: payload.lines, ...(payload.why ? { why: payload.why } : {}) } : { text: payload.text ?? "" },
      ...(payload.actualOutput ? { actualOutput: payload.actualOutput } : {}),
    });
    router.refresh();
  }

  const next = () => (index + 1 < items.length ? setIndex(index + 1) : setFinished(true));
  const nextLabel = index + 1 < items.length ? "Next review" : "Finish practice";
  const kicker = `Review ${index + 1} of ${items.length} · ~15 min total`;

  return (
    <WorkspaceShell email={email} active="lab" tab="practice" termLookup={!closedBook}>
      <div className={page}>
        <PageHeading title="Today's practice" />
        {closedBook ? (
          <section className={cn(panel, "mx-[5px] max-w-[850px] p-[23px] md:mx-3.5 md:p-8")}>
            <div className={eyebrow}>Practice</div>
            <h2 className="my-3 text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">Paused</h2>
            <p className="mb-[18px] text-sm text-muted-foreground">Resumes after the assessment</p>
            <Link href={engineering.assessment()} className={secondaryButton}>Back to assessment</Link>
          </section>
        ) : !daily ? (
          <FlowLayout>
            <section className={questionPanel}>
              <div className={eyebrow}>Practice · Not started</div>
              <h2 className="my-3 text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">Mixed review</h2>
              <p className="mb-[18px] text-sm leading-[1.55] text-muted-foreground">Recall, one small fix and an explanation · ~15 min</p>
              {problem && <Notice tone="error">{problem}</Notice>}
              <button type="button" className={primaryButton} disabled={busy} onClick={() => void write()}>{busy ? "Writing… ~20 s" : "Start practice"}<IconArrowRight size={18} aria-hidden="true" /></button>
            </section>
            <Notes items={[]} index={-1} />
          </FlowLayout>
        ) : finished ? (
          <Summary daily={daily} onRestart={() => { setFinished(false); setIndex(0); }} />
        ) : entry ? (
          <FlowLayout>
            {entry.type === "lab" ? (
              <section className={questionPanel}>
                <div className={eyebrow}>{kicker}</div>
                <h2 className="my-3 text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">{entry.labTitle}</h2>
                <p className="mb-[18px] text-[15px] leading-[1.6] text-muted-foreground">Lab fix · {entry.topicTitle} · from the starter code, without the solution</p>
                {entry.passedToday && <Notice tone="success">Passed today</Notice>}
                <div className="flex flex-wrap items-center gap-5">
                  <Link href={engineering.topic(entry.topicId, "lab")} className={entry.passedToday ? secondaryButton : primaryButton}>Open lab<IconArrowRight size={18} aria-hidden="true" /></Link>
                  <button type="button" className={textButton} onClick={next}>{entry.passedToday ? nextLabel : "Skip for now"}</button>
                </div>
              </section>
            ) : entry.item ? (
              <QuestionPanel
                key={`${entry.assessmentId}-${entry.itemIndex}-${entry.answered ? "done" : "open"}`}
                draftKey={`daily:${entry.assessmentId}:${entry.itemIndex}`}
                kicker={`${kicker} · ${entry.topicTitle}`}
                title={modeWords[entry.item.mode] ?? "Question"}
                item={entry.item}
                submitLabel="Check response"
                locked={Boolean(entry.answered)}
                onSubmit={submit}
                after={entry.answered ? (
                  <Feedback
                    badge={<Pill tone={toneFor(entry.answered.voided ? "voided" : entry.answered.label)}>{entry.answered.voided ? "Discarded" : labelWords[entry.answered.label as keyof typeof labelWords] ?? entry.answered.label}</Pill>}
                    title={entry.answered.feedback}
                    action={<button type="button" className={primaryButton} onClick={next}>{nextLabel}<IconArrowRight size={18} aria-hidden="true" /></button>}
                  >
                    <Answered entry={entry} />
                  </Feedback>
                ) : <Feedback title="Grading…" />}
              />
            ) : null}
            <Notes items={items} index={index} onPick={setIndex} />
          </FlowLayout>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

function Notes({ items, index, onPick }: { items: DailyItemView[]; index: number; onPick?: (index: number) => void }) {
  return (
    <FlowNotes title="Mixed review">
      {items.length > 0 && (
        <ol className="mt-2">
          {items.map((entry, position) => (
            <li key={position}>
              <button type="button" onClick={() => onPick?.(position)} aria-current={position === index ? "step" : undefined}
                className={cn("flex w-full items-center gap-3 border-b border-border py-[13px] text-left text-[13px]", position === index && "font-semibold text-foreground")}>
                {isDone(entry) ? <IconCheck size={18} className="shrink-0 text-status-solid" aria-label="Done" /> : position === index ? <IconCircleDot size={18} className="shrink-0" aria-label="Current" /> : <IconCircle size={18} className="shrink-0" aria-hidden="true" />}
                <span className="min-w-0 flex-1 truncate">{entry.type === "lab" ? `Lab fix · ${entry.topicTitle}` : entry.topicTitle}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4">Due reviews come first, then stale proofs, open misconceptions and a topic in progress.</p>
      <p className="mt-3">Confidence helps spot uncertainty. It never replaces evidence. No streaks; missing a day costs nothing.</p>
      <Link href={engineering.overview} className={cn(textButton, "mt-3")}>Save & exit</Link>
    </FlowNotes>
  );
}

function Summary({ daily, onRestart }: { daily: DailyView; onRestart: () => void }) {
  const questions = daily.items.filter((item) => item.type === "question");
  const answered = questions.filter((item) => item.answered);
  const solid = answered.filter((item) => item.answered!.label === "solid" && !item.answered!.voided).length;
  return (
    <section className={cn(panel, "mx-[5px] max-w-[850px] p-[23px] md:mx-3.5 md:p-8")}>
      <SuccessView title={daily.done ? "Today's practice complete" : "Practice saved"} action={<Link href={engineering.overview} className={primaryButton}>Back to overview<IconArrowRight size={18} aria-hidden="true" /></Link>}>
        {answered.length} of {questions.length} answered · {solid} solid. Solid answers push the next review out; a slip brings the topic back.
      </SuccessView>
      <button type="button" className={textButton} onClick={onRestart}>Review answers</button>
    </section>
  );
}
