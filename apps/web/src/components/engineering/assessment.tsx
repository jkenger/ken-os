"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowRight, IconCheck, IconCircle, IconCircleDot } from "@tabler/icons-react";
import type { IntakeAnswers } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { post } from "@/components/lab/topic/client";
import { RubricChecklist } from "@/components/lab/topic/feedback";
import { formatDate, labelWords, modeWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import type { RunChapterView, RunView } from "@/features/engineering-lab/assessment-run";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { Badge, Back, eyebrow, Notice, PageHeading, panel, primaryButton } from "./kit";
import { Dialog, Feedback, field, fieldLabel, FlowLayout, FlowNotes, NoteList, ProgressTrack, QuestionPanel, questionPanel, SessionHeading, SuccessView, type QuestionPayload } from "./flow";

// Establish profile, as the selected 2026-10-06 prototype lays it out: intro form, then the closed-book assessment one
// question at a time with a progress column, then results. Every step uses the real run: questions are written per
// chapter, answers are graded and stored, and grades stay hidden until a chapter is done.
// Design: docs/architecture/engineering-redesign.md; rules: engineering-lab-profile.md section 4.

const page = "mx-auto max-w-[1500px] px-3 pb-9 pt-6 md:px-5 md:pt-[30px] min-[1500px]:pt-9";

function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  return <WorkspaceShell email={email} active="lab" tab="profile" termLookup={false}><div className={page}>{children}</div></WorkspaceShell>;
}

function RulesDialog() {
  return (
    <Dialog title="How this works" trigger="How this works">
      <p>No timer. Questions are closed-book: lessons and term lookup are hidden until you finish.</p>
      <p className="mt-3">Choose how sure you are before each answer. Answers lock when you submit; a prediction runs only after it locks.</p>
      <p className="mt-3">One or two questions per written topic, chapter by chapter. Topics you have already proven are skipped. Grades show when a chapter is done, and the profile appears when every chapter is done.</p>
      <p className="mt-3">Pause between questions. Everything you submit is saved.</p>
    </Dialog>
  );
}

function ChapterAnswers({ chapter }: { chapter: RunChapterView }) {
  return (
    <details className={cn(panel, "group mb-3")}>
      <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 text-[13px] [&::-webkit-details-marker]:hidden">
        <strong className="flex-1 font-semibold text-foreground">{chapter.title}</strong>
        <span className="text-xs text-muted-foreground">{chapter.answers.length} answers{chapter.skipped.length ? ` · ${chapter.skipped.length} skipped as known` : ""}</span>
      </summary>
      <ul className="space-y-4 px-5 pb-5">
        {chapter.answers.map((answer, index) => (
          <li key={index} className="border-t border-border pt-3 text-[13px]">
            <p className="text-xs text-muted-foreground">{modeWords[answer.mode] ?? answer.mode}{answer.selfRating ? ` · Confidence ${answer.selfRating} of 5` : ""}</p>
            <p className="mt-1 font-semibold text-foreground">{answer.prompt}</p>
            <blockquote className="my-2 whitespace-pre-wrap border-l-[3px] border-rail-soft pl-[15px] leading-[1.6]">{answer.answer || "(no text)"}</blockquote>
            <div className="flex flex-wrap items-center gap-2"><Pill tone={toneFor(answer.voided ? "voided" : answer.label)}>{answer.voided ? "Discarded" : labelWords[answer.label]}</Pill><span>{answer.feedback}</span></div>
            {answer.rubric && <RubricChecklist items={answer.rubric} />}
          </li>
        ))}
      </ul>
    </details>
  );
}

function EvidenceDialog({ run, trigger = "Inspect assessment evidence" }: { run: RunView; trigger?: string }) {
  const done = run.chapters.filter((chapter) => chapter.status === "done");
  return (
    <Dialog title="Evidence" trigger={trigger}>
      <p>Every question as asked, your answer, confidence, grade and feedback. The intro never counts toward a level.</p>
      <div className="mt-4">{done.length ? done.map((chapter) => <ChapterAnswers key={chapter.chapterId} chapter={chapter} />) : <Notice>Grades show when a chapter is done</Notice>}</div>
      <h3>What&apos;s stored</h3>
      <p>Question, rubric, answer, confidence, grade, feedback and the grader version are kept together. A finished baseline never changes.</p>
    </Dialog>
  );
}

/** Step 1: the intro. Shapes where questions start and the first pace estimate; never graded. */
function Intro({ intake, kind, onStart, busy, problem }: { intake: IntakeAnswers | null; kind: "baseline" | "checkpoint"; onStart: (values: IntakeAnswers) => void; busy: boolean; problem: string }) {
  const [values, setValues] = useState<IntakeAnswers>(intake ?? { building: "", stack: "", aiWork: "", weeklyHours: 5 });
  const valid = values.building.trim() && values.stack.trim() && values.aiWork.trim() && values.weeklyHours >= 1 && values.weeklyHours <= 80;
  const text = (key: "building" | "stack" | "aiWork", label: string, hint: string) => (
    <label className={cn(fieldLabel, "mb-[25px]")}>
      {label}
      <textarea className={cn(field, "min-h-[96px] resize-y leading-[1.6]")} placeholder={hint} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
    </label>
  );
  return (
    <>
      <Back href={engineering.overview}>Engineering</Back>
      <PageHeading title={kind === "baseline" ? "Intro" : "Checkpoint"} />
      <FlowLayout>
        <section className={cn(panel, "p-[23px] md:p-[30px]")}>
          <div className={eyebrow}>Intro · 1 of 2</div>
          {text("building", "What are you building?", "My own web products, a SaaS for clinics")}
          {text("stack", "What do you use day to day?", "Languages, frameworks, databases, hosting")}
          {text("aiWork", "What AI work have you started?", "Even partly: embeddings, RAG, agents, evals")}
          <label className={cn(fieldLabel, "mb-[25px]")}>
            Hours per week you can comfortably spend
            <input type="number" min={1} max={80} className={cn(field, "max-w-[160px]")} value={values.weeklyHours} onChange={(event) => setValues({ ...values, weeklyHours: Number(event.target.value) })} />
          </label>
          <p className="mb-[18px] text-xs text-muted-foreground">Never graded. Choose a direction after the assessment</p>
          {problem && <Notice tone="error">{problem}</Notice>}
          <button type="button" className={primaryButton} disabled={busy || !valid} onClick={() => onStart(values)}>
            {busy ? "Starting…" : "Continue to assessment"}<IconArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
        <FlowNotes title="Your starting point">
          <p className="mt-[7px]">Thirteen chapters across five areas. Short predictions and practical scenarios.</p>
          <NoteList items={["No timer or speed score", "Pause between questions", "Confidence is separate from the grade", "Proven topics are skipped"]} />
          <Notice>One question per written topic, a follow-up when needed. Length depends on your answers</Notice>
        </FlowNotes>
      </FlowLayout>
    </>
  );
}

function ProgressColumn({ run, current }: { run: RunView; current: string | null }) {
  return (
    <FlowNotes title="Your progress">
      <ol className="mt-2">
        {run.chapters.map((chapter) => (
          <li key={chapter.chapterId} className={cn("flex items-center gap-3 border-b border-border py-[13px] text-[13px]", chapter.chapterId === current && "font-semibold text-foreground")} aria-current={chapter.chapterId === current ? "step" : undefined}>
            {chapter.status === "done" ? <IconCheck size={18} className="shrink-0 text-status-solid" aria-label="Done" />
              : chapter.chapterId === current ? <IconCircleDot size={18} className="shrink-0" aria-label="Current" />
                : <IconCircle size={18} className="shrink-0" aria-hidden="true" />}
            <span className="flex-1">{chapter.title}</span>
            {chapter.status === "done" && chapter.kind === "topics" && <span className="text-[11px] font-normal">{chapter.topics.filter((topic) => topic.label === "solid").length + chapter.skipped.length} of {chapter.topics.length + chapter.skipped.length} known</span>}
          </li>
        ))}
      </ol>
      <p className="mt-4">Closed book: lessons and term lookup are hidden until you finish.</p>
      <p className="mt-3">Answers are saved when you submit. Pause whenever you need.</p>
    </FlowNotes>
  );
}

/** Step 2: the assessment, one question at a time. */
function Session({ run }: { run: RunView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [finished, setFinished] = useState(false);
  const done = run.chapters.filter((chapter) => chapter.status === "done").length;
  const chapter = run.chapters.find((item) => item.chapterId === run.current?.chapterId) ?? run.chapters.find((item) => item.status !== "done") ?? null;
  const number = chapter ? run.chapters.indexOf(chapter) + 1 : run.chapters.length;
  const name = run.kind === "baseline" ? "Baseline" : "Checkpoint";
  const previous = [...run.chapters].reverse().find((item) => item.status === "done");

  async function prepare(chapterId: string) {
    setBusy(true); setProblem("");
    try { await post(`/api/lab/runs/${run.id}/chapters/${chapterId}`); router.refresh(); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't write questions. Try again"); }
    finally { setBusy(false); }
  }

  async function submit(payload: QuestionPayload) {
    const current = run.current!;
    const result = current.type === "screen"
      ? await post<{ runFinished: boolean }>("/api/lab/screens", { screenId: current.id, text: payload.text ?? "", selfRating: payload.selfRating })
      : await post<{ runFinished: boolean }>("/api/lab/attempts", {
        type: "answer", assessmentId: current.id, itemIndex: current.itemIndex, selfRating: payload.selfRating,
        response: payload.lines ? { lines: payload.lines, ...(payload.why ? { why: payload.why } : {}) } : { text: payload.text ?? "" },
        ...(payload.actualOutput ? { actualOutput: payload.actualOutput } : {}),
      });
    setFinished(result.runFinished);
  }

  function next() {
    if (finished) {
      toast({ tone: "success", title: `${name} finished`, description: "Profile updated" });
      router.push(engineering.results(run.id));
      return;
    }
    router.refresh();
  }

  const current = run.current;
  const topic = current?.topicId ? chapter?.topics.find((item) => item.topicId === current.topicId) : null;

  return (
    <>
      <SessionHeading
        left={<Link href={engineering.overview} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground md:text-[13px]"><IconArrowLeft size={17} aria-hidden="true" />Save & exit</Link>}
        middle={`${name} · Chapter ${number} of ${run.chapters.length}`}
        right={<RulesDialog />}
      />
      <ProgressTrack done={done} total={run.chapters.length} />
      <FlowLayout>
        {current && chapter ? (
          <QuestionPanel
            key={`${current.id}-${current.itemIndex}`}
            kicker={`${chapter.title}${topic ? ` · ${topic.title}` : ""} · Question ${current.position} of up to ${current.outOf}`}
            title={modeWords[current.item.mode] ?? "Question"}
            item={current.item}
            onSubmit={submit}
            after={(
              <Feedback badge={<Badge>Saved · graded with the chapter</Badge>} title={finished ? `${name} complete` : "Answer saved"} action={(
                <button type="button" className={primaryButton} onClick={next}>{finished ? "View results" : "Next question"}<IconArrowRight size={18} aria-hidden="true" /></button>
              )}>
                Grades show when this chapter is done. You can stop here and come back.
              </Feedback>
            )}
          />
        ) : chapter ? (
          <section className={questionPanel}>
            {previous && previous.status === "done" && (
              <Notice tone="success"><strong className="font-semibold">{previous.title} done</strong> · {previous.kind === "topics" ? `${previous.topics.filter((item) => item.label === "solid").length} of ${previous.topics.length} solid` : "placement check saved"} · <EvidenceDialog run={run} trigger="See grades" /></Notice>
            )}
            <div className={eyebrow}>Chapter {number} of {run.chapters.length}</div>
            <h2 className="my-3 text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">{chapter.title}</h2>
            <p className="mb-[18px] text-[15px] leading-[1.6] text-muted-foreground">
              {chapter.kind === "topics" ? `${chapter.topics.length} topics${chapter.skipped.length ? ` · ${chapter.skipped.length} skipped as known` : ""}` : "No lessons yet · placement check, 2 questions"}
              {chapter.unwritten > 0 && chapter.status === "in_progress" ? ` · ${chapter.unwritten} need questions` : ""}
            </p>
            {problem && <Notice tone="error">{problem}</Notice>}
            <button type="button" className={primaryButton} disabled={busy} onClick={() => void prepare(chapter.chapterId)}>
              {busy ? "Writing questions… ~30 s" : chapter.unwritten > 0 && chapter.status === "in_progress" ? "Write questions" : "Start chapter"}<IconArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        ) : (
          <section className={questionPanel}>
            <SuccessView title={`${name} complete`} action={<Link href={engineering.results(run.id)} className={primaryButton}>View results<IconArrowRight size={18} aria-hidden="true" /></Link>} />
          </section>
        )}
        <ProgressColumn run={run} current={chapter?.chapterId ?? null} />
      </FlowLayout>
    </>
  );
}

/** Step 3: results, then direction. */
function Results({ run }: { run: RunView }) {
  const name = run.kind === "baseline" ? "Baseline" : "Checkpoint";
  const answers = run.chapters.reduce((sum, chapter) => sum + chapter.answers.filter((answer) => !answer.voided).length, 0);
  const topics = run.chapters.reduce((sum, chapter) => sum + chapter.topics.length + chapter.skipped.length, 0);
  const known = run.chapters.reduce((sum, chapter) => sum + chapter.topics.filter((topic) => topic.label === "solid").length + chapter.skipped.length, 0);
  return (
    <>
      <PageHeading title={`${name} complete`} />
      <section className={cn(panel, "mx-[5px] max-w-[850px] p-[23px] md:mx-3.5 md:p-8")}>
        <Badge>{name} · {run.completedAt ? formatDate(run.completedAt) : "In progress"}</Badge>
        <h2 className="my-4 text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">Your starting point</h2>
        <div className="my-8 grid grid-cols-3 gap-5">
          {[[String(run.chapters.length), "Chapters"], [String(answers), "Answers graded"], [`${known} of ${topics}`, "Topics known"]].map(([value, label]) => (
            <div key={label}><strong className="block text-xl font-bold md:text-[26px]">{value}</strong><small className="mt-2 block text-[11px] text-muted-foreground md:text-sm">{label}</small></div>
          ))}
        </div>
        <Notice>{run.kind === "baseline" ? "The baseline never changes. Later evidence updates the profile; a checkpoint is a new snapshot" : "Shown next to the baseline on the profile"}</Notice>
        <div className="flex flex-wrap items-center gap-5">
          <Link href={run.kind === "baseline" ? engineering.direction() : engineering.profile} className={primaryButton}>{run.kind === "baseline" ? "Choose your direction" : "Open profile"}<IconArrowRight size={18} aria-hidden="true" /></Link>
          <EvidenceDialog run={run} />
        </div>
      </section>
    </>
  );
}

export function EngineeringAssessment({ email, intake, run, baselineDone }: { email: string; intake: IntakeAnswers | null; run: RunView | null; baselineDone: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const kind = run?.kind ?? (baselineDone ? "checkpoint" : "baseline");

  async function start(values: IntakeAnswers) {
    setBusy(true); setProblem("");
    try {
      const changed = !intake || JSON.stringify(values) !== JSON.stringify(intake);
      if (changed) await post("/api/lab/profile", { action: "intake", intake: values });
      const result = await post<{ id: string }>("/api/lab/runs", { kind });
      router.push(engineering.assessment({ run: result.id }));
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't start. Try again");
      setBusy(false);
    }
  }

  return (
    <Shell email={email}>
      {!run ? <Intro intake={intake} kind={kind} onStart={(values) => void start(values)} busy={busy} problem={problem} />
        : run.completedAt ? <Results run={run} />
          : <Session run={run} />}
    </Shell>
  );
}

