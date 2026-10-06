"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import { parsePredictedLines, type Label, type RubricResult } from "@ken-os/domain";
import { CodeBlock, Markdown } from "@/components/lab/markdown";
import { post, realOutput } from "@/components/lab/topic/client";
import { RubricChecklist } from "@/components/lab/topic/feedback";
import { labelWords, modeWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import type { RunAnswerView, RunQuestion } from "@/features/engineering-lab/assessment-run";
import { cn } from "@/lib/utils";
import { eyebrow, Notice, primaryButton, textButton } from "./kit";
import { Confidence, field, fieldLabel, questionPanel } from "./flow";

// The assessment as a conversation with the Assessor (docs/architecture/engineering-assessment-v2.md, A5). The code
// still decides every question, grade and stop; the conversation only frames them. A written answer may get one
// clarifying follow-up from the grader before it's graded; the reply joins the same answer, so it's graded once.

export interface ChatGrade { label: Label; feedback: string; rubric: RubricResult[] | null; voided: boolean }

function Assessor({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[640px]">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Assessor</p>
      <div className="rounded-[5px] border border-border bg-tint px-4 py-3 text-[15px] leading-[1.6] [&_p]:text-foreground">{children}</div>
    </div>
  );
}

function You({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto max-w-[560px]">
      <p className="mb-1 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">You</p>
      <div className="whitespace-pre-wrap rounded-[5px] border border-input bg-card px-4 py-3 text-[15px] leading-[1.6]">{children}</div>
    </div>
  );
}

function GradeReply({ grade }: { grade: ChatGrade }) {
  return (
    <Assessor>
      <Pill tone={toneFor(grade.voided ? "voided" : grade.label)}>{grade.voided ? "Discarded · the question was wrong" : labelWords[grade.label]}</Pill>
      <p className="mt-2">{grade.feedback}</p>
      {grade.rubric && <RubricChecklist items={grade.rubric} />}
    </Assessor>
  );
}

/** What this chapter has already been through: each question, your answer and the reply. */
export function ChatHistory({ answers }: { answers: RunAnswerView[] }) {
  return (
    <>
      {answers.map((answer, index) => (
        <div key={index} className="space-y-3">
          <Assessor><p className="text-xs text-muted-foreground">{modeWords[answer.mode] ?? answer.mode}</p><Markdown text={answer.prompt} /></Assessor>
          <You>{answer.answer || "(no text)"}</You>
          <GradeReply grade={{ label: answer.label, feedback: answer.feedback, rubric: answer.rubric, voided: answer.voided }} />
        </div>
      ))}
    </>
  );
}

export function AssessorChat({ kicker, current, history, onSubmit, onNext, nextLabel }: {
  kicker: string;
  current: RunQuestion;
  history: RunAnswerView[];
  /** Sends the answer. Returns a follow-up question, or the grade. */
  onSubmit: (payload: { selfRating: number; text?: string; lines?: string[]; why?: string; actualOutput?: string[]; allowClarify: boolean }) => Promise<{ clarify: string } | { grade: ChatGrade }>;
  onNext: () => void;
  nextLabel: string;
}) {
  const item = current.item;
  const predict = item.mode === "predict";
  const draftKey = `ken-draft:run:${current.id}:${current.itemIndex}`;
  const [answer, setAnswer] = useState("");
  const [why, setWhy] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [followUp, setFollowUp] = useState<{ question: string; original: string } | null>(null);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [grade, setGrade] = useState<ChatGrade | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(draftKey) ?? "null") as { answer?: string; why?: string } | null;
      if (saved?.answer) setAnswer(saved.answer);
      if (saved?.why) setWhy(saved.why);
    } catch { /* storage unavailable: start empty */ }
  }, [draftKey]);
  useEffect(() => {
    if (grade) return;
    try {
      if (answer || why) window.localStorage.setItem(draftKey, JSON.stringify({ answer, why }));
      else window.localStorage.removeItem(draftKey);
    } catch { /* nothing to keep */ }
  }, [draftKey, answer, why, grade]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [followUp, grade]);

  async function send(text: string | null, options: { allowClarify: boolean; shown: string }) {
    if (!rating) return;
    setBusy(true); setProblem("");
    try {
      const result = predict
        ? await onSubmit({ selfRating: rating, lines: parsePredictedLines(answer), ...(why.trim() ? { why: why.trim() } : {}), actualOutput: await realOutput(item.code ?? ""), allowClarify: false })
        : await onSubmit({ selfRating: rating, text: text ?? "", allowClarify: options.allowClarify });
      if ("clarify" in result) {
        setFollowUp({ question: result.clarify, original: text ?? "" });
        setSent(options.shown);
        return;
      }
      setSent(options.shown);
      setGrade(result.grade);
      try { window.localStorage.removeItem(draftKey); } catch { /* nothing to clear */ }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't send. Try again");
    } finally {
      setBusy(false);
    }
  }

  const submitFirst = () => void send(predict ? null : answer, { allowClarify: true, shown: predict ? answer : answer });
  const dontKnow = () => void send("I don't know this yet.", { allowClarify: false, shown: "I don't know this yet." });
  const submitReply = () => {
    if (!followUp) return;
    const combined = `${followUp.original}\n\nFollow-up: ${followUp.question}\nMy answer: ${reply}`;
    void send(combined, { allowClarify: false, shown: reply });
  };

  return (
    <section className={questionPanel} aria-label="Assessment conversation">
      <div className={eyebrow}>{kicker}</div>
      <div className="mt-3 space-y-4" aria-live="polite">
        <ChatHistory answers={history} />
        <Assessor>
          {item.lead && <p className="mb-2">{item.lead}</p>}
          <p className="text-xs text-muted-foreground">{modeWords[item.mode] ?? item.mode}</p>
          <Markdown text={item.prompt} />
          {item.code && <div className="mt-3"><CodeBlock code={item.code} label="Question code" /></div>}
        </Assessor>
        {followUp && <You>{followUp.original}</You>}
        {followUp && <Assessor><p>{followUp.question}</p></Assessor>}
        {sent !== null && (grade || !followUp) && <You>{sent}</You>}
        {grade && <GradeReply grade={grade} />}
        <div ref={end} />
      </div>

      {problem && <Notice tone="error"><strong className="font-semibold">Couldn&apos;t send</strong><p className="mt-1">{problem}. Your answer is still here</p></Notice>}

      {grade ? (
        <button type="button" className={cn(primaryButton, "mt-6")} onClick={onNext}>{nextLabel}<IconArrowRight size={18} aria-hidden="true" /></button>
      ) : followUp ? (
        <div className="mt-6">
          <label className={fieldLabel}>Your reply
            <textarea className={cn(field, "min-h-[96px] resize-y leading-[1.6]")} value={reply} onChange={(event) => setReply(event.target.value)} />
          </label>
          <button type="button" className={cn(primaryButton, "mt-4")} disabled={busy || reply.trim().length < 2} onClick={submitReply}>{busy ? "Grading…" : "Send reply"}<IconArrowRight size={18} aria-hidden="true" /></button>
        </div>
      ) : (
        <div className="mt-6">
          <label className={fieldLabel}>
            {predict ? "Your answer · one line per log" : "Your answer"}
            <textarea className={cn(field, "min-h-[120px] resize-y leading-[1.6]", predict && "font-mono")} spellCheck={!predict} value={answer}
              placeholder={predict ? "What prints, in order" : "What you think happens and why"} onChange={(event) => setAnswer(event.target.value)} />
          </label>
          {predict && (
            <label className={cn(fieldLabel, "mt-5")}>
              Why <span className="font-normal text-muted-foreground">· optional, not graded</span>
              <textarea className={cn(field, "min-h-[80px] resize-y leading-[1.6]")} value={why} onChange={(event) => setWhy(event.target.value)} />
            </label>
          )}
          <Confidence value={rating} onChange={setRating} />
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" className={primaryButton} disabled={busy || !answer.trim() || !rating} onClick={submitFirst}>{busy ? (predict ? "Running…" : "Grading…") : "Submit answer"}<IconArrowRight size={18} aria-hidden="true" /></button>
            {!predict && <button type="button" className={textButton} disabled={busy || !rating} onClick={dontKnow}>I don&apos;t know</button>}
          </div>
          {!predict && !rating && <p className="mt-2 text-xs text-muted-foreground">Choose how sure you are first, also for I don&apos;t know</p>}
        </div>
      )}
    </section>
  );
}
