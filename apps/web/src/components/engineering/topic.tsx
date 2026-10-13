"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconCheck, IconExternalLink } from "@tabler/icons-react";
import { scoreProbe, type LabDefinition, type Label as Grade, type RubricResult, type Topic } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CodeBlock, Markdown } from "@/components/lab/markdown";
import { post } from "@/components/lab/topic/client";
import { RubricChecklist } from "@/components/lab/topic/feedback";
import { formatDate, labelWords, statusWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import { buildLabScript, PGLITE_URL, type TestResult } from "@/features/engineering-lab/runner/harness";
import { PROBES } from "@/features/engineering-lab/runner/probes";
import { runInWorker } from "@/features/engineering-lab/runner/run-in-worker";
import { AskClaude } from "./ask-claude";
import { Exercise } from "./exercise";
import { engineering, type TopicStep } from "@/features/engineering-lab/routes";
import type { ExercisePanel } from "@/features/engineering-lab/exercise-store";
import type { PublicQuestion, TopicLesson, TopicView } from "@/features/engineering-lab/topic-store";
import { cn } from "@/lib/utils";
import { Back, eyebrow, Notice, PageHeading, panel } from "./kit";
import { Confidence, Dialog, Feedback, field, fieldLabel } from "./flow";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// A topic: Learn, Exercise, Prove. Spec: docs/architecture/engineering-rebuild.md, section 3 (Topic).
// Reading never proves a topic, the exercise never advances on its own, and Prove opens only once the exercise passes.
// Exercise versions from Claude are checked here, in the browser, before they show (engineering-claude-connector.md, section 4).

const PROOF_MIN = 30;
const page = "mx-auto max-w-7xl px-3 pb-9 pt-6 md:px-5 md:pt-7.5";
const twoColumns =
  "grid grid-cols-1 gap-4.5 md:grid-cols-[2fr_1fr] md:gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(230px,1fr)] lg:gap-8";

function EvidenceDialog({ view }: { view: TopicView }) {
  return (
    <Dialog title="Evidence & sources" trigger="Evidence & sources">
      <h3 className="!mt-0">Sources</h3>
      {view.lesson?.sources.length ? (
        <ul className="space-y-1.5">
          {view.lesson.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-foreground underline decoration-input underline-offset-4 hover:decoration-foreground"
              >
                {source.title}
                <IconExternalLink size={14} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No sources yet</p>
      )}
      {view.sourcesCheckedAt && <p className="mt-2 text-xs">Checked {formatDate(view.sourcesCheckedAt)}</p>}
      <h3>Attempts</h3>
      {view.evidence.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {view.evidence.map((item) => (
            <li key={item.id} className="py-3 text-xs">
              <p className="flex flex-wrap items-center gap-2 text-foreground">
                <span className="font-semibold">
                  {item.kind === "exercise_run" ? "Exercise" : item.kind === "proof" ? "Proof" : "Review"}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(item.at)}</span>
                {item.kind === "exercise_run" && item.results && (
                  <Pill tone={item.passed ? "solid" : "gap"}>
                    {item.results.passed} / {item.results.passed + item.results.failed} tests passed
                  </Pill>
                )}
                {item.label && <Pill tone={toneFor(item.label)}>{labelWords[item.label]}</Pill>}
                {item.kind === "proof" && (
                  <Pill tone={item.passed ? "solid" : "neutral"}>{item.passed ? "Passed" : "Not passed"}</Pill>
                )}
              </p>
              {item.answer && (
                <blockquote className="mt-2 border-l-[3px] border-primary/40 pl-4 leading-relaxed whitespace-pre-wrap">
                  {item.answer}
                </blockquote>
              )}
              {item.feedback && <p className="mt-2">{item.feedback}</p>}
              {item.rubric && <RubricChecklist items={item.rubric} />}
              {item.graderVersion && (
                <p className="mt-2 text-xs">
                  Grader {item.graderVersion}
                  {item.selfRating ? ` · Confidence ${item.selfRating} of 5` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No attempts yet</p>
      )}
    </Dialog>
  );
}

function LessonBody({ lesson }: { lesson: TopicLesson }) {
  return (
    <section className={cn(panel, "p-6 md:p-7.5")}>
      <h2 className="text-2xl font-bold tracking-tight md:text-2xl">{lesson.heading}</h2>
      <div className="mt-3 text-sm leading-relaxed text-foreground">
        <Markdown text={lesson.body} />
      </div>
      <div className="mt-6 rounded-lg bg-secondary px-5 py-4">
        <p className={eyebrow}>Mental model</p>
        <div className="text-sm leading-relaxed">
          <Markdown text={lesson.mentalModel} />
        </div>
      </div>
      <div className="mt-6">
        {lesson.block.kind === "code" ? (
          <CodeBlock code={lesson.block.content} label="Lesson code" />
        ) : (
          <pre className="rounded-lg bg-muted px-4 py-3.5 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {lesson.block.content}
          </pre>
        )}
        <div className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          <Markdown text={lesson.block.note} />
        </div>
      </div>
      <h3 className="mt-7 text-base font-semibold">Product example</h3>
      <div className="mt-2 text-sm leading-relaxed">
        <Markdown text={lesson.example} />
      </div>
      {lesson.deeper && (
        <details className="group mt-7 border-t border-border pt-4">
          <summary className="cursor-pointer list-none text-xs font-semibold [&::-webkit-details-marker]:hidden">
            Go deeper · {lesson.deeper.title}
          </summary>
          <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <Markdown text={lesson.deeper.body} />
          </div>
        </details>
      )}
    </section>
  );
}

function Learn({ topic, view, onNext }: { topic: Topic; view: TopicView; onNext: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const opened = useRef(false);
  const lesson = view.lesson;

  // Showing the lesson moves the topic to Learning, once.
  useEffect(() => {
    if (!lesson || opened.current || view.progress.state !== "NOT_STARTED") return;
    opened.current = true;
    void post(`/api/lab/topics/${topic.id}/opened`)
      .then(() => router.refresh())
      .catch(() => {
        opened.current = false;
      });
  }, [lesson, topic.id, view.progress.state, router]);

  async function write() {
    setBusy(true);
    setProblem("");
    try {
      await post(`/api/lab/topics/${topic.id}/lesson`);
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't write the lesson. Try again");
    } finally {
      setBusy(false);
    }
  }

  if (view.closedBook) {
    return (
      <section className={cn(panel, "p-6 md:p-7.5")}>
        <h2 className="text-base font-semibold">Closed during the assessment</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">Lessons open again when you finish it</p>
        <Button asChild className="mt-5">
          <Link href={engineering.assessment}>Resume assessment</Link>
        </Button>
      </section>
    );
  }
  if (!lesson) {
    return (
      <section className={cn(panel, "p-6 md:p-7.5")}>
        <h2 className="text-base font-semibold">No lesson yet</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">Written from trusted sources · ~1 min</p>
        {problem && <Notice tone="error">{problem}</Notice>}
        <Button type="button" className="mt-5" disabled={busy} onClick={() => void write()}>
          {busy ? "Writing lesson… ~1 min" : "Write lesson"}
        </Button>
      </section>
    );
  }
  return (
    <div className={twoColumns}>
      <div className="min-w-0">
        <LessonBody lesson={lesson} />
        <Button type="button" className="mt-5" onClick={onNext}>
          Try the exercise
          <IconArrowRight size={18} aria-hidden="true" />
        </Button>
      </div>
      <aside className="p-2.5 text-sm leading-relaxed text-muted-foreground md:py-4">
        <h3 className="text-base font-semibold text-foreground">What you&apos;ll prove</h3>
        <ul className="mt-2 list-disc pl-5 leading-relaxed">
          {lesson.prove.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h3 className="mt-6 text-base font-semibold text-foreground">Sources</h3>
        <ul className="mt-2 space-y-1.5">
          {lesson.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 underline decoration-input underline-offset-4 hover:text-foreground"
              >
                {source.title}
                <IconExternalLink size={14} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

interface ProofOutcome {
  passed: boolean;
  label: Grade;
  rubric: RubricResult[];
  feedback: string;
}

/** Rubric lines as met or missed: a proof passes only when every line is met. */
function MetList({ rubric }: { rubric: RubricResult[] }) {
  return (
    <ul className="mt-4 divide-y divide-border rounded-lg bg-muted text-sm">
      {rubric.map((line) => (
        <li key={line.point} className="flex items-start justify-between gap-3 px-3 py-2.5">
          <span className="leading-5">{line.point}</span>
          <Pill tone={line.result === "covered" ? "solid" : "gap"}>{line.result === "covered" ? "Met" : "Missed"}</Pill>
        </li>
      ))}
    </ul>
  );
}

function Prove({
  topic,
  view,
  nextTopic,
}: {
  topic: Topic;
  view: TopicView;
  nextTopic: { id: string; title: string } | null;
}) {
  const router = useRouter();
  const ready = view.progress.exercisePassed;
  const proven = view.progress.state === "PROVEN";
  const [question, setQuestion] = useState<PublicQuestion | null>(view.proof);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState("");
  const [answer, setAnswer] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ProofOutcome | null>(null);
  const asked = useRef(false);

  async function loadPrompt() {
    setLoading(true);
    setProblem("");
    try {
      setQuestion(await post<PublicQuestion>(`/api/lab/topics/${topic.id}/proof`));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't write the prompt. Try again");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || question || asked.current) return;
    asked.current = true;
    void loadPrompt();
  });

  async function submit() {
    if (!question || !rating) return;
    setBusy(true);
    setProblem("");
    try {
      const result = await post<ProofOutcome>(`/api/lab/topics/${topic.id}/proof/answer`, {
        questionId: question.id,
        answer,
        selfRating: rating,
      });
      setOutcome(result);
      if (result.passed) toast({ tone: "success", title: "Topic proven" });
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't grade. Try again");
    } finally {
      setBusy(false);
    }
  }

  if (outcome?.passed || (proven && !outcome)) {
    const last =
      outcome ??
      (view.lastProof?.passed
        ? {
            passed: true,
            label: view.lastProof.label!,
            rubric: view.lastProof.rubric ?? [],
            feedback: view.lastProof.feedback ?? "",
          }
        : null);
    return (
      <section className={cn(panel, "p-6 md:p-7.5")}>
        <span className="grid size-12.5 place-items-center rounded-full bg-muted text-foreground">
          <IconCheck size={28} aria-hidden="true" />
        </span>
        <h2 className="mt-4 mb-2 text-2xl font-bold tracking-tight">Topic proven</h2>
        {last && (
          <>
            <p className="text-sm text-muted-foreground">{last.feedback}</p>
            <MetList rubric={last.rubric} />
          </>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Button asChild>
            <Link href={engineering.profile}>Back to profile</Link>
          </Button>
          {nextTopic && (
            <Button asChild variant="link">
              <Link href={engineering.topic(nextTopic.id)}>Next: {nextTopic.title}</Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={cn(panel, "p-6 md:p-7.5")}>
      {!ready ? (
        <>
          <h2 className="text-base font-semibold">Exercise: still required</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">Pass the exercise to open the proof</p>
        </>
      ) : !question ? (
        <>
          <h2 className="text-base font-semibold">{loading ? "Writing prompt…" : "No prompt yet"}</h2>
          {problem && <Notice tone="error">{problem}</Notice>}
          {!loading && (
            <Button type="button" className="mt-4" onClick={() => void loadPrompt()}>
              Write prompt
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="text-sm leading-relaxed md:text-base [&_p]:text-foreground">
            <Markdown text={question.prompt} />
          </div>
          {question.code && (
            <div className="mt-4">
              <CodeBlock code={question.code} label="Proof code" />
            </div>
          )}
          {outcome && !outcome.passed ? (
            <Feedback
              badge={<Pill tone={toneFor(outcome.label)}>{labelWords[outcome.label]}</Pill>}
              title={outcome.feedback}
              action={
                <Button
                  type="button"
                  onClick={() => {
                    setOutcome(null);
                    setRating(null);
                  }}
                >
                  Try again
                </Button>
              }
            >
              <MetList rubric={outcome.rubric} />
            </Feedback>
          ) : (
            <>
              <Label className={cn(fieldLabel, "mt-6.5")}>
                Your reasoning
                <Textarea
                  className={cn(field, "min-h-37.5 resize-y leading-relaxed")}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                />
                <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
                  {answer.trim().length < PROOF_MIN ? `At least ${PROOF_MIN} characters` : "Ready"}
                </span>
              </Label>
              <Confidence value={rating} onChange={setRating} />
              <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <IconCheck size={16} className="text-foreground" aria-hidden="true" />
                Exercise: passed
              </p>
              {problem && <Notice tone="error">{problem}</Notice>}
              <Button
                type="button"
                disabled={busy || answer.trim().length < PROOF_MIN || !rating}
                onClick={() => void submit()}
              >
                {busy ? "Grading…" : "Submit proof"}
              </Button>
            </>
          )}
        </>
      )}
    </section>
  );
}

export function TopicPage({
  email,
  topic,
  place,
  exercise,
  view,
  initialStep,
  nextTopic,
  claudeProjectUrl,
}: {
  email: string;
  topic: Topic;
  place: { area: string; chapter: string };
  exercise: ExercisePanel;
  view: TopicView;
  initialStep: TopicStep;
  nextTopic: { id: string; title: string } | null;
  /** The owner's Claude Project. Null hides Ask Claude. */
  claudeProjectUrl: string | null;
}) {
  const ready = view.progress.exercisePassed || view.progress.state === "PROVEN";
  const [step, setStep] = useState<TopicStep>(initialStep === "prove" && !ready ? "exercise" : initialStep);
  const go = (next: TopicStep) => {
    setStep(next);
    window.history.replaceState(null, "", engineering.topic(topic.id, next === "learn" ? null : next));
    window.scrollTo({ top: 0 });
  };

  return (
    <WorkspaceShell email={email} active="lab" tab="learn" termLookup={!view.closedBook}>
      <div className={page}>
        <Back href={engineering.learn}>Learn</Back>
        <PageHeading
          kicker={`${place.area} · ${place.chapter}`}
          title={topic.title}
          badge={statusWords[view.progress.state]}
          aside={
            <div className="mt-4 md:mt-2">
              <EvidenceDialog view={view} />
            </div>
          }
        />
        <div className="mx-1.5 mb-6 flex flex-wrap items-center justify-between gap-3 md:mx-3.5">
          <Tabs value={step} onValueChange={(next) => go(next as TopicStep)}>
            <TabsList aria-label="Topic steps">
              <TabsTrigger value="learn" className="px-4">
                Learn
              </TabsTrigger>
              <TabsTrigger value="exercise" className="px-4">
                {view.progress.exercisePassed || view.progress.state === "PROVEN" ? (
                  <IconCheck size={15} aria-label="Passed" />
                ) : null}
                Exercise
              </TabsTrigger>
              <TabsTrigger value="prove" className="px-4" disabled={!ready}>
                Prove
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {claudeProjectUrl && <AskClaude topic={topic} projectUrl={claudeProjectUrl} />}
        </div>
        <div className="mx-1.5 md:mx-3.5">
          {step === "learn" && <Learn topic={topic} view={view} onNext={() => go("exercise")} />}
          {/* A switched version starts from its own starter and draft. */}
          {step === "exercise" && (
            <Exercise
              key={exercise.exercise.id}
              topic={topic}
              data={exercise}
              progress={view.progress}
              onProve={() => go("prove")}
            />
          )}
          {step === "prove" && <Prove topic={topic} view={view} nextTopic={nextTopic} />}
        </div>
      </div>
    </WorkspaceShell>
  );
}
