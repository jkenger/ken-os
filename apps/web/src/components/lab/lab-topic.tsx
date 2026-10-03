"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import type { LabDefinition, Topic } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { stepsForTopic, type StepId } from "@/features/engineering-lab/steps";
import type { TopicView } from "@/features/engineering-lab/store";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { GradeTag, PracticePredict, Question, Tag } from "./topic/answers";
import { post } from "./topic/client";
import { Lab, ProbeLab } from "./topic/labs";
import { LessonReader } from "./topic/learn";
import { ProvenBanner } from "./topic/feedback";
import { StepBar } from "./topic/step-bar";
import { formatDate, kindWords, label, labelWords, modeWords, statusWords } from "./words";

export interface TopicPlace { track: string; chapterNumber: number; chapterTitle: string }

const heading = "font-display text-2xl font-semibold tracking-[-0.05em]";

function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mx-auto max-w-[620px] rounded-xl border border-dashed border-input p-6 text-[15px] leading-6">{children}{action && <div className="mt-4">{action}</div>}</div>;
}

function PracticeStep({ view, onDone, onNext, nextLabel, goLearn }: { view: TopicView; onDone: (message: string) => void; onNext: () => void; nextLabel: string; goLearn: () => void }) {
  const lesson = view.lesson;
  const items = lesson?.practice ?? [];
  const firstOpen = items.findIndex((item, index) => item.kind === "predict" && view.practiceResults[index]?.label !== "solid");
  const [index, setIndex] = useState(Math.max(0, firstOpen));
  if (!lesson) return <Empty action={<Button type="button" onClick={goLearn}>Go to Learn</Button>}>Practice comes from the lesson. Write the lesson first.</Empty>;
  if (!items.length) return <Empty action={<Button type="button" onClick={onNext}>{nextLabel}<ArrowRight aria-hidden="true" /></Button>}>This lesson has no practice.</Empty>;
  const item = items[index];
  const dotTone = (dot: number) => {
    const result = view.practiceResults[dot];
    if (items[dot].kind !== "predict" || !result || result.voided) return dot === index ? "bg-foreground" : "bg-border";
    return result.label === "solid" ? "bg-status-solid" : "bg-status-partial";
  };
  const last = index === items.length - 1;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="flex items-center justify-between gap-3">
        <p className={label}>PRACTICE {index + 1} OF {items.length}{item.kind === "think" ? " · THINK IT THROUGH" : " · PREDICT THE OUTPUT"}</p>
        <div className="flex gap-1.5">
          {items.map((_, dot) => <button key={dot} type="button" aria-label={`Practice ${dot + 1}`} aria-current={dot === index ? "step" : undefined} onClick={() => setIndex(dot)} className={cn("h-1.5 w-7 rounded-full", dotTone(dot), dot === index && "ring-2 ring-foreground/30 ring-offset-2")} />)}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">For learning. Predictions are checked by running the code; only the Check step and labs can prove the topic.</p>
      <div className="mt-5">
        {item.kind === "think" ? (
          <div>
            <p className="text-lg leading-7">{item.prompt}</p>
            <details className="group mt-4 rounded-xl border border-border p-4"><DisclosureSummary className="text-[15px] font-semibold">Show the answer</DisclosureSummary><div className="mt-3 pl-6"><Markdown text={item.answer} /></div></details>
          </div>
        ) : (
          <PracticePredict key={`${lesson.id}-${index}`} lessonId={lesson.id} index={index} item={item} result={view.practiceResults[index]} onDone={onDone} />
        )}
      </div>
      <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-border pt-5">
        <Button type="button" variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft aria-hidden="true" />Previous</Button>
        {last
          ? <Button type="button" onClick={onNext}>{nextLabel}<ArrowRight aria-hidden="true" /></Button>
          : <Button type="button" variant="outline" onClick={() => setIndex(index + 1)}>Next<ArrowRight aria-hidden="true" /></Button>}
      </div>
    </div>
  );
}

function Proof({ topic, view }: { topic: Topic; view: TopicView }) {
  const { progress } = view;
  return (
    <section aria-labelledby="proof-title" className="rounded-xl border border-border p-5">
      <p className={label}>PROOF</p>
      <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em]" id="proof-title">What&apos;s been shown so far</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {topic.prove.map((mode) => {
          const evidence = progress.evidence[mode];
          return (
            <li key={mode} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
              <span>{modeWords[mode]}</span>
              {evidence ? <Tag value={evidence.label}>{labelWords[evidence.label]}{evidence.by === "code" ? " · by code" : ""}</Tag> : <span className="text-muted-foreground">No answer yet</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        {progress.baselineLabel ? `Baseline on 1 Oct: ${labelWords[progress.baselineLabel]}. ` : "Not assessed in the baseline. "}
        {progress.confidence.averageSelfRating !== null ? `Average confidence ${progress.confidence.averageSelfRating} of 5. ` : ""}
        {progress.confidence.overconfident ? "You were sure about an answer that turned out to be a misconception. " : ""}
        {progress.nextReviewAt ? `Next review ${formatDate(progress.nextReviewAt)}.` : ""}
      </p>
      {progress.weaknesses.length > 0 && <div className="mt-3"><p className="text-sm font-semibold">Still open</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{progress.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    </section>
  );
}

function History({ view }: { view: TopicView }) {
  if (!view.attempts.length) return null;
  return (
    <details className="group rounded-xl border border-border p-5">
      <DisclosureSummary className="text-[15px] font-semibold">Every answer ({view.attempts.length})</DisclosureSummary>
      <ol className="mt-3 divide-y divide-border border-y border-border text-sm">
        {view.attempts.map((attempt) => (
          <li key={attempt.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="font-semibold">{kindWords[attempt.kind]} · {modeWords[attempt.mode]}</p><p className="text-muted-foreground">{attempt.feedback}</p></div>
            <div className="flex shrink-0 items-center gap-2"><GradeTag label={attempt.label} voided={attempt.voided} /><span className="text-muted-foreground">{formatDate(attempt.createdAt)}</span></div>
          </li>
        ))}
      </ol>
    </details>
  );
}

export function LabTopic({ email, topic, view, labs, skipLesson, place, initialStep }: {
  email: string; topic: Topic; view: TopicView; labs: LabDefinition[]; skipLesson: boolean; place: TopicPlace; initialStep?: StepId;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "lesson" | "questions">("");
  const [message, setMessage] = useState("");
  const done = (text: string) => { setMessage(text); router.refresh(); };
  const { progress, lesson, assessment } = view;
  const openQuestions = assessment?.items.some((item) => !item.answered) ?? false;
  const { steps, suggested } = stepsForTopic(view, labs, topic.prove, skipLesson);
  const [step, setStep] = useState<StepId>(initialStep && steps.some((item) => item.id === initialStep) ? initialStep : suggested);
  const stepsTop = useRef<HTMLDivElement>(null);
  // Shown for three days after the topic turns proven, then it's just the status.
  const [justProven] = useState(() => progress.status === "VALIDATED" && Boolean(progress.validatedAt) && Date.now() - new Date(progress.validatedAt!).getTime() < 3 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", step);
    window.history.replaceState(window.history.state, "", url);
  }, [step]);

  const go = (next: StepId) => {
    setStep(next);
    setMessage("");
    const top = stepsTop.current;
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView();
  };
  const after = (id: StepId) => {
    const position = steps.findIndex((item) => item.id === id);
    const next = steps[position + 1];
    return next ? { id: next.id, label: `Next: ${next.label}` } : null;
  };

  async function makeLesson() {
    setBusy("lesson"); setMessage("");
    try { await post(`/api/lab/topics/${topic.id}/lesson`); done("Lesson saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not write the lesson."); }
    finally { setBusy(""); }
  }
  async function makeQuestions() {
    setBusy("questions"); setMessage("");
    const kind = progress.status === "VALIDATED" || progress.status === "NEEDS_REVISIT" ? "review" : "assessment";
    try { await post(`/api/lab/topics/${topic.id}/assessment`, { kind }); done("New questions ready."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not write questions."); }
    finally { setBusy(""); }
  }

  const lessonButton = <Button type="button" variant={lesson ? "outline" : "default"} disabled={busy !== ""} onClick={() => void makeLesson()}>{busy === "lesson" ? "Researching and writing, about a minute..." : lesson ? "Write a new version" : "Write the lesson"}</Button>;

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] border-x border-border">
        <header className="px-5 pb-6 pt-8 sm:px-8 lg:px-10 lg:pt-10">
          <p className={cn(label, "flex flex-wrap items-center gap-1")}>{place.track.toUpperCase()}<ChevronRight size={12} aria-hidden="true" />CHAPTER {place.chapterNumber} · {place.chapterTitle.toUpperCase()}</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <h1 className="max-w-[820px] font-display text-3xl font-bold leading-[1.1] tracking-[-0.06em] sm:text-4xl">{topic.title}</h1>
            <Tag value={progress.status}>{statusWords[progress.status]}</Tag>
          </div>
          <p className="mt-3 max-w-[720px] text-[15px] leading-6 text-muted-foreground">{topic.gap}</p>
        </header>

        <div ref={stepsTop} className="sticky top-0 z-10 scroll-mt-0">
          <StepBar steps={steps} active={step} suggested={suggested} onSelect={go} />
        </div>
        {message && <p className="mx-5 mt-5 rounded-lg bg-muted px-4 py-3 text-sm sm:mx-8 lg:mx-10" role="status">{message}</p>}
        {justProven && (
          <div className="mx-5 mt-5 sm:mx-8 lg:mx-10">
            <ProvenBanner title={topic.title} nextReviewAt={progress.nextReviewAt} byCode={topic.prove.filter((mode) => progress.evidence[mode]?.by === "code").length} />
          </div>
        )}

        <div className="px-5 py-8 sm:px-8 lg:px-10">
          {step === "learn" && (
            lesson ? (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <p className={label}>LESSON · VERSION {lesson.version}</p>
                  {lessonButton}
                </div>
                <LessonReader lesson={lesson} sources={view.sources} sourceCheckedAt={view.sourceCheckedAt}
                  footer={after("learn") && <Button type="button" onClick={() => go(after("learn")!.id)}>{after("learn")!.label}<ArrowRight aria-hidden="true" /></Button>} />
              </>
            ) : (
              <Empty action={<div className="flex flex-wrap gap-2">{lessonButton}{skipLesson && <Button type="button" variant="outline" onClick={() => go(suggested)}>Skip to {steps.find((item) => item.id === suggested)?.label}</Button>}</div>}>
                <p className="font-semibold">No lesson yet.</p>
                <p className="mt-1 text-muted-foreground">The Researcher gathers trusted sources first, then the Tutor writes a lesson aimed at your gap. It takes about a minute.</p>
                {skipLesson && <p className="mt-2">The baseline rated this solid, so you can skip it.</p>}
              </Empty>
            )
          )}

          {step === "practice" && (
            <PracticeStep view={view} onDone={done} goLearn={() => go("learn")}
              onNext={() => { const next = after("practice"); if (next) go(next.id); }} nextLabel={after("practice")?.label ?? "Done"} />
          )}

          {step === "lab" && (
            <div className="space-y-6">
              <p className="max-w-[720px] text-sm text-muted-foreground">
                {labs.every((lab) => lab.runner === "probe")
                  ? "Your predictions are checked against real requests your browser makes now. Every answer right counts as proof."
                  : "Code runs in your browser, cut off from your Ken OS session. A full pass counts as proof unless you looked at the solution first."}
                {labs.some((lab) => lab.runner === "pglite") && " Database labs load a small Postgres (PGlite) into the page the first time, which takes a few seconds."}
              </p>
              {labs.map((lab) => lab.runner === "probe"
                ? <ProbeLab key={lab.id} lab={lab} passed={view.passedLabs.includes(lab.id)} onDone={done} />
                : <Lab key={lab.id} lab={lab} revealed={view.revealedLabs.includes(lab.id)} passed={view.passedLabs.includes(lab.id)} onDone={done} />)}
              {after("lab") && <Button type="button" variant="outline" onClick={() => go(after("lab")!.id)}>{after("lab")!.label}<ArrowRight aria-hidden="true" /></Button>}
            </div>
          )}

          {step === "check" && (
            <div className="mx-auto max-w-[760px] space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={label}>CHECK{assessment ? ` · ${kindWords[assessment.kind].toUpperCase()}` : ""}</p>
                  <h2 className={cn(heading, "mt-1")}>Prove it with fresh questions</h2>
                </div>
                {!openQuestions && <Button type="button" disabled={busy !== ""} onClick={() => void makeQuestions()}>{busy === "questions" ? "Writing questions..." : assessment ? "Get new questions" : "Get questions"}</Button>}
              </div>
              <p className="text-sm text-muted-foreground">Written by a separate assessor that hasn&apos;t seen the lesson. Predictions are checked by running the code.</p>
              {assessment?.items.map((_, index) => <Question key={`${assessment.id}-${index}`} assessment={assessment} index={index} onDone={done} />)}
              {!assessment && <Empty>No questions yet. Get a set when you&apos;re ready; each question is graded as you answer it.</Empty>}
              <Proof topic={topic} view={view} />
              <History view={view} />
            </div>
          )}
          {step === "lab" && !steps.some((item) => item.id === "check") && (
            <div className="mt-8 space-y-6"><Proof topic={topic} view={view} /><History view={view} /></div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
