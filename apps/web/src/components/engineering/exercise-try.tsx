"use client";

import { useState } from "react";
import type { LabDefinition } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { buildTryScript, PGLITE_URL } from "@/features/engineering-lab/runner/harness";
import { runInWorker, type RunOutcome } from "@/features/engineering-lab/runner/run-in-worker";
import { ConsoleOutput, Value } from "./exercise-results";

// Try it: the learner calls their own code with their own input, in the same isolated worker as the tests, without
// running the tests. The tests' helpers are loaded so a call can use them.

type TryState = { kind: "idle" } | { kind: "running" } | { kind: "done"; outcome: RunOutcome };

export function TryIt({
  code,
  lab,
  input,
  onInput,
}: {
  code: string;
  lab: Pick<LabDefinition, "tests" | "runner" | "setup" | "timeoutMs" | "title">;
  input: string;
  onInput: (value: string) => void;
}) {
  const [state, setState] = useState<TryState>({ kind: "idle" });

  async function run() {
    setState({ kind: "running" });
    const script = buildTryScript(code, lab.tests, input, {
      origin: window.location.origin,
      pglite: lab.runner === "pglite" ? { url: PGLITE_URL, setup: lab.setup } : undefined,
    });
    setState({ kind: "done", outcome: await runInWorker(script, lab.timeoutMs + 1000) });
  }

  const outcome = state.kind === "done" ? state.outcome : null;
  return (
    <section className="mt-6 border-t pt-5" aria-labelledby="try-it">
      <h3 id="try-it" className="text-sm font-semibold">
        Try it
      </h3>
      <p className="mt-0.5 mb-2.5 text-xs text-muted-foreground">Call your code with any input, without the tests</p>
      <CodeEditor value={input} onChange={onInput} label={`Try a call for ${lab.title}`} minHeight={64} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2.5"
        disabled={state.kind === "running" || !input.trim()}
        onClick={() => void run()}
      >
        {state.kind === "running" ? "Running…" : "Run call"}
      </Button>
      {outcome && (
        <div role="status" className="mt-1 text-xs text-muted-foreground">
          {outcome.type === "try" ? (
            <>
              <p className="mt-2.5 text-xs font-semibold text-foreground">{outcome.ok ? "Returned" : "Threw"}</p>
              <div className={outcome.ok ? undefined : "text-destructive"}>
                <Value text={outcome.value} label={outcome.ok ? "Returned" : "Threw"} />
              </div>
              {outcome.console.length > 0 && <ConsoleOutput lines={outcome.console} />}
            </>
          ) : (
            <p role="alert" className="mt-2.5 text-destructive">
              {"message" in outcome ? outcome.message : "Couldn't run the call. Try again"}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
