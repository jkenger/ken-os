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

/** What still has to reach the server for one draft: its latest value, or its removal. */
type Pending = { draft: Draft } | { remove: Pick<Draft, "kind" | "target"> };

/** The owner's drafts: changed at once in the page, so every node re-renders with no round trip, and saved to the
 *  server a second after the last change. Discard and Reset save at once. Saves and removals go out one at a time in
 *  the order they were made, and only the latest one for each draft is sent, so a removal is never undone by an
 *  older save. Whatever fails stays queued for Retry. */
export function useDrafts(initial: Draft[]) {
  const [drafts, setDrafts] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const pending = useRef(new Map<string, Pending>());
  /** Discard all, waiting to be sent before anything queued after it. */
  const clearAll = useRef(false);
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    timer.current = null;
    if (running.current) return;
    running.current = true;
    setStatus("saving");
    // Only saves show "Draft saved"; a discard alone leaves the footer quiet, as before it was sent.
    let saved = false;
    try {
      // A change made while a request is out waits for its own debounce, so typing still saves once.
      while ((clearAll.current || pending.current.size) && !timer.current) {
        if (clearAll.current) {
          await send("DELETE", { all: true });
          clearAll.current = false;
          continue;
        }
        const [key, next] = pending.current.entries().next().value!;
        if ("draft" in next) {
          await send("PUT", next.draft);
          saved = true;
        } else await send("DELETE", next.remove);
        // A change made while this one was in flight stays queued and goes out next.
        if (pending.current.get(key) === next) pending.current.delete(key);
      }
      setStatus(timer.current ? "saving" : saved ? "saved" : "idle");
    } catch {
      setStatus("failed");
    } finally {
      running.current = false;
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
      pending.current.delete(key);
      pending.current.set(key, { draft });
      setStatus("saving");
      schedule();
    },
    [schedule],
  );

  /** Removes drafts now, as Reset, Discard and Discard all do. */
  const discard = useCallback(
    async (keys: Pick<Draft, "kind" | "target">[] | "all") => {
      if (keys === "all") {
        setDrafts([]);
        pending.current.clear();
        clearAll.current = true;
      } else {
        const removed = new Set(keys.map(draftKey));
        setDrafts((current) => current.filter((item) => !removed.has(draftKey(item))));
        for (const key of keys) {
          // Deleted and set again, so the removal goes out after anything queued before it.
          pending.current.delete(draftKey(key));
          pending.current.set(draftKey(key), { remove: { kind: key.kind, target: key.target } });
        }
      }
      if (timer.current) clearTimeout(timer.current);
      await flush();
    },
    [flush],
  );

  return { drafts, status, change, discard, retry: flush };
}
