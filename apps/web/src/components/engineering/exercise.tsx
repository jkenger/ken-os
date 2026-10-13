"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight } from "@tabler/icons-react";
import { scoreProbe, type LabDefinition, type Topic } from "@ken-os/domain";
import { CodeBlock, Markdown } from "@/components/lab/markdown";
import { post } from "@/components/lab/topic/client";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import type { ExercisePanel } from "@/features/engineering-lab/exercise-store";
import { buildLabScript, PGLITE_URL, type TestResult } from "@/features/engineering-lab/runner/harness";
import { PROBES } from "@/features/engineering-lab/runner/probes";
import { runInWorker } from "@/features/engineering-lab/runner/run-in-worker";
import { cn } from "@/lib/utils";
import { Dialog } from "./flow";
import { Notice, panel } from "./kit";

// A topic's code exercise: the task, the editor with autosave, Run tests and the results. Used on the topic page and in
// the roadmap's Try it in code panel. Claude's exercise versions are checked here, in the browser, before they show
// (docs/architecture/engineering-claude-connector.md, section 4).

/** Autosave waits this long after typing stops. */
const AUTOSAVE_MS = 2_000;
/** Two columns once the space holding the exercise is wide enough, whether that's a page or the Try it in code panel. */
const twoColumns =
  "grid grid-cols-1 gap-4.5 @2xl:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)] @2xl:gap-5 @4xl:grid-cols-[minmax(0,2.4fr)_minmax(15rem,1fr)] @4xl:gap-8";

function runnerNote(lab: LabDefinition) {
  if (lab.runner === "pglite") return "Postgres in the page";
  if (lab.runner === "probe") return "Real requests from the page";
  return `Browser · ${Math.round(lab.timeoutMs / 1000)} s limit`;
}

/** The README's first paragraph is the task line; the rest is detail. */
function splitReadme(readme: string) {
  const [first, ...rest] = readme.trim().split(/\n\s*\n/);
  return { task: first.replace(/\s+/g, " ").trim(), details: rest.join("\n\n").trim() };
}

function TestList({ results }: { results: TestResult[] }) {
  const passed = results.filter((item) => item.passed).length;
  return (
    <div role="status">
      <p className="text-sm font-semibold">
        {passed} / {results.length} tests passed
      </p>
      <ul className="mt-3 space-y-2.5 text-xs">
        {results.map((item) => (
          <li key={item.name} className="flex items-start gap-2.5">
            <Pill tone={item.passed ? "solid" : "gap"}>{item.passed ? "Pass" : "Fail"}</Pill>
            <span className="min-w-0">
              {item.name}
              {item.error && <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{item.error}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type RunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "error"; message: string }
  | { kind: "results"; results: TestResult[] };
type SaveState = "idle" | "saving" | "saved" | "failed";
const saveWords: Record<SaveState, string> = { idle: "", saving: "Saving…", saved: "Saved", failed: "Not saved" };

/** Runs code against tests in the isolated worker, the same way a learner run does. */
async function runTests(code: string, tests: string, options: { runner: string; setup: string; timeoutMs: number }) {
  const script = buildLabScript(code, tests, {
    origin: window.location.origin,
    pglite: options.runner === "pglite" ? { url: PGLITE_URL, setup: options.setup } : undefined,
  });
  return runInWorker(script, options.timeoutMs + 1000);
}

/**
 * Checks a new version from Claude once, quietly: its solution must pass every test and its starter must fail one.
 * The server judges the two runs and keeps the current version in use until a version checks out.
 */
/** `onChecked` runs after the result is stored; without it the page reloads its server data. */
export function useExerciseCheck(topicId: string, check: ExercisePanel["check"], onChecked?: () => void) {
  const router = useRouter();
  const started = useRef<string | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!check || started.current === check.id) return;
    started.current = check.id;
    setChecking(true);
    const asCheck = (outcome: Awaited<ReturnType<typeof runTests>>) =>
      outcome.type === "tests"
        ? { results: outcome.results }
        : { error: outcome.type === "output" ? "No tests ran" : outcome.message };
    void (async () => {
      try {
        const options = { runner: check.runner, setup: check.setup, timeoutMs: check.timeoutMs };
        const solution = asCheck(await runTests(check.solution, check.tests, options));
        const starter = asCheck(await runTests(check.starter, check.tests, options));
        await post(`/api/lab/topics/${topicId}/exercise/check`, { labId: check.id, solution, starter });
        if (onChecked) onChecked();
        else router.refresh();
      } catch {
        started.current = null;
      } finally {
        setChecking(false);
      }
    })();
  }, [check, topicId, router, onChecked]);
  return checking;
}

export function Exercise({
  topic,
  data,
  progress,
  onProve,
  onRefresh,
}: {
  topic: Pick<Topic, "id">;
  data: ExercisePanel;
  /** From the topic's progress: whether the exercise stands passed, and whether the solution was opened since. */
  progress: { exercisePassed: boolean; solutionOpened: boolean };
  /** Shown once the exercise passes. Omitted where there's no proof step. */
  onProve?: () => void;
  /** Reloads this exercise's data after a run, a check, a switch or the solution. Defaults to reloading the page. */
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const refresh = onRefresh ?? (() => router.refresh());
  const lab = data.exercise;
  const { task, details } = splitReadme(lab.readme);
  const [code, setCode] = useState(data.draft?.code ?? lab.starter);
  const [state, setState] = useState<RunState>({ kind: "idle" });
  const [saveState, setSaveState] = useState<SaveState>(data.draft ? "saved" : "idle");
  const [switching, setSwitching] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [predicted, setPredicted] = useState<Record<string, string>>({});
  const autosave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const checking = useExerciseCheck(topic.id, data.check, onRefresh);
  const probe = lab.runner === "probe" ? lab.probe! : null;
  const passed = progress.exercisePassed;

  // Code saved only in this browser before autosave existed comes back once, then autosaves.
  useEffect(() => {
    if (data.draft || probe) return;
    try {
      const saved = window.localStorage.getItem(`ken-os-lab:${lab.id}`);
      if (saved && saved !== lab.starter) update(saved);
    } catch {
      /* storage unavailable */
    }
  }, []); // Once, on open.
  useEffect(() => () => clearTimeout(autosave.current), []);

  async function saveDraft(value: string) {
    setSaveState("saving");
    try {
      await post(`/api/lab/topics/${topic.id}/draft`, { labId: lab.id, code: value });
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  }
  const update = (value: string) => {
    setCode(value);
    clearTimeout(autosave.current);
    autosave.current = setTimeout(() => void saveDraft(value), AUTOSAVE_MS);
  };

  async function switchVersion(labId: string) {
    setSwitching(true);
    try {
      await post(`/api/lab/topics/${topic.id}/exercise/switch`, { labId });
      refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "Couldn't switch. Try again",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSwitching(false);
    }
  }

  async function save(results: TestResult[], submitted: string) {
    const ok = results.filter((item) => item.passed).length;
    const output = results
      .map((item) => `${item.passed ? "PASS" : "FAIL"} ${item.name}${item.error ? `: ${item.error}` : ""}`)
      .join("\n");
    await post(`/api/lab/topics/${topic.id}/exercise`, {
      labId: lab.id,
      code: submitted,
      passed: ok,
      failed: results.length - ok,
      output,
      tests: results,
    });
    refresh();
  }

  async function run() {
    setState({ kind: "running" });
    try {
      if (probe) {
        const check = PROBES[probe.id];
        if (!check) throw new Error("Check unavailable");
        const score = scoreProbe(probe.questions, predicted, await check());
        setState({ kind: "results", results: score.results });
        await save(score.results, JSON.stringify(predicted));
        return;
      }
      const outcome = await runTests(code, lab.tests, lab);
      if (outcome.type !== "tests") {
        setState({ kind: "error", message: outcome.type === "output" ? "No tests ran" : outcome.message });
        return;
      }
      setState({ kind: "results", results: outcome.results });
      await save(outcome.results, code);
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Couldn't run tests. Try again" });
    }
  }

  async function showSolution(close: () => void) {
    try {
      const result = await post<{ solution: string }>(`/api/lab/topics/${topic.id}/solution`, { labId: lab.id });
      setSolution(result.solution);
      update(lab.starter);
      setState({ kind: "idle" });
      close();
      refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "Couldn't show the solution. Try again",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const results = state.kind === "results" ? state.results : null;
  const allPassed = Boolean(results && results.length && results.every((item) => item.passed));
  return (
    <div className="@container">
      <div className={twoColumns}>
        <section className={cn(panel, "min-w-0 p-5 @2xl:p-7.5")}>
          {data.newer && (
            <Notice>
              <p className="font-semibold">New exercise from Claude</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Version {data.newer.version} · starts a fresh attempt
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={switching}
                onClick={() => void switchVersion(data.newer!.id)}
              >
                {switching ? "Switching…" : "Switch"}
              </Button>
            </Notice>
          )}
          {data.invalid && (
            <Notice tone="error">
              <p className="font-semibold">This exercise doesn&apos;t check out</p>
              <p className="mt-0.5 text-xs">
                Version {data.invalid.version} · {data.invalid.problem}
              </p>
            </Notice>
          )}
          {checking && (
            <p role="status" className="mb-4 text-xs text-muted-foreground">
              Checking new exercise from Claude…
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {lab.source === "claude" ? `From Claude · version ${lab.version}` : probe ? lab.id : `${lab.id}.js`}
            </span>
            <span>{runnerNote(lab)}</span>
          </div>
          <div className="mt-3 text-sm leading-relaxed font-semibold [&_p]:text-foreground">
            <Markdown text={task} />
          </div>
          {details && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold">Details</summary>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <Markdown text={details} />
              </div>
            </details>
          )}
          {probe ? (
            <ol className="mt-5 space-y-4">
              {probe.questions.map((question, index) => (
                <li key={question.id}>
                  <fieldset>
                    <legend className="text-sm font-semibold">
                      {index + 1}. {question.prompt}
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {question.options.map((option) => (
                        <Button
                          key={option}
                          type="button"
                          size="sm"
                          variant={predicted[question.id] === option ? "default" : "outline"}
                          aria-pressed={predicted[question.id] === option}
                          onClick={() => setPredicted((current) => ({ ...current, [question.id]: option }))}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5">
              <CodeEditor value={code} onChange={update} label={`Your code for ${lab.title}`} minHeight={260} />
              <p
                role="status"
                className={cn(
                  "mt-1.5 min-h-4 text-right text-xs text-muted-foreground",
                  saveState === "failed" && "text-destructive",
                )}
              >
                {saveWords[saveState]}
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={
                state.kind === "running" ||
                Boolean(probe && !probe.questions.every((question) => predicted[question.id]))
              }
              onClick={() => void run()}
            >
              {state.kind === "running" ? "Running…" : "Run tests"}
            </Button>
            {!probe && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  update(lab.starter);
                  setState({ kind: "idle" });
                }}
              >
                Reset code
              </Button>
            )}
            {lab.hint && (
              <Dialog title="Hint" trigger="Hint">
                <Markdown text={lab.hint} />
              </Dialog>
            )}
            {lab.hasSolution && !solution && (
              <Dialog title="Show solution?" trigger="Show solution">
                {(close) => (
                  <>
                    <p>The exercise must pass again from the starter before Prove opens</p>
                    <Button type="button" className="mt-5" onClick={() => void showSolution(close)}>
                      Show solution
                    </Button>
                  </>
                )}
              </Dialog>
            )}
          </div>
          {solution && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold">Solution</p>
              <CodeBlock code={solution} label={`Solution for ${lab.title}`} />
            </div>
          )}
        </section>
        <aside className={cn(panel, "h-fit p-6")}>
          <h3 className="text-sm font-semibold">Results</h3>
          <div className="mt-3 text-xs text-muted-foreground">
            {state.kind === "idle" && <p>Run your code to see results</p>}
            {state.kind === "running" && <p>Running…</p>}
            {state.kind === "error" && (
              <p role="alert" className="text-destructive">
                {state.message}
              </p>
            )}
            {results && <TestList results={results} />}
          </div>
          {progress.solutionOpened && (
            <p className="mt-4 text-xs text-muted-foreground">Solution opened · pass again from the starter</p>
          )}
          {onProve && (allPassed || passed) && (
            <Button type="button" className="mt-5" onClick={onProve}>
              Continue to proof
              <IconArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
