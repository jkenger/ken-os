"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleDashed } from "lucide-react";
import type { GuideMessage, IntakeAnswers } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import type { RunChapterView, RunView } from "@/features/engineering-lab/assessment-run";
import { cn } from "@/lib/utils";
import { GuideChat, type GuideProposals } from "../profile/guide-chat";
import { Question, type AnswerPayload, type AssessmentView } from "../topic/answers";
import { post, textarea } from "../topic/client";
import { RubricChecklist } from "../topic/feedback";
import { Panel, Stat, TitleBar } from "../panel";
import { label, labelWords, modeWords, toneFor } from "../words";
import { engineering } from "@/features/engineering-lab/routes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// The baseline assessment and its retakes. Design: docs/architecture/engineering-lab-profile.md, sections 3 and 4.
// Closed-book: this page turns off term lookup, and grades stay hidden until a chapter is done. Laid out in the lab's
// tight bordered layout (panel.tsx): a title bar, then bordered panels at full width.

const emptyIntake: IntakeAnswers = { building: "", stack: "", aiWork: "", weeklyHours: 5 };

function IntakeCard({ proposal, onSaved }: { proposal: IntakeAnswers | null; onSaved: () => void }) {
  const [values, setValues] = useState<IntakeAnswers>(proposal ?? emptyIntake);
  const [seen, setSeen] = useState(proposal);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  // A new proposal from the Guide refills the card; your own edits stay until then.
  if (proposal && proposal !== seen) { setSeen(proposal); setValues(proposal); }
  const field = (key: "building" | "stack" | "aiWork", title: string, hint: string) => (
    <Label className="block">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mb-1.5 block text-sm text-muted-foreground">{hint}</span>
      <Textarea className={cn("min-h-[64px]")} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
    </Label>
  );

  async function save() {
    setBusy(true); setProblem("");
    try {
      await post("/api/lab/profile", { action: "intake", intake: values });
      onSaved();
    } catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't save. Try again"); }
    finally { setBusy(false); }
  }

  return (
    <Panel title="From your intro" meta="Steers where questions start; never graded">
      <p className="text-sm text-muted-foreground">Edit anything</p>
      <div className="mt-3 space-y-3">
        {field("building", "What you build", "e.g. my own web products, a SaaS for clinics")}
        {field("stack", "What you use day to day", "Languages, frameworks, databases, hosting")}
        {field("aiWork", "AI work you've already started", "Even partly: embeddings, RAG, agents, evals")}
        <Label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Hours per week</span>
          <Input type="number" min={1} max={80} className="w-28" value={values.weeklyHours} onChange={(event) => setValues({ ...values, weeklyHours: Number(event.target.value) })} />
        </Label>
      </div>
      {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
      <Button type="button" className="mt-4" disabled={busy || !values.building.trim() || !values.stack.trim() || !values.aiWork.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save and continue"}</Button>
    </Panel>
  );
}

function ChapterList({ run, focus }: { run: RunView; focus: string | null }) {
  return (
    <ol className="divide-y divide-border">
      {run.chapters.map((chapter, index) => (
        <li key={chapter.chapterId}>
          <Link
            href={engineering.assessment({ run: run.id, chapter: chapter.chapterId })}
            className={cn("flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/60", focus === chapter.chapterId && "bg-muted font-semibold")}
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
    <Panel title={`${chapter.title} · Results`} id={`results-${chapter.chapterId}`}>
      {chapter.kind === "topics" && (
        <ul className="space-y-1.5 text-sm">
          {chapter.topics.map((topic) => <li key={topic.topicId} className="flex flex-wrap items-center gap-2"><span className="font-semibold">{topic.title}</span>{topic.label && <Pill tone={toneFor(topic.label)}>{labelWords[topic.label]}</Pill>}{topic.label === "solid" && <span className="text-muted-foreground">Placed · can skip</span>}</li>)}
          {chapter.skipped.length > 0 && <li className="text-muted-foreground">Skipped as known: {chapter.skipped.length} topic{chapter.skipped.length === 1 ? "" : "s"}</li>}
        </ul>
      )}
      {chapter.kind === "screen" && <p className="text-sm text-muted-foreground">No lessons yet · estimate only, never proves a topic</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold">All answers</summary>
        <ul className="mt-3 space-y-4">
          {chapter.answers.map((answer, index) => (
            <li key={index} className="border-t border-border pt-3 text-sm">
              <p className={label}>{modeWords[answer.mode] ?? answer.mode}{answer.selfRating ? ` · Confidence ${answer.selfRating} of 5` : ""}</p>
              <p className="mt-1 font-semibold">{answer.prompt}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{answer.answer || "(no text)"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><Pill tone={toneFor(answer.voided ? "voided" : answer.label)}>{answer.voided ? "Discarded" : labelWords[answer.label]}</Pill><span>{answer.feedback}</span></div>
              {answer.rubric && <RubricChecklist items={answer.rubric} />}
            </li>
          ))}
        </ul>
      </details>
    </Panel>
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
  const heading = `${topic ? `${topic.title} · ` : ""}Question ${current.position} of up to ${current.outOf}`;
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
      router.push(engineering.assessment({ run: result.id }));
      router.refresh();
    } catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't start. Try again"); }
    finally { setBusy(""); }
  }

  async function prepare(chapterId: string) {
    if (!run) return;
    setBusy(chapterId); setProblem("");
    try {
      await post(`/api/lab/runs/${run.id}/chapters/${chapterId}`);
      router.refresh();
    } catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't write questions. Try again"); }
    finally { setBusy(""); }
  }

  function answered(finished: boolean) {
    if (finished) toast({ tone: "success", title: run?.kind === "baseline" ? "Baseline finished" : "Checkpoint finished", description: "Profile updated" });
    router.refresh();
  }

  const kind = run?.kind ?? (baselineDone ? "checkpoint" : "baseline");
  const state = !run ? (intake ? "Not started" : "Intro") : run.completedAt ? null : "Closed-book · one chapter at a time";
  const chaptersDone = run ? run.chapters.filter((chapter) => chapter.status === "done").length : 0;

  return (
    <WorkspaceShell email={email} active="lab" tab="profile" termLookup={false}>
      <div className="w-full px-5 py-6 sm:px-8">
        <TitleBar
          kicker={state ?? undefined}
          title={kind === "baseline" ? "Baseline" : "Checkpoint"}
          stats={run ? <>
            <Stat label="Chapters" value={`${chaptersDone} of ${run.chapters.length}`} />
            <Stat label="AI uses" value={`${run.generations} of ${run.allowance}`} />
            {run.completedAt && <Stat label="Finished" value={new Date(run.completedAt).toLocaleDateString("en", { month: "short", day: "numeric" })} />}
          </> : undefined}
        />
        {problem && <p className="mt-4 rounded-md bg-card px-4 py-2.5 text-sm shadow-panel" role="alert">{problem}</p>}

        {!run && !intake && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GuideChat
              phase="intake" history={conversation}
              opener="Hi. Before the questions, tell me what you build, what you use day to day, what AI work you've already started, and how many hours a week you can give this. A few sentences is plenty."
              onProposals={(next: GuideProposals) => { if (next.intake) setProposal(next.intake); }}
            />
            <IntakeCard proposal={proposal} onSaved={() => router.refresh()} />
          </div>
        )}

        {!run && intake && (
          <Panel className="mt-4 max-w-[760px] border-foreground" title={`${kind === "baseline" ? "Baseline" : "Checkpoint"} · Not started`}>
            <details className="group" open={!baselineDone}>
              <DisclosureSummary className="text-sm font-semibold">How this works</DisclosureSummary>
              <ul className="mt-3 list-disc space-y-1 pl-11 text-sm text-muted-foreground">
                <li>One question per written topic, a follow-up if needed</li>
                <li>Chapters without lessons: placement check, 2 questions</li>
                <li>Proven topics skipped</li>
                <li>Lessons and term lookup locked until done</li>
                <li>No timer · rate confidence before each answer</li>
                <li>Grades shown after each chapter</li>
                <li>Pause between chapters</li>
              </ul>
            </details>
            <Button className="mt-4" disabled={busy === "start"} onClick={() => void start(baselineDone ? "checkpoint" : "baseline")}>
              {busy === "start" ? "Starting…" : baselineDone ? "Start checkpoint" : "Start baseline"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon>
            </Button>
          </Panel>
        )}

        {run && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
            <nav aria-label="Chapters" className="order-2 lg:sticky lg:top-6 lg:order-none">
              <Panel title="Chapters" meta={`${chaptersDone} of ${run.chapters.length} done`} bodyClassName="p-0">
                <ChapterList run={run} focus={focusChapter?.chapterId ?? null} />
              </Panel>
            </nav>
            <div className="min-w-0 max-w-[880px] space-y-4">
              {run.completedAt && (
                <Panel title={`Finished ${new Date(run.completedAt).toLocaleDateString("en", { month: "long", day: "numeric" })}`} className="border-foreground">
                  <p className="text-sm">{run.kind === "baseline" ? "Baseline · never changes" : "Shown next to the baseline"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild><Link href={engineering.profile}>Open profile</Link></Button>
                    {run.kind === "baseline" && <Button asChild variant="outline"><Link href={engineering.direction("roles")}>Choose direction</Link></Button>}
                  </div>
                </Panel>
              )}
              {!run.completedAt && focusChapter && focusChapter.status !== "done" && (
                run.current && run.current.chapterId === focusChapter.chapterId
                  ? <CurrentQuestion run={run} onAnswered={answered} />
                  : (
                    <Panel title={focusChapter.title}>
                      <p className="text-sm leading-6">
                        {focusChapter.kind === "topics"
                          ? `${focusChapter.topics.length} topic${focusChapter.topics.length === 1 ? "" : "s"}${focusChapter.skipped.length ? ` · ${focusChapter.skipped.length} skipped as known` : ""}`
                          : "No lessons yet · placement check, 2 questions"}
                        {focusChapter.unwritten > 0 && focusChapter.status === "in_progress" ? ` · ${focusChapter.unwritten} topic${focusChapter.unwritten === 1 ? "" : "s"} need${focusChapter.unwritten === 1 ? "s" : ""} questions` : ""}
                      </p>
                      <Button className="mt-3" disabled={Boolean(busy)} onClick={() => void prepare(focusChapter.chapterId)}>
                        {busy === focusChapter.chapterId ? "Writing questions…" : focusChapter.unwritten > 0 && focusChapter.status === "in_progress" ? "Write questions" : "Start chapter"}
                      </Button>
                    </Panel>
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
