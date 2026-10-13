"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { SavedTerm } from "./store";

// Saved terms in the browser, loaded once per visit, so every page can underline them and show the saved meaning on
// hover. Saving or removing a term reloads the list, so the marks follow straight away.

export type MarkedTerm = Pick<SavedTerm, "id" | "term" | "meaning" | "source">;

const none: MarkedTerm[] = [];
let terms: MarkedTerm[] = none;
let loading: Promise<void> | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Fetches the saved terms again. A failure keeps the last list; marks are a help, not something to warn about. */
export function reloadSavedTerms() {
  loading = fetch("/api/terms", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return;
      const body = (await response.json()) as { terms?: MarkedTerm[] };
      terms = body.terms ?? none;
      loaded = true;
      listeners.forEach((listener) => listener());
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** The saved terms, loading them the first time any page asks. */
export function useSavedTerms() {
  useEffect(() => {
    if (!loaded && !loading) void reloadSavedTerms();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => terms,
    () => none,
  );
}
