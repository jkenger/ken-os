"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CodeBlock, Markdown } from "@/components/lab/markdown";
import { post } from "@/components/lab/topic/client";
import { RubricChecklist } from "@/components/lab/topic/feedback";
import { formatDate, labelWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import type { PracticeView } from "@/features/engineering-lab/practice-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { eyebrow, Notice, PageHeading, panel } from "./kit";
import {
  Confidence,
  Feedback,
  field,
  fieldLabel,
  FlowLayout,
  FlowNotes,
  ProgressTrack,
  questionPanel,
  SessionHeading,
  SuccessView,
} from "./flow";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Practice. Spec: docs/architecture/engineering-rebuild.md, section 3 (Practice). No streaks, points or penalties.

const page = "mx-auto max-w-7xl px-3 pb-9 pt-6 md:px-5 md:pt-7.5";

function Start({ count, minutes }: { count: number; minutes: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  async function start() {
    setBusy(true);
    setProblem("");
    try {
      await post("/api/lab/practice");
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't start practice. Try again");
      setBusy(false);
    }
  }
  return (
    <section className={cn(panel, "mx-1.5 max-w-3xl p-6 md:mx-3.5 md:p-8")}>
      {count ? (
        <>
          <h2 className="text-2xl font-bold tracking-tight">{count} ready</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">~{minutes} min</p>
          {problem && <Notice tone="error">{problem}</Notice>}
          <Button type="button" className="mt-5" disabled={busy} onClick={() => void start()}>
            {busy ? "Writing questions… ~1 min" : "Start practice"}
            <IconArrowRight size={18} aria-hidden="true" />
          </Button>
        </>
      ) : (
        <>
          <h2 className="text-base font-semibold">Nothing to practice yet</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">Topics you start or prove come back here</p>
          <Button asChild className="mt-5">
            <Link href={engineering.learn}>Open Learn</Link>
          </Button>
        </>
      )}
    </section>
  );
}

function Summary({ practice }: { practice: PracticeView }) {
  return (
    <div className="mx-1.5 md:mx-3.5">
      <SuccessView title={`Practice done · ${practice.items.length} answers`} />
      <ul className={cn(panel, "max-w-3xl")}>
        {practice.items.map((item) => (
          <li
            key={item.questionId}
            className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 first:border-t-0"
          >
            <Link
              href={engineering.topic(item.topicId)}
              className="min-w-0 flex-1 text-xs font-medium hover:text-primary"
            >
              {item.topicTitle}
            </Link>
            {item.answered && <Pill tone={toneFor(item.answered.label)}>{labelWords[item.answered.label]}</Pill>}
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.answered?.nextReviewAt ? `Next review ${formatDate(item.answered.nextReviewAt)}` : "No review date"}
            </span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6">
        <Link href={engineering.overview}>Back to overview</Link>
      </Button>
    </div>
  );
}

function Session({ practice }: { practice: PracticeView }) {
  const router = useRouter();
  const total = practice.items.length;
  const firstOpen = practice.items.findIndex((item) => !item.answered);
  const [index, setIndex] = useState(firstOpen < 0 ? total - 1 : firstOpen);
  const [answer, setAnswer] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const item = practice.items[index];
  const done = practice.items.filter((entry) => entry.answered).length;
  const last = index === total - 1;

  async function check() {
    if (!rating) return;
    setBusy(true);
    setProblem("");
    try {
      await post("/api/lab/practice/answer", { questionId: item.questionId, answer, selfRating: rating });
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't grade. Try again");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setAnswer("");
    setRating(null);
    setProblem("");
    if (last) {
      router.push(`${engineering.practice}?summary=1`);
      router.refresh();
      return;
    }
    setIndex(index + 1);
  }

  return (
    <>
      <SessionHeading
        left={
          <Link
            href={engineering.overview}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground md:text-xs"
          >
            <IconArrowLeft size={17} aria-hidden="true" />
            Overview
          </Link>
        }
        middle={`Review ${index + 1} of ${total}`}
      />
      <ProgressTrack done={done} total={total} />
      <FlowLayout>
        <section className={questionPanel}>
          <div className={eyebrow}>
            Review {index + 1} of {total} · {item.topicTitle}
          </div>
          <div className="mt-3 text-sm leading-relaxed md:text-base [&_p]:text-foreground">
            <Markdown text={item.prompt} />
          </div>
          {item.code && (
            <div className="mt-4">
              <CodeBlock code={item.code} label="Question code" />
            </div>
          )}
          {item.answered ? (
            <Feedback
              badge={<Pill tone={toneFor(item.answered.label)}>{labelWords[item.answered.label]}</Pill>}
              title={item.answered.feedback}
              action={
                <Button type="button" onClick={next}>
                  {last ? "Finish practice" : "Next review"}
                  <IconArrowRight size={18} aria-hidden="true" />
                </Button>
              }
            >
              <RubricChecklist items={item.answered.rubric} />
              <p className="mt-4 text-sm font-semibold text-foreground">Reference answer</p>
              <div className="mt-1.5">
                <Markdown text={item.answered.referenceAnswer} />
              </div>
            </Feedback>
          ) : (
            <>
              <Label className={cn(fieldLabel, "mt-6.5")}>
                Answer
                <Textarea
                  className={cn(field, "min-h-32.5 resize-y leading-relaxed")}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                />
              </Label>
              <Confidence value={rating} onChange={setRating} />
              {problem && <Notice tone="error">{problem}</Notice>}
              <Button
                type="button"
                disabled={busy || answer.trim().length < 10 || !rating}
                onClick={() => void check()}
              >
                {busy ? "Grading…" : "Check"}
              </Button>
            </>
          )}
        </section>
        <FlowNotes title="Today">
          <ol className="mt-2">
            {practice.items.map((entry, position) => (
              <li
                key={entry.questionId}
                className={cn(
                  "flex items-center justify-between gap-3 border-b border-border py-3 text-xs",
                  position === index && "font-semibold text-foreground",
                )}
              >
                <span>{entry.topicTitle}</span>
                {entry.answered && <span className="text-xs font-normal">{labelWords[entry.answered.label]}</span>}
              </li>
            ))}
          </ol>
          <Button asChild variant="link" className="mt-5">
            <Link href={engineering.overview}>Save & exit</Link>
          </Button>
        </FlowNotes>
      </FlowLayout>
    </>
  );
}

export function Practice({
  email,
  practice,
  candidates,
  minutes,
  summary,
  closedBook,
}: {
  email: string;
  practice: PracticeView | null;
  candidates: number;
  minutes: number;
  summary: boolean;
  closedBook: boolean;
}) {
  return (
    <WorkspaceShell email={email} active="lab" tab="practice" termLookup={!closedBook}>
      <div className={page}>
        <PageHeading title="Practice" />
        {/* After the last answer its feedback shows first; Finish practice opens the summary. */}
        {!practice ? (
          <Start count={candidates} minutes={minutes} />
        ) : practice.done && summary ? (
          <Summary practice={practice} />
        ) : (
          <Session practice={practice} />
        )}
      </div>
    </WorkspaceShell>
  );
}
