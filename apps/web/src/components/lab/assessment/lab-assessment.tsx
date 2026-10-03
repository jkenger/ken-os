"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleDashed } from "lucide-react";
import type { GuideMessage, IntakeAnswers } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import type { RunChapterView, RunView } from "@/features/engineering-lab/assessment-run";
import { cn } from "@/lib/utils";
import { GuideChat, type GuideProposals } from "../profile/guide-chat";
import { Question, type AnswerPayload, type AssessmentView } from "../topic/answers";
import { post, textarea } from "../topic/client";
import { RubricChecklist } from "../topic/feedback";
import { label, labelWords, modeWords, toneFor } from "../words";

// The baseline assessment and its retakes. Design: docs/architecture/engineering-lab-profile.md, sections 3 and 4.
// Closed-book: this page turns off term lookup, and grades stay hidden until a chapter is done.

const emptyIntake: IntakeAnswers = { building: "", stack: "", aiWork: "", weeklyHours: 5 };

function IntakeCard({ proposal, onSaved }: { proposal: IntakeAnswers | null; onSaved: () => void }) {
  const [values, setValues] = useState<IntakeAnswers>(proposal ?? emptyIntake);
  const [seen, setSeen] = useState(proposal);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  // A new proposal from the Guide refills the card; your own edits stay until then.
  if (proposal && proposal !== seen) { setSeen(proposal); setValues(proposal); }
  const field = (key: "building" | "stack" | "aiWork", title: string, hint: string) => (
    <label className="block">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mb-1.5 block text-sm text-muted-foreground">{hint}</span>
      <textarea className={cn(textarea, "min-h-[64px]")} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
    </label>
  );

  async function save() {
    setBusy(true); setProblem("");
    try {
      await post("/api/lab/profile", { action: "intake", intake: values });
      onSaved();
    } catch (error) { setProblem(error instanceof Error ? error.message : "Could not save."); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-border p-5" aria-labelledby="intake-title">
      <p className={label} id="intake-title">WHAT THE INTAKE SAVES</p>
      <p className="mt-2 text-sm text-muted-foreground">The Guide fills this in as you talk. Check it, change anything, then save. It only steers where questions start; it never counts as evidence.</p>
      <div className="mt-4 space-y-3">
        {field("building", "What you build", "For example: my own web products, a SaaS for clinics.")}
        {field("stack", "What you use day to day", "Languages, frameworks, databases, hosting.")}
        {field("aiWork", "AI work you've already started", "Even partly: embeddings, RAG, agents, evals.")}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Hours a week for the lab</span>
          <input type="number" min={1} max={80} className={cn(textarea, "w-28")} value={values.weeklyHours} onChange={(event) => setValues({ ...values, weeklyHours: Number(event.target.value) })} />
        </label>
      </div>
      {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
      <Button type="button" className="mt-4" disabled={busy || !values.building.trim() || !values.stack.trim() || !values.aiWork.trim()} onClick={() => void save()}>{busy ? "Saving..." : "Save and continue"}</Button>
    </section>
  );
}

function ChapterList({ run, focus }: { run: RunView; focus: string | null }) {
  return (
    <ol className="space-y-1.5">
      {run.chapters.map((chapter, index) => (
        <li key={chapter.chapterId}>
          <Link
            href={`/lab/assessment?run=${run.id}&chapter=${chapter.chapterId}`}
            className={cn("flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/60", focus === chapter.chapterId ? "border-foreground" : "border-border")}
            aria-current={focus === chapter.chapterId ? "step" : undefined}
          >
            <span><span className="text-muted-foreground">{index + 1}.</span> {chapter.title}</span>
            {chapter.status === "done" ? <Pill tone="solid" icon={<Check size={12} aria-hidden="true" />}>Done</Pill>
              : chapter.status === "in_progress" ? <Pill tone="partial">{chapter.answered ? `${chapter.answered} answered` : "Questions ready"}</Pill>
                : <Pill tone="quiet" icon={<CircleDashed size={12} aria-hidden="true" />}>Not started</Pill>}
          </Link>
        </li>
      ))}
    </ol>
  );
}

function ChapterResults({ chapter }: { chapter: RunChapterView }) {
  return (
    <section className="rounded-xl border border-border p-5" aria-labelledby={`results-${chapter.chapterId}`}>
      <p className={label} id={`results-${chapter.chapterId}`}>{chapter.title.toUpperCase()} · RESULTS</p>
      {chapter.kind === "topics" && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {chapter.topics.map((topic) => <li key={topic.topicId} className="flex flex-wrap items-center gap-2"><span className="font-semibold">{topic.title}</span>{topic.label && <Pill tone={toneFor(topic.label)}>{labelWords[topic.label]}</Pill>}{topic.label === "solid" && <span className="text-muted-foreground">placed: you can skip it</span>}</li>)}
          {chapter.skipped.length > 0 && <li className="text-muted-foreground">Not asked, already known: {chapter.skipped.length} topic{chapter.skipped.length === 1 ? "" : "s"}.</li>}
        </ul>
      )}
      {chapter.kind === "screen" && <p className="mt-2 text-sm text-muted-foreground">This chapter has no lessons yet, so these answers only estimate how deep you go. They never prove a topic.</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold">Every question and answer</summary>
        <ul className="mt-3 space-y-4">
          {chapter.answers.map((answer, index) => (
            <li key={index} className="border-t border-border pt-3 text-sm">
              <p className={label}>{modeWords[answer.mode]?.toUpperCase() ?? answer.mode}{answer.selfRating ? ` · YOU RATED ${answer.selfRating} OF 5` : ""}</p>
              <p className="mt-1 font-semibold">{answer.prompt}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{answer.answer || "(no text)"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><Pill tone={toneFor(answer.voided ? "voided" : answer.label)}>{answer.voided ? "Thrown out" : labelWords[answer.label]}</Pill><span>{answer.feedback}</span></div>
              {answer.rubric && <RubricChecklist items={answer.rubric} />}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function CurrentQuestion({ run, onAnswered }: { run: RunView; onAnswered: (finished: boolean) => void }) {
  const current = run.current!;
  const view: AssessmentView = {
    id: current.id, kind: run.kind, createdAt: run.startedAt,
    items: Array.from({ length: current.itemIndex + 1 }, (_, index) => index === current.itemIndex
      ? { ...current.item, answered: null }
      : { mode: current.item.mode, prompt: "", code: null, answered: null }) as AssessmentView["items"],
  };
  const topic = current.topicId ? run.chapters.flatMap((chapter) => chapter.topics).find((item) => item.topicId === current.topicId) : null;
  const heading = `${topic ? `${topic.title.toUpperCase()} · ` : ""}QUESTION ${current.position} OF UP TO ${current.outOf}`;
  const submitTo = async (payload: AnswerPayload) => {
    const result = current.type === "screen"
      ? await post<{ runFinished: boolean }>("/api/lab/screens", { screenId: current.id, text: payload.text ?? "", selfRating: payload.selfRating })
      : await post<{ runFinished: boolean }>("/api/lab/attempts", {
        type: "answer", assessmentId: current.id, itemIndex: current.itemIndex, selfRating: payload.selfRating,
        response: payload.lines ? { lines: payload.lines, ...(payload.why ? { why: payload.why } : {}) } : { text: payload.text ?? "" },
        ...(payload.actualOutput ? { actualOutput: payload.actualOutput } : {}),
      });
    onAnswered(result.runFinished);
  };
  return <Question key={`${current.id}-${current.itemIndex}`} assessment={view} index={current.itemIndex} heading={heading} submitTo={submitTo} onDone={() => undefined} />;
}

export function LabAssessment({ email, intake, conversation, run, focus, baselineDone }: {
  email: string;
  intake: IntakeAnswers | null;
  conversation: GuideMessage[];
  run: RunView | null;
  focus: string | null;
  baselineDone: boolean;
}) {
  const router = useRouter();
  const [proposal, setProposal] = useState<IntakeAnswers | null>(null);
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const focusChapter = run ? (run.chapters.find((chapter) => chapter.chapterId === focus) ?? run.chapters.find((chapter) => chapter.status !== "done") ?? null) : null;

  async function start(kind: "baseline" | "checkpoint") {
    setBusy("start"); setProblem("");
    try {
      const result = await post<{ id: string }>("/api/lab/runs", { kind });
      router.push(`/lab/assessment?run=${result.id}`);
      router.refresh();
    } catch (error) { setProblem(error instanceof Error ? error.message : "Could not start."); }
    finally { setBusy(""); }
  }

  async function prepare(chapterId: string) {
    if (!run) return;
    setBusy(chapterId); setProblem("");
    try {
      await post(`/api/lab/runs/${run.id}/chapters/${chapterId}`);
      router.refresh();
    } catch (error) { setProblem(error instanceof Error ? error.message : "Could not write the questions."); }
    finally { setBusy(""); }
  }

  function answered(finished: boolean) {
    if (finished) toast({ tone: "success", title: run?.kind === "baseline" ? "Baseline finished" : "Checkpoint finished", description: "Your profile is ready on the lab home." });
    router.refresh();
  }

  const title = !run ? (intake ? "Ready when you are." : "First, a short talk.") : run.completedAt ? (run.kind === "baseline" ? "Your baseline." : "Your checkpoint.") : "Closed-book, one chapter at a time.";

  return (
    <WorkspaceShell email={email} active="lab" termLookup={false}>
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] border-x border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <p className={label}>ENGINEERING LAB · {run?.kind === "checkpoint" ? "CHECKPOINT" : "BASELINE"}</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">{title}</h1>
        {problem && <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}

        {!run && !intake && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <GuideChat
              phase="intake" history={conversation}
              opener="Hi. Before the questions, tell me what you build, what you use day to day, what AI work you've already started, and how many hours a week you can give this. A few sentences is plenty."
              onProposals={(next: GuideProposals) => { if (next.intake) setProposal(next.intake); }}
            />
            <IntakeCard proposal={proposal} onSaved={() => router.refresh()} />
          </div>
        )}

        {!run && intake && (
          <section className="mt-8 max-w-[720px] rounded-xl border border-foreground p-6">
            <p className="text-[15px] leading-6">The assessment goes chapter by chapter, in course order. Written topics get one question, and a follow-up only where it helps. Chapters with no lessons yet get two short screening questions. Topics you&apos;ve already proven are skipped.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Lessons and term lookup are closed until you finish.</li>
              <li>No timer. Rate how sure you are before each answer.</li>
              <li>Grades show once a chapter is done, so they can&apos;t steer the rest of it.</li>
              <li>Pause between chapters whenever you like. It picks up where you stopped.</li>
            </ul>
            <Button size="lg" className="mt-5" disabled={busy === "start"} onClick={() => void start(baselineDone ? "checkpoint" : "baseline")}>
              {busy === "start" ? "Starting..." : baselineDone ? "Start a checkpoint" : "Start the baseline"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon>
            </Button>
          </section>
        )}

        {run && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <nav aria-label="Chapters" className="order-2 lg:order-none">
              <p className={cn(label, "mb-3")}>{run.chapters.filter((chapter) => chapter.status === "done").length} OF {run.chapters.length} CHAPTERS DONE</p>
              <ChapterList run={run} focus={focusChapter?.chapterId ?? null} />
              <p className="mt-3 text-xs text-muted-foreground">AI calls used: {run.generations} of {run.allowance} for this assessment.</p>
            </nav>
            <div className="min-w-0 space-y-4">
              {run.completedAt && (
                <section className="rounded-xl border border-foreground p-6">
                  <p className="text-[15px] leading-6">Finished on {new Date(run.completedAt).toLocaleDateString("en", { month: "long", day: "numeric" })}. {run.kind === "baseline" ? "This is your starting point and it never changes." : "Your profile shows it next to your baseline."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild><Link href="/lab">See your profile</Link></Button>
                    {run.kind === "baseline" && <Button asChild variant="outline"><Link href="/lab/profile">Pick a direction</Link></Button>}
                  </div>
                </section>
              )}
              {!run.completedAt && focusChapter && focusChapter.status !== "done" && (
                run.current && run.current.chapterId === focusChapter.chapterId
                  ? <CurrentQuestion run={run} onAnswered={answered} />
                  : (
                    <section className="rounded-xl border border-border p-6">
                      <p className={label}>{focusChapter.title.toUpperCase()}</p>
                      <p className="mt-2 text-[15px] leading-6">
                        {focusChapter.kind === "topics"
                          ? `${focusChapter.topics.length} topic${focusChapter.topics.length === 1 ? "" : "s"} to ask about${focusChapter.skipped.length ? `, ${focusChapter.skipped.length} skipped as already known` : ""}.`
                          : "No lessons yet, so two short screening questions estimate how deep you go."}
                        {focusChapter.unwritten > 0 && focusChapter.status === "in_progress" ? ` ${focusChapter.unwritten} topic${focusChapter.unwritten === 1 ? "'s" : "s'"} questions still need writing.` : ""}
                      </p>
                      <Button className="mt-4" disabled={Boolean(busy)} onClick={() => void prepare(focusChapter.chapterId)}>
                        {busy === focusChapter.chapterId ? "Writing questions..." : focusChapter.unwritten > 0 && focusChapter.status === "in_progress" ? "Write the missing questions" : "Start this chapter"}
                      </Button>
                    </section>
                  )
              )}
              {run.chapters.filter((chapter) => chapter.status === "done" && (run.completedAt || chapter.chapterId === focusChapter?.chapterId || chapter.chapterId === focus)).map((chapter) => <ChapterResults key={chapter.chapterId} chapter={chapter} />)}
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
