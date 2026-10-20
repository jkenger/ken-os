"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { draftKey, isEmptyDraft, type Draft } from "@/features/design-studio/drafts";

/** "Saving…" from the first change until the save lands, then "Draft saved", or "Couldn't save · Retry" (D5). */
export type SaveStatus = "idle" | "saving" | "saved" | "failed";

/** Waits this long after the last change before saving, so typing a value saves once. */
const SAVE_AFTER = 1000;

async function send(method: "PUT" | "DELETE", body: unknown) {
  const response = await fetch("/api/studio/drafts", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Drafts request failed: ${response.status}`);
}

/** The owner's drafts: changed at once in the page, so every node re-renders with no round trip, and saved to the
 *  server a second after the last change. Discard and Reset save at once. */
export function useDrafts(initial: Draft[]) {
  const [drafts, setDrafts] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const pending = useRef(new Map<string, Draft>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    timer.current = null;
    const batch = [...pending.current.entries()];
    if (!batch.length) return;
    setStatus("saving");
    try {
      for (const [key, draft] of batch) {
        await send("PUT", draft);
        // A change made while this one was in flight stays pending for the next save.
        if (pending.current.get(key) === draft) pending.current.delete(key);
      }
      setStatus(pending.current.size ? "saving" : "saved");
    } catch {
      setStatus("failed");
    }
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_AFTER);
  }, [flush]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** Sets a token's or component's draft; an empty change removes it. */
  const change = useCallback(
    (draft: Draft) => {
      const key = draftKey(draft);
      setDrafts((current) => {
        const rest = current.filter((item) => draftKey(item) !== key);
        return isEmptyDraft(draft) ? rest : [...rest, draft];
      });
      pending.current.set(key, draft);
      setStatus("saving");
      schedule();
    },
    [schedule],
  );

  /** Removes drafts now, as Reset, Discard and Discard all do. */
  const discard = useCallback(async (keys: Pick<Draft, "kind" | "target">[] | "all") => {
    const removed = keys === "all" ? null : new Set(keys.map(draftKey));
    setDrafts((current) => (removed ? current.filter((item) => !removed.has(draftKey(item))) : []));
    for (const key of [...pending.current.keys()]) if (!removed || removed.has(key)) pending.current.delete(key);
    try {
      if (keys === "all") await send("DELETE", { all: true });
      else for (const key of keys) await send("DELETE", { kind: key.kind, target: key.target });
      setStatus(pending.current.size ? "saving" : "idle");
    } catch {
      setStatus("failed");
    }
  }, []);

  return { drafts, status, change, discard, retry: flush };
}
