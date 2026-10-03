"use client";

import { termKey, type TermAnswer } from "@ken-os/domain";

// Term lookups as background jobs in the browser. A lookup keeps running when the popover closes or you move to another
// Ken OS page; whoever is still listening gets the result, and nobody listening means a toast. The server also keeps
// each answer, so the same term is instant later, even after a reload.

export type LookupJob =
  | { key: string; text: string; state: "loading" }
  | { key: string; text: string; state: "done"; answer: TermAnswer; saved: boolean }
  | { key: string; text: string; state: "error"; message: string };

const jobs = new Map<string, LookupJob>();
const listeners = new Map<string, Set<(job: LookupJob) => void>>();

async function send<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "The lookup failed.");
  return result;
}

function update(job: LookupJob) {
  jobs.set(job.key, job);
  listeners.get(job.key)?.forEach((listener) => listener(job));
}

/** Listen to one lookup. Returns a function to stop listening; the lookup itself carries on. */
export function watchLookup(key: string, listener: (job: LookupJob) => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);
  const current = jobs.get(key);
  if (current) listener(current);
  return () => { listeners.get(key)?.delete(listener); };
}

export function hasListeners(key: string) {
  return (listeners.get(key)?.size ?? 0) > 0;
}

/**
 * Starts a lookup, or joins one already running for the same term. onFinishedUnwatched runs when the answer arrives
 * and no popover is watching any more, so the caller can show a toast instead.
 */
export function startLookup(input: { selection: string; context: string; place: string }, onFinishedUnwatched: (job: LookupJob) => void) {
  const key = termKey(input.selection);
  const existing = jobs.get(key);
  if (existing && existing.state !== "error") return key;
  update({ key, text: input.selection, state: "loading" });
  send<TermAnswer & { saved: boolean }>("/api/terms/lookup", input)
    .then((result) => {
      const { saved, ...answer } = result;
      update({ key, text: input.selection, state: "done", answer, saved });
    })
    .catch((error: unknown) => update({ key, text: input.selection, state: "error", message: error instanceof Error ? error.message : "The lookup failed." }))
    .finally(() => {
      const job = jobs.get(key)!;
      if (!hasListeners(key)) onFinishedUnwatched(job);
      // Finished answers stay for this visit, so reopening the same term is instant; errors can be retried.
      if (job.state === "error") jobs.delete(key);
    });
  return key;
}

export function markSaved(key: string) {
  const job = jobs.get(key);
  if (job?.state === "done") update({ ...job, saved: true });
}

export async function saveLookup(answer: TermAnswer, place: { foundIn: string; foundAt: string }) {
  await send("/api/terms", { term: answer.term, meaning: answer.meaning, sourceTitle: answer.source?.title ?? null, sourceUrl: answer.source?.url ?? null, ...place });
}
