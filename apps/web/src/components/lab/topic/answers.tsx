"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { parsePredictedLines, type PracticePredict as PracticePredictItem, type RubricResult } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import type { SavedAnswer, TopicView } from "@/features/engineering-lab/store";
import { cn } from "@/lib/utils";
import { CodeBlock, Markdown } from "../markdown";
import { label, labelWords, modeWords, toneFor } from "../words";
import { post, realOutput, textarea } from "./client";
import { PredictionDiff, RubricChecklist } from "./feedback";

export function Tag({ value, children }: { value: string; children: React.ReactNode }) {
  return <Pill tone={toneFor(value)}>{children}</Pill>;
}

export function GradeTag({ label: grade, voided }: { label: string; voided: boolean }) {
  const solid = grade === "solid" && !voided;
  return <Pill tone={toneFor(voided ? "voided" : grade)} icon={solid ? <Check size={12} aria-hidden="true" /> : undefined}>{voided ? "Discarded" : labelWords[grade as keyof typeof labelWords] ?? grade}</Pill>;
}

function Confidence({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <fieldset className="my-[25px]">
      <legend className="mb-1 text-[13px] font-semibold">How sure are you?</legend>
      <p className="mb-[11px] text-xs text-muted-foreground">Not graded. Flags sure-but-wrong answers</p>
      <div className="flex w-[270px] max-w-full gap-2.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button key={rating} type="button" aria-pressed={value === rating} onClick={() => onChange(rating)}
            className={cn("h-10 w-[45px] rounded-lg border bg-card text-sm", value === rating ? "border-primary bg-secondary text-foreground" : "border-input hover:bg-accent")}>
            {rating}
          </button>
        ))}
      </div>
      <small className="mt-2 flex w-[270px] max-w-full justify-between text-[11px] text-muted-foreground"><span>1 · Guessing</span><span>5 · Very sure</span></small>
    </fieldset>
  );
}

/** Two boxes for a prediction: the printed lines, which code checks, and the reason, which is only saved. */
function PredictInputs({ lines, why, onLines, onWhy, tall }: { lines: string; why: string; onLines: (value: string) => void; onWhy: (value: string) => void; tall?: boolean }) {
  return (
    <>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold">Predicted output · one line per log</span>
        <textarea className={cn(textarea, tall ? "min-h-[110px]" : "min-h-[80px]", "font-mono")} spellCheck={false} value={lines} onChange={(event) => onLines(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="block text-sm font-semibold">Why</span>
        <span className="mb-2 block text-sm text-muted-foreground">Optional · not graded</span>
        <textarea className={cn(textarea, "min-h-[72px]")} value={why} onChange={(event) => onWhy(event.target.value)} />
      </label>
    </>
  );
}

export function YourAnswer({ answer, showLines = true }: { answer: SavedAnswer; showLines?: boolean }) {
  return (
    <div className="mt-3">
      {(showLines && answer.lines) || answer.text ? <p className="font-semibold">Answer</p> : null}
      {showLines && answer.lines && <pre className="mt-1 whitespace-pre-wrap font-mono text-[13px] leading-5">{answer.lines.join("\n") || "(nothing)"}</pre>}
      {answer.text && <p className="mt-1 whitespace-pre-wrap leading-5">{answer.text}</p>}
      {answer.why && <p className="mt-2 whitespace-pre-wrap leading-5"><span className="font-semibold">Why: </span>{answer.why}</p>}
    </div>
  );
}

/** Everything shown after a graded answer: the diff or rubric, your why, and the explanation. */
function Graded({ answer, explanation, rubric }: { answer: SavedAnswer; explanation?: string | null; rubric?: RubricResult[] | null }) {
  const predicted = answer.lines;
  return (
    <>
      {predicted && answer.actual ? <PredictionDiff actual={answer.actual} predicted={predicted} /> : <YourAnswer answer={{ ...answer, why: null }} />}
      {rubric && <RubricChecklist items={rubric} />}
      {answer.why && <p className="mt-3 whitespace-pre-wrap leading-5"><span className="font-semibold">Why: </span>{answer.why}</p>}
      <Explanation text={explanation} />
    </>
  );
}

export function Explanation({ text }: { text?: string | null }) {
  if (!text) return null;
  return <div className="mt-3 rounded-lg bg-muted p-4"><p className="mb-1 text-sm font-semibold">Why it prints this</p><Markdown text={text} /></div>;
}

export type AssessmentView = NonNullable<TopicView["assessment"]>;

/** What a submitted answer carries, for callers that send it somewhere other than the topic's attempts route. */
export interface AnswerPayload {
  selfRating: number;
  text?: string;
  lines?: string[];
  why?: string;
  actualOutput?: string[];
}

export function Question({ assessment, index, onDone, heading, submitTo }: {
  assessment: AssessmentView; index: number; onDone: (message: string) => void;
  /** Replaces "Question 2 of 3", for example in an adaptive assessment where the total isn't fixed. */
  heading?: string;
  submitTo?: (payload: AnswerPayload) => Promise<unknown>;
}) {
  const item = assessment.items[index];
  const [answer, setAnswer] = useState("");
  const [why, setWhy] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function submit() {
    if (!rating) { setProblem("Choose confidence first"); return; }
    setBusy(true); setProblem("");
    try {
      if (submitTo) {
        await submitTo(item.mode === "predict"
          ? { selfRating: rating, lines: parsePredictedLines(answer), ...(why.trim() ? { why: why.trim() } : {}), actualOutput: await realOutput(item.code ?? "") }
          : { selfRating: rating, text: answer });
        setAnswer(""); setWhy(""); setRating(null);
        onDone("Answer saved");
        return;
      }
      const body = item.mode === "predict"
        ? { type: "answer", assessmentId: assessment.id, itemIndex: index, selfRating: rating, response: { lines: parsePredictedLines(answer), ...(why.trim() ? { why: why.trim() } : {}) }, actualOutput: await realOutput(item.code ?? "") }
        : { type: "answer", assessmentId: assessment.id, itemIndex: index, selfRating: rating, response: { text: answer } };
      await post("/api/lab/attempts", body);
      onDone("Graded");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't submit. Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-lg border border-border p-5">
      <p className={label}>{heading ?? `Question ${index + 1} of ${assessment.items.length}`} · {modeWords[item.mode]}</p>
      <div className="mt-2"><Markdown text={item.prompt} /></div>
      {item.code && <div className="mt-3"><CodeBlock code={item.code} label={`Code for question ${index + 1}`} /></div>}
      {item.answered ? (
        <div className="mt-4 border-t border-border pt-4 text-sm" role="status">
          <div className="flex flex-wrap items-center gap-3"><GradeTag label={item.answered.label} voided={item.answered.voided} /><p className="leading-5">{item.answered.feedback}</p></div>
          <Graded answer={item.answered.answer} explanation={item.answered.explanation} rubric={item.answered.rubric} />
        </div>
      ) : (
        <>
          <Confidence value={rating} onChange={setRating} />
          {item.mode === "predict" ? <PredictInputs lines={answer} why={why} onLines={setAnswer} onWhy={setWhy} tall /> : (
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold">Answer</span>
              <textarea className={cn(textarea, "min-h-[130px]")} value={answer} onChange={(event) => setAnswer(event.target.value)} />
            </label>
          )}
          {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
          <Button type="button" className="mt-3" disabled={busy || !answer.trim()} onClick={() => void submit()}>{busy ? "Grading…" : "Submit"}</Button>
        </>
      )}
    </article>
  );
}

export type PracticeResult = TopicView["practiceResults"][number];

export function PracticePredict({ lessonId, index, item, result, onDone }: {
  lessonId: string; index: number; item: PracticePredictItem; result?: PracticeResult; onDone: (message: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [why, setWhy] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const solid = result?.label === "solid" && !result.voided;

  async function check() {
    setBusy(true); setProblem("");
    try {
      await post("/api/lab/attempts", { type: "practice", lessonId, practiceIndex: index, lines: parsePredictedLines(answer), why, actualOutput: await realOutput(item.code) });
      setRetrying(false);
      onDone("Checked");
    } catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't check. Try again"); }
    finally { setBusy(false); }
  }
  function tryAgain() {
    setAnswer(result?.answer.lines?.join("\n") ?? "");
    setWhy(result?.answer.why ?? "");
    setRetrying(true);
  }

  return (
    <div>
      <div className="[&_p]:text-lg [&_p]:leading-7"><Markdown text={item.prompt} /></div>
      <div className="mt-4"><CodeBlock code={item.code} label={`Code for practice ${index + 1}`} /></div>
      {result && !retrying ? (
        <div className="mt-5 rounded-xl border border-border p-5 text-sm" role="status">
          <div className="flex flex-wrap items-center gap-3"><GradeTag label={result.label} voided={result.voided} /><p className="leading-5">{result.feedback}</p></div>
          <Graded answer={result.answer} explanation={item.explanation} />
          {!solid && <Button type="button" size="sm" variant="outline" className="mt-4" onClick={tryAgain}><RotateCcw size={14} aria-hidden="true" />Try again</Button>}
        </div>
      ) : (
        <>
          <PredictInputs lines={answer} why={why} onLines={setAnswer} onWhy={setWhy} tall />
          {problem && <p className="mt-2 text-sm" role="alert">{problem}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={busy || !answer.trim()} onClick={() => void check()}>{busy ? "Running…" : "Run to check"}</Button>
            {retrying && <Button type="button" variant="ghost" disabled={busy} onClick={() => setRetrying(false)}>Cancel</Button>}
          </div>
        </>
      )}
    </div>
  );
}
