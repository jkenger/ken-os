"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BookmarkCheck, BookmarkPlus, ExternalLink, X } from "lucide-react";
import { TERM_MAX_LENGTH, type TermAnswer } from "@ken-os/domain";
import { Button } from "@/components/ui/button";

interface Pending { text: string; context: string; x: number; y: number }
type Lookup = { state: "loading" } | { state: "answer"; answer: TermAnswer; saved: boolean; saving?: boolean } | { state: "error"; message: string };

async function send<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "The lookup failed.");
  return result;
}

/** The sentence or paragraph around the selection, so the meaning fits how the word was used. */
function surroundingText(range: Range) {
  const block = (range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer as Element)
    ?.closest("p, li, td, h1, h2, h3, h4, pre, blockquote, .cm-content");
  return (block?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
}

/**
 * Select a word or short phrase on any Ken OS page, then press Explain (or E): a short meaning and one link from a
 * trusted site, with Save to Terms. The page never changes; the popover closes on Escape, scroll or a click elsewhere.
 */
export function TermLookup({ module, children }: { module: string; children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const readSelection = useCallback((): Pending | null => {
    const selection = window.getSelection();
    const text = selection?.toString().trim().replace(/\s+/g, " ") ?? "";
    if (!selection || !selection.rangeCount || !text || text.length > TERM_MAX_LENGTH || !root.current?.contains(selection.anchorNode)) return null;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    return { text, context: surroundingText(range), x: Math.min(rect.left + rect.width / 2, window.innerWidth - 24), y: rect.bottom };
  }, []);

  const close = useCallback(() => { setPending(null); setLookup(null); }, []);
  // "Engineering Lab · Event loop, tasks and microtasks": the module, then the page heading if there is one.
  const placeNow = useCallback(() => {
    const heading = root.current?.querySelector("h1")?.textContent?.trim();
    return heading ? `${module} · ${heading}`.slice(0, 160) : module;
  }, [module]);

  const explain = useCallback(async (target: Pending) => {
    setPending(target);
    setLookup({ state: "loading" });
    try {
      const result = await send<TermAnswer & { saved: boolean }>("/api/terms/lookup", { selection: target.text, context: target.context, place: placeNow() });
      setLookup({ state: "answer", answer: result, saved: result.saved });
    } catch (error) {
      setLookup({ state: "error", message: error instanceof Error ? error.message : "The lookup failed." });
    }
  }, [placeNow]);

  useEffect(() => {
    const onUp = (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-term-lookup]")) return;
      // The browser settles the selection just after mouseup.
      setTimeout(() => {
        const found = readSelection();
        setLookup(null);
        setPending(found);
      }, 0);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); return; }
      const typing = event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable=true], .cm-content");
      if (typing || event.metaKey || event.ctrlKey || event.altKey || event.key.toLowerCase() !== "e") return;
      const found = readSelection();
      if (found) { event.preventDefault(); void explain(found); }
    };
    const onScroll = () => close();
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [readSelection, explain, close]);

  async function save() {
    if (lookup?.state !== "answer") return;
    setLookup({ ...lookup, saving: true });
    try {
      const { answer } = lookup;
      await send("/api/terms", { term: answer.term, meaning: answer.meaning, sourceTitle: answer.source?.title ?? null, sourceUrl: answer.source?.url ?? null, foundIn: placeNow(), foundAt: `${window.location.pathname}${window.location.search}` });
      setLookup({ ...lookup, saved: true, saving: false });
    } catch (error) {
      setLookup({ state: "error", message: error instanceof Error ? error.message : "Could not save." });
    }
  }

  const left = pending ? Math.max(16, Math.min(pending.x - 170, window.innerWidth - 356)) : 0;
  const top = pending ? Math.min(pending.y + 8, window.innerHeight - 280) : 0;

  return (
    <div ref={root}>
      {children}
      {pending && !lookup && (
        <button type="button" data-term-lookup className="fixed z-40 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-lg"
          style={{ left: Math.max(16, pending.x - 44), top: pending.y + 8 }} onClick={() => void explain(pending)}>
          Explain <kbd className="rounded border border-primary-foreground/40 px-1 text-[10px]">E</kbd>
        </button>
      )}
      {pending && lookup && (
        <div data-term-lookup role="dialog" aria-label={`Meaning of ${pending.text}`} className="fixed z-40 w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-popover p-4 text-sm shadow-2xl" style={{ left, top }}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-base font-semibold tracking-[-0.02em]">{lookup.state === "answer" ? lookup.answer.term : pending.text}</p>
            <button type="button" className="rounded-md p-1 hover:bg-muted" aria-label="Close" onClick={close}><X size={15} /></button>
          </div>
          {lookup.state === "loading" && <p className="mt-2 text-muted-foreground" role="status">Looking it up on trusted sites. This takes a few seconds.</p>}
          {lookup.state === "error" && <p className="mt-2" role="alert">{lookup.message}</p>}
          {lookup.state === "answer" && (
            <>
              <p className="mt-2 leading-5">{lookup.answer.meaning}</p>
              {lookup.answer.source
                ? <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline" href={lookup.answer.source.url} target="_blank" rel="noopener noreferrer">{lookup.answer.source.title}<ExternalLink size={12} aria-hidden="true" /></a>
                : <p className="mt-3 text-xs text-muted-foreground">No trusted page found for this one.</p>}
              <div className="mt-4">
                <Button type="button" size="sm" variant={lookup.saved ? "outline" : "default"} disabled={lookup.saved || lookup.saving} onClick={() => void save()}>
                  {lookup.saved ? <><BookmarkCheck size={14} aria-hidden="true" />Saved to Terms</> : <><BookmarkPlus size={14} aria-hidden="true" />{lookup.saving ? "Saving..." : "Save to Terms"}</>}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
