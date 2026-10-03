import { buildPredictScript } from "@/features/engineering-lab/runner/harness";
import { runInWorker } from "@/features/engineering-lab/runner/run-in-worker";

export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

/** What a snippet really prints, from the learner's browser. Used as the ground truth for predictions. */
export async function realOutput(code: string) {
  const outcome = await runInWorker(buildPredictScript(code), 3000);
  if (outcome.type === "output") return outcome.logs;
  throw new Error(outcome.type === "timeout" || outcome.type === "error" ? `The snippet could not run: ${outcome.message}` : "The snippet could not run.");
}

export const textarea = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
