"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { scoreProbe, type LabDefinition } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { buildLabScript, PGLITE_URL, type TestResult } from "@/features/engineering-lab/runner/harness";
import { PROBES } from "@/features/engineering-lab/runner/probes";
import { runInWorker } from "@/features/engineering-lab/runner/run-in-worker";
import { cn } from "@/lib/utils";
import { CodeBlock, Markdown } from "../markdown";
import { label, modeWords } from "../words";
import { Tag } from "./answers";
import { post } from "./client";

function Results({ results, passWord, failWord }: { results: TestResult[]; passWord: string; failWord: string }) {
  const passed = results.filter((item) => item.passed).length;
  return (
    <div className="mt-4 rounded-lg bg-muted p-4" role="status">
      <div className="flex flex-wrap items-center gap-3">
        <Tag value={passed === results.length ? "solid" : passed ? "partial" : "gap"}>{passed} of {results.length} passing</Tag>
        <p className="text-sm">{passed === results.length ? "All tests pass" : passed ? `${results.length - passed} failing` : "All failing"}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {results.map((item) => <li key={item.name} className="flex gap-2"><Tag value={item.passed ? "solid" : "gap"}>{item.passed ? passWord : failWord}</Tag><span>{item.name}{item.error && <span className="block text-muted-foreground">{item.error}</span>}</span></li>)}
      </ul>
    </div>
  );
}

/** A code lab: instructions beside the editor on desktop, two tabs on a phone. Both panels stay mounted, so switching tabs keeps your code. */
export function Lab({ lab, revealed, passed, onDone }: { lab: LabDefinition; revealed: boolean; passed: boolean; onDone: (message: string) => void }) {
  const storageKey = `ken-os-lab:${lab.id}`;
  const [code, setCode] = useState(lab.starter);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [tab, setTab] = useState<"brief" | "code">("brief");

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
      const passedCount = outcome.results.filter((item) => item.passed).length;
      const output = outcome.results.map((item) => `${item.passed ? "PASS" : "FAIL"} ${item.name}${item.error ? `: ${item.error}` : ""}`).join("\n");
      const saved = await post<{ solutionSeen: boolean }>("/api/lab/attempts", { type: "lab", labId: lab.id, code, run: { passed: passedCount, failed: outcome.results.length - passedCount, output } });
      onDone(saved.solutionSeen ? "Saved · doesn't count as proof (solution opened)" : "Saved");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't run tests. Try again");
    } finally {
      setBusy(false);
    }
  }

  async function showSolution() {
    if (!revealed && !window.confirm("Show solution? Passing won't count as proof.")) return;
    try { setSolution((await post<{ solution: string }>(`/api/lab/labs/${lab.id}/solution`)).solution); onDone(""); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Couldn't load the solution. Try again"); }
  }

  return (
    <article className="rounded-xl bg-card shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-[-0.03em]">{lab.title}</h3>
          <p className={cn(label, "mt-1")}>{lab.modes.map((mode) => modeWords[mode]).join(" · ").toUpperCase()}</p>
        </div>
        {passed && <Tag value="solid">Passed</Tag>}
      </div>
      <Tabs value={tab} onValueChange={(next) => setTab(next as typeof tab)} className="border-b border-border px-3 lg:hidden">
        <TabsList variant="line" aria-label={`${lab.title} panels`} className="gap-1 group-data-horizontal/tabs:h-auto">
          {(["brief", "code"] as const).map((id) => (
            <TabsTrigger key={id} value={id} className="flex-none px-3 py-2.5 font-semibold">{id === "brief" ? "Instructions" : "Code"}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className={cn("space-y-4 p-5 lg:border-r lg:border-border", tab !== "brief" && "hidden lg:block")}>
          <div className="lg:sticky lg:top-28">
            <Markdown text={lab.readme} />
            <details className="group mt-4"><DisclosureSummary className="text-sm font-semibold">See the tests</DisclosureSummary><div className="mt-2"><CodeBlock code={lab.tests} label={`Tests for ${lab.title}`} /></div></details>
            <Button type="button" variant="outline" size="sm" className="mt-4 lg:hidden" onClick={() => setTab("code")}>Back to code</Button>
          </div>
        </div>
        <div className={cn("min-w-0 p-5", tab !== "code" && "hidden lg:block")}>
          <p className="mb-2 text-sm font-semibold">Your code</p>
          <CodeEditor value={code} onChange={update} label={`Your code for ${lab.title}`} minHeight={260} />
          <p className="mt-1.5 text-xs text-muted-foreground">Tab indents · Esc then Tab to leave</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void run()} disabled={busy}><Play size={15} aria-hidden="true" />{busy ? "Running…" : "Run tests"}</Button>
            <Button type="button" variant="outline" onClick={() => { update(lab.starter); setResults(null); }}><RotateCcw size={15} aria-hidden="true" />Reset to starter</Button>
            <Button type="button" variant="ghost" onClick={() => void showSolution()}>Show solution</Button>
          </div>
          {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
          {results && <Results results={results} passWord="Pass" failWord="Fail" />}
          {solution && <div className="mt-4"><p className="mb-2 text-sm font-semibold">Solution</p><CodeBlock code={solution} label={`Solution for ${lab.title}`} /></div>}
        </div>
      </div>
    </article>
  );
}

export function ProbeLab({ lab, passed, onDone }: { lab: LabDefinition; passed: boolean; onDone: (message: string) => void }) {
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
      if (!probe) throw new Error("Check unavailable");
      const observed = await probe();
      const score = scoreProbe(questions, predicted, observed);
      setResults(score.results);
      const output = score.results.map((item) => `${item.passed ? "PASS" : "FAIL"} ${item.name}${item.error ? `: ${item.error}` : ""}`).join("\n");
      await post("/api/lab/attempts", { type: "lab", labId: lab.id, code: JSON.stringify(predicted), run: { passed: score.passed, failed: score.failed, output } });
      onDone("Saved");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't run the check. Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl bg-card shadow-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-[-0.03em]">{lab.title}</h3>
          <p className={cn(label, "mt-1")}>Predict, then check</p>
        </div>
        {passed && <Tag value="solid">Passed</Tag>}
      </div>
      <div className="mt-3 max-w-[720px]"><Markdown text={lab.readme} /></div>
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
      <Button type="button" className="mt-5" disabled={busy || !ready} onClick={() => void check()}><Play size={15} aria-hidden="true" />{busy ? "Running…" : ready ? "Run check" : "Answer all first"}</Button>
      {problem && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
      {results && <Results results={results} passWord="Right" failWord="Wrong" />}
    </article>
  );
}
