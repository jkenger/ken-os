"use client";

import type { WorkerMessage } from "./harness";

export type RunOutcome = WorkerMessage | { type: "timeout"; message: string };

/**
 * Runs a harness script in a Web Worker started from a data: URL. The opaque origin means the code cannot
 * reach Ken OS with the owner's session, and terminate() stops infinite loops.
 */
export function runInWorker(script: string, timeoutMs: number): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const worker = new Worker(`data:text/javascript;charset=utf-8,${encodeURIComponent(script)}`);
    const finish = (outcome: RunOutcome) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(outcome);
    };
    const timer = setTimeout(
      () =>
        finish({
          type: "timeout",
          message: `Stopped after ${timeoutMs} ms. Look for an infinite loop or a promise that never settles.`,
        }),
      timeoutMs,
    );
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data?.type === "error") return finish(event.data);
      if (event.data?.type === "tests" || event.data?.type === "output" || event.data?.type === "try")
        finish(event.data);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish({ type: "error", message: event.message || "The code could not run.", logs: [] });
    };
  });
}
