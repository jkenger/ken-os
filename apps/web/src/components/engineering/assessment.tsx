"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowRight, IconCheck, IconCircle, IconCircleDot } from "@tabler/icons-react";
import { QUESTION_KIND_LABELS, WEEKLY_HOURS, type Area, type IntakeAnswers } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CodeBlock, Markdown } from "@/components/lab/markdown";
import { post } from "@/components/lab/topic/client";
import { RubricChecklist } from "@/components/lab/topic/feedback";
import { labelWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import type { AnswerView, RunView } from "@/features/engineering-lab/assessment-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { Back, eyebrow, Notice, PageHeading, panel } from "./kit";
import { Confidence, Dialog, Feedback, field, fieldLabel, FlowLayout, FlowNotes, NoteList, ProgressTrack, questionPanel, SessionHeading } from "./flow";
import { Button } from "@/components/ui/button";
import { Label as FieldLabel } from "@/components/ui/label"; // Label is also the domain grade type
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

// Intake, then the 5-question assessment. Spec: docs/architecture/engineering-rebuild.md, section 3.
// Closed-book: the shell hides term lookup while a run is open, and lessons stay closed on the server.

const page = "mx-auto max-w-7xl px-3 pb-9 pt-6 md:px-5 md:pt-7.5";

export interface AreaName { id: Area; title: string }

function Shell({ email, children, closedBook }: { email: string; children: React.ReactNode; closedBook: boolean }) {
  return <WorkspaceShell email={email} active="lab" tab="profile" termLookup={!closedBook}><div className={page}>{children}</div></WorkspaceShell>;
}

export function Intake({ email, intake, roles }: { email: string; intake: IntakeAnswers | null; roles: { id: string; title: string }[] }) {
  const router = useRouter();
  const [values, setValues] = useState<IntakeAnswers>(intake ?? { building: "", role: roles[0]?.id ?? "", weeklyHours: 5 });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const hoursValid = Number.isInteger(values.weeklyHours) && values.weeklyHours >= WEEKLY_HOURS.min && values.weeklyHours <= WEEKLY_HOURS.max;
  const valid = values.building.trim().length >= 3 && Boolean(values.role) && hoursValid;

  async function start() {
    setBusy(true); setProblem("");
    try {
      await post("/api/lab/intake", values);
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
      setBusy(false);
    }
  }

  return (
    <Shell email={email} closedBook={false}>
      <Back href={engineering.overview}>Overview</Back>
      <PageHeading title="Intake" />
      <FlowLayout>
        <section className={cn(panel, "p-6 md:p-7.5")}>
          <FieldLabel className={cn(fieldLabel, "mb-6.5")}>
            What you&apos;re building
            <Textarea className={cn(field, "min-h-27.5 resize-y leading-relaxed")} value={values.building} onChange={(event) => setValues({ ...values, building: event.target.value })} />
          </FieldLabel>
          <FieldLabel className={cn(fieldLabel, "mb-6.5")}>
            Role you&apos;re aiming for
            <NativeSelect className="mt-2.5 w-full" value={values.role} onChange={(event) => setValues({ ...values, role: event.target.value })}>
              {roles.map((role) => <NativeSelectOption key={role.id} value={role.id}>{role.title}</NativeSelectOption>)}
            </NativeSelect>
            <span className="mt-2 block text-xs font-normal text-muted-foreground">Change it after the assessment</span>
          </FieldLabel>
          <FieldLabel className={cn(fieldLabel, "mb-6.5")}>
            Hours per week
            <Input type="number" min={WEEKLY_HOURS.min} max={WEEKLY_HOURS.max} className="mt-2.5 max-w-[160px]" value={Number.isNaN(values.weeklyHours) ? "" : values.weeklyHours}
              onChange={(event) => setValues({ ...values, weeklyHours: event.target.value === "" ? Number.NaN : Number(event.target.value) })} />
          </FieldLabel>
          {problem && <Notice tone="error">{problem}</Notice>}
          <Button type="button" disabled={busy || !valid} onClick={() => void start()}>
            {busy ? "Starting…" : "Continue to assessment"}<IconArrowRight size={18} aria-hidden="true" />
          </Button>
        </section>
        <FlowNotes title="How this works">
          <NoteList items={["No timer", "Pause between questions", "Confidence is separate from correctness", "Intake isn't graded"]} />
        </FlowNotes>
      </FlowLayout>
    </Shell>
  );
}

function RulesDialog() {
  return (
    <Dialog title="How this works" trigger="How this works">
      <NoteList items={[
        "No timer",
        "Closed-book: lessons and term lookup are hidden until you finish",
        "Choose how sure you are before submitting",
        "Answers lock on submit",
        "Pause any time with Save & exit",
      ]} />
    </Dialog>
  );
}

function AreaList({ run, areas }: { run: RunView; areas: AreaName[] }) {
  const current = run.position.kind === "done" ? -1 : run.position.index;
  return (
    <FlowNotes title="Areas">
      <ol className="mt-2">
        {run.questions.map((question) => {
          const done = run.answers.some((answer) => answer.index === question.index && answer.label);
          const here = question.index === current;
          return (
            <li key={question.index} className={cn("flex items-center gap-3 border-b border-border py-3.5 text-xs", here && "font-semibold text-foreground")} aria-current={here ? "step" : undefined}>
              {done ? <IconCheck size={18} className="shrink-0 text-foreground" aria-label="Done" />
                : here ? <IconCircleDot size={18} className="shrink-0" aria-label="Current" />
                  : <IconCircle size={18} className="shrink-0" aria-hidden="true" />}
              <span className="flex-1">{areas.find((area) => area.id === question.area)?.title ?? question.area}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4">Closed-book: lessons and term lookup are hidden</p>
    </FlowNotes>
  );
}

function Graded({ answer }: { answer: AnswerView }) {
  return (
    <>
      {answer.rubric && <RubricChecklist items={answer.rubric} />}
    </>
  );
}

/** One question: answer and confidence lock on submit, then the grade shows. */
function Question({ run, index, areas, onDone }: { run: RunView; index: number; areas: AreaName[]; onDone: (answer: AnswerView, graded: boolean) => void }) {
  const question = run.questions[index];
  const predict = question.kind === "predict";
  const draftKey = `ken-draft:run:${run.id}:${index}`;
  const [answer, setAnswer] = useState("");
  const [output, setOutput] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(draftKey) ?? "null") as { answer?: string; output?: string } | null;
      if (saved?.answer) setAnswer(saved.answer);
      if (saved?.output) setOutput(saved.output);
    } catch { /* storage unavailable: start empty */ }
  }, [draftKey]);

  useEffect(() => {
    try {
      if (answer || output) window.localStorage.setItem(draftKey, JSON.stringify({ answer, output }));
      else window.localStorage.removeItem(draftKey);
    } catch { /* storage unavailable: nothing to keep */ }
  }, [draftKey, answer, output]);

  async function submit() {
    if (!rating) return;
    setBusy(true); setProblem("");
    try {
      const result = await post<{ answer: AnswerView; graded: boolean }>(`/api/lab/runs/${run.id}/answers`, { index, answer, output: predict ? output : undefined, selfRating: rating });
      try { window.localStorage.removeItem(draftKey); } catch { /* nothing to clear */ }
      onDone(result.answer, result.graded);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
      setBusy(false);
    }
  }

  const area = areas.find((item) => item.id === question.area)?.title ?? question.area;
  return (
    <section className={questionPanel}>
      <div className={eyebrow}>{area} · {QUESTION_KIND_LABELS[question.kind]}</div>
      <div className="mt-3 text-sm leading-relaxed md:text-base [&_p]:text-foreground"><Markdown text={question.prompt} /></div>
      {question.code && <div className="mt-4"><CodeBlock code={question.code} label="Question code" /></div>}
      {predict && (
        <FieldLabel className={cn(fieldLabel, "mt-6.5")}>
          Output
          <Textarea className={cn(field, "min-h-22.5 resize-y font-mono leading-relaxed")} spellCheck={false} placeholder="One line each" value={output} onChange={(event) => setOutput(event.target.value)} />
        </FieldLabel>
      )}
      <FieldLabel className={cn(fieldLabel, "mt-6.5")}>
        Answer
        <Textarea className={cn(field, "min-h-32.5 resize-y leading-relaxed")} value={answer} onChange={(event) => setAnswer(event.target.value)} />
      </FieldLabel>
      <Confidence value={rating} onChange={setRating} />
      {problem && <Notice tone="error">{problem}</Notice>}
      <Button type="button" disabled={busy || answer.trim().length < 10 || !rating || (predict && !output.trim())} onClick={() => void submit()}>
        {busy ? "Grading…" : "Submit"}<IconArrowRight size={18} aria-hidden="true" />
      </Button>
    </section>
  );
}

/** A submitted answer, locked: the grade and feedback, or the retry when grading failed. */
function Answered({ run, answer, areas, last }: { run: RunView; answer: AnswerView; areas: AreaName[]; last: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState(answer);
  const [busy, setBusy] = useState(false);
  const question = run.questions[answer.index];
  const area = areas.find((item) => item.id === question.area)?.title ?? question.area;

  async function retry() {
    setBusy(true);
    try {
      const result = await post<{ answer: AnswerView; graded: boolean }>(`/api/lab/runs/${run.id}/answers/${answer.index}/grade`);
      setCurrent(result.answer);
      if (!result.graded) toast({ tone: "error", title: "Couldn't grade. Try again" });
    } catch (error) {
      toast({ tone: "error", title: "Couldn't grade. Try again", description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (last) {
      toast({ tone: "success", title: "Assessment finished" });
      router.push(engineering.results(run.id));
      return;
    }
    router.refresh();
  }

  return (
    <section className={questionPanel}>
      <div className={eyebrow}>{area} · {QUESTION_KIND_LABELS[question.kind]}</div>
      <div className="mt-3 text-sm leading-relaxed md:text-base [&_p]:text-foreground"><Markdown text={question.prompt} /></div>
      {question.code && <div className="mt-4"><CodeBlock code={question.code} label="Question code" /></div>}
      {current.output && <><p className="mt-5 text-xs font-semibold">Output</p><pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 font-mono text-xs">{current.output.join("\n")}</pre></>}
      <p className="mt-5 text-xs font-semibold">Answer · Confidence {current.selfRating} of 5</p>
      <blockquote className="mt-2 whitespace-pre-wrap border-l-[3px] border-primary/40 pl-4 text-sm leading-relaxed">{current.answer}</blockquote>
      {current.label ? (
        <Feedback
          badge={<Pill tone={toneFor(current.label)}>{labelWords[current.label]}</Pill>}
          title={current.feedback ?? ""}
          action={<Button type="button" onClick={next}>{last ? "Finish assessment" : "Next question"}<IconArrowRight size={18} aria-hidden="true" /></Button>}
        >
          <Graded answer={current} />
        </Feedback>
      ) : (
        <Feedback
          title="Couldn't grade. Your answer is saved"
          action={(
            <div className="flex flex-wrap items-center gap-4">
              <Button type="button" disabled={busy} onClick={() => void retry()}>{busy ? "Grading…" : "Retry"}</Button>
              <Button asChild variant="link"><Link href={engineering.overview}>Save & exit</Link></Button>
            </div>
          )}
        />
      )}
    </section>
  );
}

export function Assessment({ email, run, areas }: { email: string; run: RunView; areas: AreaName[] }) {
  const [shown, setShown] = useState<AnswerView | null>(null);
  // A fresh run from the server (after Next question) replaces the answer shown from the last submit.
  const answeredCount = run.answers.length;
  useEffect(() => setShown(null), [answeredCount]);
  const total = run.questions.length;
  const graded = run.answers.filter((answer) => answer.label).length;
  const position = run.position;
  // The answer to show: one just submitted, or a saved one still waiting on its grade.
  const waiting = position.kind === "grading" ? run.answers.find((answer) => answer.index === position.index) ?? null : null;
  const answered = shown ?? waiting;
  const index = answered ? answered.index : position.kind === "question" ? position.index : total - 1;

  return (
    <Shell email={email} closedBook={!run.completedAt}>
      <SessionHeading
        left={<Link href={engineering.overview} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground md:text-xs"><IconArrowLeft size={17} aria-hidden="true" />Save & exit</Link>}
        middle={`Question ${index + 1} of ${total}`}
        right={<RulesDialog />}
      />
      <ProgressTrack done={graded} total={total} />
      <FlowLayout>
        {answered ? (
          <Answered key={`${answered.index}-${answered.label ?? "saved"}`} run={run} answer={answered} areas={areas} last={answered.index === total - 1} />
        ) : position.kind === "question" ? (
          <Question key={position.index} run={run} index={position.index} areas={areas} onDone={(answer) => setShown(answer)} />
        ) : (
          <section className={questionPanel}>
            <h2 className="text-2xl font-bold tracking-tight">Assessment complete</h2>
            <Button asChild className="mt-5"><Link href={engineering.results(run.id)}>View results<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
          </section>
        )}
        <AreaList run={run} areas={areas} />
      </FlowLayout>
    </Shell>
  );
}
