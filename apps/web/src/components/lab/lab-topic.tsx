"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { LabDefinition, Topic } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
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
import { engineering } from "@/features/engineering-lab/routes";
import { Back, Badge } from "@/components/engineering/kit";
import { TopicEvidenceDialog } from "@/components/engineering/topic-evidence";

export interface TopicPlace { track: string; chapterNumber: number; chapterTitle: string }

const heading = "font-heading text-2xl font-semibold tracking-tighter";

function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mx-auto max-w-xl rounded-xl border border-dashed border-input p-6 text-sm leading-6">{children}{action && <div className="mt-4">{action}</div>}</div>;
}

function PracticeStep({ view, onDone, onNext, nextLabel, goLearn }: { view: TopicView; onDone: (message: string) => void; onNext: () => void; nextLabel: string; goLearn: () => void }) {
  const lesson = view.lesson;
  const items = lesson?.practice ?? [];
  const firstOpen = items.findIndex((item, index) => item.kind === "predict" && view.practiceResults[index]?.label !== "solid");
  const [index, setIndex] = useState(Math.max(0, firstOpen));
  if (!lesson) return <Empty action={<Button type="button" onClick={goLearn}>Go to Learn</Button>}>Write the lesson first</Empty>;
  if (!items.length) return <Empty action={<Button type="button" onClick={onNext}>{nextLabel}<ArrowRight aria-hidden="true" /></Button>}>No practice in this lesson</Empty>;
  const item = items[index];
  const dotTone = (dot: number) => {
    const result = view.practiceResults[dot];
    if (items[dot].kind !== "predict" || !result || result.voided) return dot === index ? "bg-foreground hover:bg-foreground" : "bg-border hover:bg-input";
    return result.label === "solid" ? "bg-primary hover:bg-primary" : "bg-primary/40 hover:bg-primary/40";
  };
  const last = index === items.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <p className={label}>PRACTICE {index + 1} OF {items.length}{item.kind === "think" ? " · THINK IT THROUGH" : " · PREDICT THE OUTPUT"}</p>
        <div className="flex gap-1.5">
          {items.map((_, dot) => <Button key={dot} variant="ghost" size="xs" type="button" aria-label={`Practice ${dot + 1}`} aria-current={dot === index ? "step" : undefined} onClick={() => setIndex(dot)} className={cn("h-1.5 w-7 rounded-full p-0", dotTone(dot), dot === index && "ring-2 ring-foreground/30 ring-offset-2")} />)}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Not graded · only Check and Lab prove a topic</p>
      <div className="mt-5">
        {item.kind === "think" ? (
          <div>
            <div className="[&_p]:text-lg [&_p]:leading-7"><Markdown text={item.prompt} /></div>
            <details className="group mt-4 rounded-lg bg-muted p-4"><DisclosureSummary className="text-sm font-semibold">Show answer</DisclosureSummary><div className="mt-3 pl-6"><Markdown text={item.answer} /></div></details>
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
    <section aria-labelledby="proof-title" className="rounded-xl bg-card border p-5">
      <h3 className="font-heading text-lg font-semibold tracking-tight" id="proof-title">Evidence</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {topic.prove.map((mode) => {
          const evidence = progress.evidence[mode];
          return (
            <li key={mode} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5 text-sm">
              <span>{modeWords[mode]}</span>
              {evidence ? <Tag value={evidence.label}>{labelWords[evidence.label]}{evidence.by === "code" ? " · by code" : ""}</Tag> : <span className="text-muted-foreground">No answer yet</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        {[
          progress.baselineLabel && view.baseline.on ? `Baseline · ${formatDate(view.baseline.on)} · ${labelWords[progress.baselineLabel]}` : view.baseline.on ? "Baseline · not asked" : "Baseline · not taken",
          progress.confidence.averageSelfRating !== null ? `Confidence · ${progress.confidence.averageSelfRating} of 5` : null,
          progress.confidence.overconfident ? "Confident misconception" : null,
          progress.nextReviewAt ? `Next review · ${formatDate(progress.nextReviewAt)}` : null,
        ].filter(Boolean).map((line) => <span key={line} className="block">{line}</span>)}
      </p>
      {progress.weaknesses.length > 0 && <div className="mt-3"><p className="text-sm font-semibold">Still open</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{progress.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    </section>
  );
}

function History({ view }: { view: TopicView }) {
  if (!view.attempts.length) return null;
  return (
    <details className="group rounded-xl bg-card border p-5">
      <DisclosureSummary className="text-sm font-semibold">All answers ({view.attempts.length})</DisclosureSummary>
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
  const done = (text: string) => { if (text) toast({ tone: "success", title: text }); router.refresh(); };
  const failed = (title: string, error: unknown) => toast({ tone: "error", title, description: error instanceof Error ? error.message : undefined });
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
    const top = stepsTop.current;
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView();
  };
  const after = (id: StepId) => {
    const position = steps.findIndex((item) => item.id === id);
    const next = steps[position + 1];
    return next ? { id: next.id, label: `Next: ${next.label}` } : null;
  };

  async function makeLesson() {
    setBusy("lesson");
    try { await post(`/api/lab/topics/${topic.id}/lesson`); done("Lesson saved"); }
    catch (error) { failed("Couldn't write the lesson. Try again", error); }
    finally { setBusy(""); }
  }
  async function makeQuestions() {
    setBusy("questions");
    const kind = progress.status === "VALIDATED" || progress.status === "NEEDS_REVISIT" ? "review" : "assessment";
    try { await post(`/api/lab/topics/${topic.id}/assessment`, { kind }); done("Questions ready"); }
    catch (error) { failed("Couldn't write questions. Try again", error); }
    finally { setBusy(""); }
  }

  const lessonButton = <Button type="button" variant={lesson ? "outline" : "default"} disabled={busy !== ""} onClick={() => void makeLesson()}>{busy === "lesson" ? "Writing lesson… ~1 min" : lesson ? "Rewrite lesson" : "Write lesson"}</Button>;

  return (
    <WorkspaceShell email={email} active="lab" tab="learn" termLookup={!view.closedBook}>
      <div className="mx-auto w-full max-w-375 px-3 pb-9 pt-6 md:px-5 md:pt-7 min-[1500px]:pt-9">
        <Back href={engineering.learn}>Learning path</Back>
        <header className="mx-1 mb-6 block items-start justify-between gap-5 md:mx-3.5 md:mb-8 md:flex">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{place.track} · Chapter {place.chapterNumber} · {place.chapterTitle}</p>
            <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight md:text-3xl xl:text-4xl xl:tracking-tighter">
              {topic.title}<Badge className="mt-2.5 table md:ml-2 md:mt-0 md:inline-flex">{progress.status === "NOT_STARTED" && progress.placement === "passed" ? "Known" : statusWords[progress.status]}</Badge>
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-normal text-muted-foreground">{topic.gap}</p>
          </div>
          <div className="mt-3 shrink-0 md:mt-1"><TopicEvidenceDialog prove={topic.prove} sources={view.sources} attempts={view.attempts} /></div>
        </header>

        <div ref={stepsTop} className="sticky top-0 z-10 mx-1 scroll-mt-0 md:mx-3.5">
          <StepBar steps={steps} active={step} suggested={suggested} onSelect={go} />
        </div>
        {justProven && (
          <div className="mx-1 mt-5 md:mx-3.5">
            <ProvenBanner title={topic.title} nextReviewAt={progress.nextReviewAt} byCode={topic.prove.filter((mode) => progress.evidence[mode]?.by === "code").length} />
          </div>
        )}

        {view.closedBook ? (
          <div className="mx-1 py-8 md:mx-3.5">
            <Empty action={<Button asChild><Link href={engineering.assessment()}>Back to assessment</Link></Button>}>
              <p className="font-semibold">Locked during assessment</p>
              <p className="mt-1 text-muted-foreground">Lesson, practice and labs open when it&apos;s done</p>
            </Empty>
          </div>
        ) : (
        <div className="mx-1 py-8 md:mx-3.5">
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
                <p className="font-semibold">No lesson yet</p>
                <p className="mt-1 text-muted-foreground">Written from trusted sources for your gap · ~1 min</p>
                {skipLesson && <p className="mt-2">Baseline: Solid · safe to skip</p>}
              </Empty>
            )
          )}

          {step === "practice" && (
            <PracticeStep view={view} onDone={done} goLearn={() => go("learn")}
              onNext={() => { const next = after("practice"); if (next) go(next.id); }} nextLabel={after("practice")?.label ?? "Done"} />
          )}

          {step === "lab" && (
            <div className="space-y-6">
              <p className="max-w-2xl text-sm text-muted-foreground">
                {labs.every((lab) => lab.runner === "probe")
                  ? "Checked against real requests from your browser · all right proves the topic"
                  : "Runs in your browser, isolated from Ken OS · a full pass proves the topic unless you opened the solution"}
                {labs.some((lab) => lab.runner === "pglite") && <span className="block">First database lab takes a few seconds to load</span>}
              </p>
              {labs.map((lab) => lab.runner === "probe"
                ? <ProbeLab key={lab.id} lab={lab} passed={view.passedLabs.includes(lab.id)} onDone={done} />
                : <Lab key={lab.id} lab={lab} revealed={view.revealedLabs.includes(lab.id)} passed={view.passedLabs.includes(lab.id)} onDone={done} />)}
              {after("lab") && <Button type="button" variant="outline" onClick={() => go(after("lab")!.id)}>{after("lab")!.label}<ArrowRight aria-hidden="true" /></Button>}
            </div>
          )}

          {step === "check" && (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  {assessment && assessment.kind !== "assessment" && <p className={label}>{kindWords[assessment.kind]}</p>}
                  <h2 className={cn(heading, assessment && assessment.kind !== "assessment" && "mt-1")}>Prove</h2>
                </div>
                {!openQuestions && <Button type="button" disabled={busy !== ""} onClick={() => void makeQuestions()}>{busy === "questions" ? "Writing questions…" : assessment ? "New questions" : "Get questions"}</Button>}
              </div>
              <p className="text-sm text-muted-foreground">Questions from a separate grader that hasn&apos;t seen the lesson</p>
              {assessment?.items.map((_, index) => <Question key={`${assessment.id}-${index}`} assessment={assessment} index={index} onDone={done} />)}
              {!assessment && <Empty><p className="font-semibold">No questions yet</p><p className="mt-1 text-muted-foreground">Graded as you answer</p></Empty>}
              <Proof topic={topic} view={view} />
              <History view={view} />
            </div>
          )}
          {step === "lab" && !steps.some((item) => item.id === "check") && (
            <div className="mt-8 space-y-6"><Proof topic={topic} view={view} /><History view={view} /></div>
          )}
        </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
