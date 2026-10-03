"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Play, RotateCcw } from "lucide-react";
import { parsePredictedLines, scoreProbe, type LabDefinition, type PracticePredict as PracticePredictItem, type Topic } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import type { SavedAnswer, TopicView } from "@/features/engineering-lab/store";
import { buildLabScript, buildPredictScript, PGLITE_URL, type TestResult } from "@/features/engineering-lab/runner/harness";
import { PROBES } from "@/features/engineering-lab/runner/probes";
import { runInWorker } from "@/features/engineering-lab/runner/run-in-worker";
import { cn } from "@/lib/utils";
import { CodeBlock, Markdown } from "./markdown";
import { formatDate, kindWords, label, labelWords, modeWords, statusWords, toneFor } from "./words";

const textarea = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const section = "scroll-mt-24 border-b border-border px-5 py-7 sm:px-8 lg:px-10";
const heading = "mt-2 font-display text-2xl font-semibold tracking-[-0.05em]";

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

/** What a snippet really prints, from the learner's browser. Used as the ground truth for predictions. */
async function realOutput(code: string) {
  const outcome = await runInWorker(buildPredictScript(code), 3000);
  if (outcome.type === "output") return outcome.logs;
  throw new Error(outcome.type === "timeout" || outcome.type === "error" ? `The snippet could not run: ${outcome.message}` : "The snippet could not run.");
}

function Tag({ value, children }: { value: string; children: React.ReactNode }) {
  return <Pill tone={toneFor(value)}>{children}</Pill>;
}

function Lab({ lab, revealed, onDone }: { lab: LabDefinition; revealed: boolean; onDone: (message: string) => void }) {
  const storageKey = `ken-os-lab:${lab.id}`;
  const [code, setCode] = useState(lab.starter);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);

  useEffect(() => {
    try { const saved = localStorage.getItem(storageKey); if (saved) setCode(saved); } catch { /* storage unavailable */ }
  }, [storageKey]);
  const update = (value: string) => {
    setCode(value);
    try { localStorage.setItem(storageKey, value); } catch { /* storage unavailable */ }
  };

  async function run() {
    setBusy(true); setProblem(""); setResults(null);
    try {
      const script = buildLabScript(code, lab.tests, {
        origin: window.location.origin,
        pglite: lab.runner === "pglite" ? { url: PGLITE_URL, setup: lab.setup } : undefined,
      });
      const outcome = await runInWorker(script, lab.timeoutMs + 1000);
      if (outcome.type !== "tests") {
        setProblem(outcome.type === "output" ? "No tests ran." : outcome.message);
        return;
      }
      setResults(outcome.results);
      const passed = outcome.results.filter((item) => item.passed).length;
      const output = outcome.results.map((item) => `${item.passed ? "PASS" : "FAIL"} ${item.name}${item.error ? `: ${item.error}` : ""}`).join("\n");
      const saved = await post<{ solutionSeen: boolean }>("/api/lab/attempts", { type: "lab", labId: lab.id, code, run: { passed, failed: outcome.results.length - passed, output } });
      onDone(saved.solutionSeen ? "Run saved. You've seen this lab's solution, so it no longer counts as proof." : "Run saved.");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not run the tests.");
    } finally {
      setBusy(false);
    }
  }

  async function showSolution() {
    if (!revealed && !window.confirm("After you see the solution, passing this lab won't count as proof. Show it?")) return;
    try { setSolution((await post<{ solution: string }>(`/api/lab/labs/${lab.id}/solution`)).solution); onDone("Solution shown."); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Could not load the solution."); }
  }

  return (
    <article className="mt-5 rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold tracking-[-0.03em]">{lab.title}</h3>
        <span className={label}>{lab.modes.map((mode) => modeWords[mode]).join(" · ").toUpperCase()}</span>
      </div>
      <div className="mt-3"><Markdown text={lab.readme} /></div>
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold">Your code</p>
        <CodeEditor value={code} onChange={update} label={`Your code for ${lab.title}`} minHeight={220} />
        <p className="mt-1.5 text-xs text-muted-foreground">Tab indents. Press Escape, then Tab, to move on from the editor.</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void run()} disabled={busy}><Play size={15} aria-hidden="true" />{busy ? "Running..." : "Run tests"}</Button>
        <Button type="button" variant="outline" onClick={() => { update(lab.starter); setResults(null); }}><RotateCcw size={15} aria-hidden="true" />Reset to starter</Button>
        <Button type="button" variant="ghost" onClick={() => void showSolution()}>{revealed ? "Show solution again" : "Show solution"}</Button>
      </div>
      {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
      {results && (
        <ul className="mt-4 space-y-1.5 text-sm" role="status">
          {results.map((item) => <li key={item.name} className="flex gap-2"><Tag value={item.passed ? "solid" : "gap"}>{item.passed ? "Pass" : "Fail"}</Tag><span>{item.name}{item.error && <span className="block text-muted-foreground">{item.error}</span>}</span></li>)}
        </ul>
      )}
      <details className="group mt-4" id={`${lab.id}-tests`}><DisclosureSummary className="text-xs font-semibold">See the tests</DisclosureSummary><div className="mt-2"><CodeBlock code={lab.tests} label={`Tests for ${lab.title}`} /></div></details>
      {solution && <div className="mt-4"><p className="mb-2 text-sm font-semibold">Solution</p><CodeBlock code={solution} label={`Solution for ${lab.title}`} /></div>}
    </article>
  );
}

function ProbeLab({ lab, onDone }: { lab: LabDefinition; onDone: (message: string) => void }) {
  const questions = lab.probe!.questions;
  const [predicted, setPredicted] = useState<Record<string, string>>({});
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = questions.every((question) => predicted[question.id]);

  async function check() {
    setBusy(true); setProblem(""); setResults(null);
    try {
      const probe = PROBES[lab.probe!.id];
      if (!probe) throw new Error("This check isn't available in this build.");
      const observed = await probe();
      const score = scoreProbe(questions, predicted, observed);
      setResults(score.results);
      const output = score.results.map((item) => `${item.passed ? "PASS" : "FAIL"} ${item.name}${item.error ? `: ${item.error}` : ""}`).join("\n");
      await post("/api/lab/attempts", { type: "lab", labId: lab.id, code: JSON.stringify(predicted), run: { passed: score.passed, failed: score.failed, output } });
      onDone("Check saved.");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The check could not run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mt-5 rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold tracking-[-0.03em]">{lab.title}</h3>
        <span className={label}>PREDICT, THEN CHECK</span>
      </div>
      <div className="mt-3"><Markdown text={lab.readme} /></div>
      <ol className="mt-5 space-y-4">
        {questions.map((question, index) => (
          <li key={question.id}>
            <fieldset>
              <legend className="text-[15px] font-semibold">{index + 1}. {question.prompt}</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {question.options.map((option) => (
                  <Button key={option} type="button" size="sm" variant={predicted[question.id] === option ? "default" : "outline"} aria-pressed={predicted[question.id] === option}
                    onClick={() => setPredicted((current) => ({ ...current, [question.id]: option }))}>{option}</Button>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <Button type="button" className="mt-5" disabled={busy || !ready} onClick={() => void check()}><Play size={15} aria-hidden="true" />{busy ? "Running real requests..." : ready ? "Run the check" : "Answer every question first"}</Button>
      {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
      {results && (
        <ul className="mt-4 space-y-2 text-sm" role="status">
          {results.map((item) => <li key={item.name} className="flex gap-2"><Tag value={item.passed ? "solid" : "gap"}>{item.passed ? "Right" : "Wrong"}</Tag><span>{item.name}{item.error && <span className="block text-muted-foreground">{item.error}</span>}</span></li>)}
        </ul>
      )}
    </article>
  );
}

function Confidence({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-semibold">How sure are you, before answering?</legend>
      <p className="mt-1 text-sm text-muted-foreground">This doesn't change your grade. It flags answers you were sure about but got wrong, since those beliefs are the hardest to notice.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Button key={rating} type="button" size="sm" variant={value === rating ? "default" : "outline"} aria-pressed={value === rating} onClick={() => onChange(rating)}>
            {rating}{rating === 1 ? " guessing" : rating === 5 ? " certain" : ""}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

type AssessmentView = NonNullable<TopicView["assessment"]>;

/** Two boxes for a prediction: the printed lines, which code checks, and the reason, which is only saved. */
function PredictInputs({ lines, why, onLines, onWhy, tall }: { lines: string; why: string; onLines: (value: string) => void; onWhy: (value: string) => void; tall?: boolean }) {
  return (
    <>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold">What it prints, one line per log</span>
        <textarea className={cn(textarea, tall ? "min-h-[110px]" : "min-h-[80px]", "font-mono")} spellCheck={false} value={lines} onChange={(event) => onLines(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="block text-sm font-semibold">Why</span>
        <span className="mb-2 block text-sm text-muted-foreground">Optional and not graded. Compare it with the explanation after you check.</span>
        <textarea className={cn(textarea, "min-h-[72px]")} value={why} onChange={(event) => onWhy(event.target.value)} />
      </label>
    </>
  );
}

function YourAnswer({ answer }: { answer: SavedAnswer }) {
  return (
    <div className="mt-3">
      <p className="font-semibold">Your answer</p>
      {answer.lines && <pre className="mt-1 whitespace-pre-wrap font-mono text-[13px] leading-5">{answer.lines.join("\n") || "(nothing)"}</pre>}
      {answer.text && <p className="mt-1 whitespace-pre-wrap leading-5">{answer.text}</p>}
      {answer.why && <p className="mt-2 whitespace-pre-wrap leading-5"><span className="font-semibold">Your why: </span>{answer.why}</p>}
    </div>
  );
}

function Explanation({ text }: { text?: string | null }) {
  if (!text) return null;
  return <div className="mt-3"><p className="mb-1 font-semibold">Why it prints this</p><Markdown text={text} /></div>;
}

function Question({ assessment, index, onDone }: { assessment: AssessmentView; index: number; onDone: (message: string) => void }) {
  const item = assessment.items[index];
  const [answer, setAnswer] = useState("");
  const [why, setWhy] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function submit() {
    if (!rating) { setProblem("Pick how sure you are first."); return; }
    setBusy(true); setProblem("");
    try {
      const body = item.mode === "predict"
        ? { type: "answer", assessmentId: assessment.id, itemIndex: index, selfRating: rating, response: { lines: parsePredictedLines(answer), ...(why.trim() ? { why: why.trim() } : {}) }, actualOutput: await realOutput(item.code ?? "") }
        : { type: "answer", assessmentId: assessment.id, itemIndex: index, selfRating: rating, response: { text: answer } };
      await post("/api/lab/attempts", body);
      onDone("Answer graded.");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mt-5 rounded-xl border border-border p-5">
      <p className={label}>QUESTION {index + 1} · {modeWords[item.mode].toUpperCase()}</p>
      <p className="mt-2 text-[15px] leading-6">{item.prompt}</p>
      {item.code && <div className="mt-3"><CodeBlock code={item.code} label={`Code for question ${index + 1}`} /></div>}
      {item.answered ? (
        <div className="mt-4 rounded-lg bg-muted/60 p-4 text-sm" role="status">
          <Tag value={item.answered.voided ? "voided" : item.answered.label}>{item.answered.voided ? "Thrown out" : labelWords[item.answered.label as keyof typeof labelWords]}</Tag>
          <p className="mt-2 leading-5">{item.answered.feedback}</p>
          <YourAnswer answer={item.answered.answer} />
          <Explanation text={item.answered.explanation} />
        </div>
      ) : (
        <>
          <Confidence value={rating} onChange={setRating} />
          {item.mode === "predict" ? <PredictInputs lines={answer} why={why} onLines={setAnswer} onWhy={setWhy} tall /> : (
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold">Your answer</span>
              <textarea className={cn(textarea, "min-h-[130px]")} value={answer} onChange={(event) => setAnswer(event.target.value)} />
            </label>
          )}
          {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
          <Button type="button" className="mt-3" disabled={busy || !answer.trim()} onClick={() => void submit()}>{busy ? "Grading..." : "Submit answer"}</Button>
        </>
      )}
    </article>
  );
}

type PracticeResult = TopicView["practiceResults"][number];

function PracticePredict({ lessonId, index, item, result, onDone }: { lessonId: string; index: number; item: PracticePredictItem; result?: PracticeResult; onDone: (message: string) => void }) {
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
      onDone("Practice checked.");
    } catch (error) { setProblem(error instanceof Error ? error.message : "Could not check."); }
    finally { setBusy(false); }
  }
  function tryAgain() {
    setAnswer(result?.answer.lines?.join("\n") ?? "");
    setWhy(result?.answer.why ?? "");
    setRetrying(true);
  }

  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <p className="text-[15px] leading-6">{item.prompt}</p>
      <div className="mt-3"><CodeBlock code={item.code} label={`Code for practice ${index + 1}`} /></div>
      {result && !retrying ? (
        <div className="mt-3 rounded-lg bg-muted/60 p-4 text-sm" role="status">
          <Tag value={result.voided ? "voided" : result.label}>{result.voided ? "Thrown out" : labelWords[result.label as keyof typeof labelWords]}</Tag>
          <p className="mt-2 leading-5">{result.feedback}</p>
          <YourAnswer answer={result.answer} />
          <Explanation text={item.explanation} />
          {!solid && <Button type="button" size="sm" variant="outline" className="mt-3" onClick={tryAgain}><RotateCcw size={14} aria-hidden="true" />Try again</Button>}
        </div>
      ) : (
        <>
          <PredictInputs lines={answer} why={why} onLines={setAnswer} onWhy={setWhy} />
          {problem && <p className="mt-2 text-sm" role="alert">{problem}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy || !answer.trim()} onClick={() => void check()}>{busy ? "Running..." : "Check by running it"}</Button>
            {retrying && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setRetrying(false)}>Cancel</Button>}
          </div>
        </>
      )}
    </div>
  );
}

export function LabTopic({ email, topic, view, labs, skipLesson }: { email: string; topic: Topic; view: TopicView; labs: LabDefinition[]; skipLesson: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "lesson" | "questions">("");
  const [message, setMessage] = useState("");
  const done = (text: string) => { setMessage(text); router.refresh(); };
  const { progress, lesson, assessment } = view;
  const openQuestions = assessment?.items.some((item) => !item.answered) ?? false;
  const assessorWrites = topic.prove.some((mode) => !labs.some((lab) => lab.modes.includes(mode)));

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

  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] border-x border-border">
        <header className="border-b border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className={label}>ENGINEERING LAB · TOPIC</p><Tag value={progress.status}>{statusWords[progress.status]}</Tag></div>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">{topic.title}</h1>
          <p className="mt-3 max-w-[720px] text-base leading-6 text-muted-foreground">{topic.gap}</p>
          {message && <p className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm" role="status">{message}</p>}
        </header>

        <section className={section} aria-labelledby="proof-title">
          <p className={label}>PROOF</p>
          <h2 className={heading} id="proof-title">What's been shown so far</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {topic.prove.map((mode) => {
              const evidence = progress.evidence[mode];
              return (
                <li key={mode} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm">
                  <span>{modeWords[mode]}</span>
                  {evidence ? <Tag value={evidence.label}>{labelWords[evidence.label]}{evidence.by === "code" ? " · checked by code" : ""}</Tag> : <span className="text-muted-foreground">No answer yet</span>}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            {progress.baselineLabel ? `Baseline on 1 Oct: ${labelWords[progress.baselineLabel]}. ` : "Not assessed in the baseline. "}
            {progress.confidence.averageSelfRating !== null ? `Average confidence ${progress.confidence.averageSelfRating} of 5. ` : ""}
            {progress.confidence.overconfident ? "You were sure about an answer that turned out to be a misconception. " : ""}
            {progress.nextReviewAt ? `Next review ${formatDate(progress.nextReviewAt)}.` : ""}
          </p>
          {progress.weaknesses.length > 0 && <div className="mt-4"><p className="text-sm font-semibold">Still open</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{progress.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        </section>

        <section className={section} id="lesson" aria-labelledby="lesson-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className={label}>LESSON{lesson ? ` · VERSION ${lesson.version}` : ""}</p><h2 className={heading} id="lesson-title">{lesson ? "Learn it" : "No lesson yet"}</h2></div>
            <Button type="button" variant={lesson ? "outline" : "default"} disabled={busy !== ""} onClick={() => void makeLesson()}>{busy === "lesson" ? "Researching and writing, about a minute..." : lesson ? "Write a new version" : "Write the lesson"}</Button>
          </div>
          {skipLesson && !lesson && <p className="mt-3 text-sm text-muted-foreground">The baseline rated this solid, so you can go straight to the check below.</p>}
          {lesson && (
            <div className="mt-6 max-w-[760px] space-y-7">
              {([["Why it matters", lesson.sections.whyItMatters], ["What you already know", lesson.sections.whatYouKnow], ["The gap", lesson.sections.theGap], ["The theory", lesson.sections.theory], ["Mental model", lesson.sections.mentalModel]] as const).map(([title, text]) => (
                <div key={title}><h3 className="mb-2 font-semibold">{title}</h3><Markdown text={text} /></div>
              ))}
              <div><h3 className="mb-2 font-semibold">Worked example</h3><CodeBlock code={lesson.sections.workedExample.code} label="Worked example" /><div className="mt-3"><Markdown text={lesson.sections.workedExample.walkthrough} /></div></div>
              <div>
                <h3 className="font-semibold">Practice</h3>
                <p className="text-sm text-muted-foreground">For learning. Predictions are checked by running the code; they help, but only the check below can prove the topic.</p>
                {lesson.practice.map((item, index) => item.kind === "think" ? (
                  <details key={index} className="group mt-4 rounded-xl border border-border p-4"><DisclosureSummary className="text-[15px]">{item.prompt}</DisclosureSummary><div className="mt-3 pl-6"><Markdown text={item.answer} /></div></details>
                ) : (
                  <PracticePredict key={index} lessonId={lesson.id} index={index} item={item} result={view.practiceResults[index]} onDone={done} />
                ))}
              </div>
              {lesson.noteSuggestions.length > 0 && <div><h3 className="font-semibold">For your notes</h3><p className="text-sm text-muted-foreground">Write these up in Obsidian in your own words.</p><ul className="mt-2 list-disc pl-5 text-sm">{lesson.noteSuggestions.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            </div>
          )}
        </section>

        {labs.length > 0 && (
          <section className={section} id="labs" aria-labelledby="labs-title">
            <p className={label}>LABS</p>
            <h2 className={heading} id="labs-title">{labs.every((lab) => lab.runner === "probe") ? "Predict, then watch the browser" : "Fix it in code"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {labs.every((lab) => lab.runner === "probe")
                ? "Your predictions are checked against real requests your browser makes now. Every answer right counts as proof."
                : "Code runs in your browser, cut off from your Ken OS session. A full pass counts as proof unless you looked at the solution first."}
              {labs.some((lab) => lab.runner === "pglite") && " Database labs load a small Postgres (PGlite) into the page the first time, which takes a few seconds."}
            </p>
            {labs.map((lab) => lab.runner === "probe"
              ? <ProbeLab key={lab.id} lab={lab} onDone={done} />
              : <Lab key={lab.id} lab={lab} revealed={view.revealedLabs.includes(lab.id)} onDone={done} />)}
          </section>
        )}

        <section className={section} id="check" aria-labelledby="check-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className={label}>CHECK{assessment ? ` · ${kindWords[assessment.kind].toUpperCase()}` : ""}</p><h2 className={heading} id="check-title">Prove it with fresh questions</h2></div>
            {assessorWrites && !openQuestions && <Button type="button" disabled={busy !== ""} onClick={() => void makeQuestions()}>{busy === "questions" ? "Writing questions..." : assessment ? "Get new questions" : "Get questions"}</Button>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Written by a separate assessor that hasn't seen the lesson. Predictions are checked by running the code.</p>
          {!assessorWrites && <p className="mt-3 text-sm">This topic is proven entirely by its labs.</p>}
          {assessment?.items.map((_, index) => <Question key={`${assessment.id}-${index}`} assessment={assessment} index={index} onDone={done} />)}
        </section>

        <section className={section} id="sources" aria-labelledby="sources-title">
          <p className={label}>SOURCES{view.sourceCheckedAt ? ` · CHECKED ${view.sourceCheckedAt}` : ""}</p>
          <h2 className={heading} id="sources-title">Where this comes from</h2>
          {view.sources.length ? (
            <ul className="mt-4 space-y-3">
              {view.sources.filter((source) => source.url.startsWith("https://")).map((source) => (
                <li key={source.url} className="text-sm"><a className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={13} aria-hidden="true" /></a><p className="text-muted-foreground">{source.whyItMatters}</p></li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">Sources are gathered when the first lesson is written.</p>}
        </section>

        <section className="px-5 py-7 sm:px-8 lg:px-10" id="history" aria-labelledby="history-title">
          <p className={label}>HISTORY</p>
          <h2 className={heading} id="history-title">Every answer</h2>
          {view.attempts.length ? (
            <ol className="mt-4 divide-y divide-border border-y border-border text-sm">
              {view.attempts.map((attempt) => (
                <li key={attempt.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><p className="font-semibold">{kindWords[attempt.kind]} · {modeWords[attempt.mode]}</p><p className="text-muted-foreground">{attempt.feedback}</p></div>
                  <div className="flex shrink-0 items-center gap-2"><Tag value={attempt.voided ? "voided" : attempt.label}>{attempt.voided ? "Thrown out" : labelWords[attempt.label as keyof typeof labelWords]}</Tag><span className="text-muted-foreground">{formatDate(attempt.createdAt)}</span></div>
                </li>
              ))}
            </ol>
          ) : <p className="mt-3 text-sm text-muted-foreground">No answers yet.</p>}
        </section>
      </div>
    </WorkspaceShell>
  );
}
