"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BookmarkCheck, BookmarkPlus, ExternalLink, LoaderCircle, X } from "lucide-react";
import { TERM_MAX_LENGTH, type TermAnswer } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { markSaved, saveLookup, startLookup, watchLookup, type LookupJob } from "@/features/terms/lookup-jobs";

interface Pending { text: string; context: string; x: number; y: number }

/** The sentence or paragraph around the selection, so the meaning fits how the word was used. */
function surroundingText(range: Range) {
  const block = (range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer as Element)
    ?.closest("p, li, td, h1, h2, h3, h4, pre, blockquote, .cm-content");
  return (block?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
}

function shorten(text: string, max = 180) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Select a word or short phrase on any Ken OS page, then press Explain (or E): a short meaning and one link from a
 * trusted site, with Save to Terms. Closing the popover doesn't cancel the lookup; when it finishes, a toast offers
 * the answer instead. The popover closes on Escape, scroll or a click elsewhere.
 */
export function TermLookup({ module, children }: { module: string; children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [watching, setWatching] = useState<string | null>(null);
  const [job, setJob] = useState<LookupJob | null>(null);
  const [saving, setSaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // The selection the Explain button is showing. E uses this rather than re-reading the page's selection at
  // key time, which can come back empty (for example when the selection touches a code block).
  const pendingRef = useRef<Pending | null>(null);
  pendingRef.current = pending;

  const readSelection = useCallback((): Pending | null => {
    const selection = window.getSelection();
    const text = selection?.toString().trim().replace(/\s+/g, " ") ?? "";
    if (!selection || !selection.rangeCount || !text || text.length > TERM_MAX_LENGTH || !root.current?.contains(selection.anchorNode)) return null;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    return { text, context: surroundingText(range), x: Math.min(rect.left + rect.width / 2, window.innerWidth - 24), y: rect.bottom };
  }, []);

  // "Engineering Lab · Event loop, tasks and microtasks": the module, then the page heading if there is one.
  const placeNow = useCallback(() => {
    const heading = root.current?.querySelector("h1")?.textContent?.trim();
    return heading ? `${module} · ${heading}`.slice(0, 160) : module;
  }, [module]);
  const here = useCallback(() => ({ foundIn: placeNow(), foundAt: `${window.location.pathname}${window.location.search}` }), [placeNow]);

  const close = useCallback(() => { setPending(null); setWatching(null); setJob(null); }, []);

  const saveFromToast = useCallback(async (answer: TermAnswer, key: string, place: { foundIn: string; foundAt: string }) => {
    try {
      await saveLookup(answer, place);
      markSaved(key);
      toast({ tone: "success", title: `Saved "${answer.term}" to Terms`, action: { label: "Open Terms", href: "/terms" } });
    } catch (error) {
      toast({ tone: "error", title: "Couldn't save. Try again", description: error instanceof Error ? error.message : undefined });
    }
  }, []);

  const explain = useCallback((target: Pending) => {
    setPending(target);
    const place = here();
    const key = startLookup({ selection: target.text, context: target.context, place: place.foundIn }, (finished) => {
      // Nobody is watching any more (the popover was closed or the page changed), so hand the answer over in a toast.
      if (finished.state === "done") {
        toast({
          tone: "success", title: `"${finished.answer.term}" explained`, description: shorten(finished.answer.meaning), duration: 15000,
          action: finished.saved ? { label: "Open Terms", href: "/terms" } : { label: "Save to Terms", onClick: () => saveFromToast(finished.answer, finished.key, place) },
        });
      } else if (finished.state === "error") {
        toast({ tone: "error", title: `Couldn't look up "${finished.text}". Try again`, description: finished.message });
      }
    });
    setWatching(key);
  }, [here, saveFromToast]);

  useEffect(() => {
    if (!watching) return;
    return watchLookup(watching, setJob);
  }, [watching]);

  useEffect(() => {
    const onUp = (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-term-lookup]")) return;
      // The browser settles the selection just after mouseup.
      setTimeout(() => {
        const found = readSelection();
        setWatching(null);
        setJob(null);
        setPending(found);
      }, 0);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); return; }
      if (event.metaKey || event.ctrlKey || event.altKey || event.key.toLowerCase() !== "e") return;
      const typing = event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable=true]");
      if (typing) return;
      const target = pendingRef.current ?? readSelection();
      if (target) { event.preventDefault(); explain(target); }
    };
    const onScroll = () => close();
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [readSelection, explain, close]);

  async function save() {
    if (job?.state !== "done") return;
    setSaving(true);
    try {
      await saveLookup(job.answer, here());
      markSaved(job.key);
      toast({ tone: "success", title: `Saved "${job.answer.term}" to Terms`, action: { label: "Open Terms", href: "/terms" } });
    } catch (error) {
      toast({ tone: "error", title: "Couldn't save. Try again", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  const open = Boolean(pending && watching);
  const left = pending ? Math.max(16, Math.min(pending.x - 170, window.innerWidth - 356)) : 0;
  const top = pending ? Math.min(pending.y + 8, window.innerHeight - 300) : 0;

  return (
    <div ref={root}>
      {children}
      {pending && !open && (
        <button type="button" data-term-lookup title="Explain this term (E)" aria-keyshortcuts="E"
          className="fixed z-40 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-lg transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:bg-primary/85 hover:shadow-xl focus-visible:ring-3 focus-visible:ring-ring/50"
          style={{ left: Math.max(16, pending.x - 44), top: pending.y + 8 }} onClick={() => explain(pending)}>
          Explain <kbd className="rounded border border-primary-foreground/40 px-1 text-[10px]">E</kbd>
        </button>
      )}
      {pending && open && (
        <div data-term-lookup role="dialog" aria-label={`Meaning of ${pending.text}`} className="fixed z-40 w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-popover p-4 text-sm shadow-2xl" style={{ left, top }}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-base font-semibold tracking-[-0.02em]">{job?.state === "done" ? job.answer.term : pending.text}</p>
            <button type="button" className="rounded-md p-1 hover:bg-muted" aria-label="Close" onClick={close}><X size={15} /></button>
          </div>
          {(!job || job.state === "loading") && (
            <div className="mt-2" role="status">
              <p className="flex items-center gap-2 font-semibold"><LoaderCircle size={15} className="motion-safe:animate-spin" aria-hidden="true" />Looking up…</p>
              <div className="mt-3 space-y-2" aria-hidden="true">
                <div className="h-2.5 w-full rounded bg-muted motion-safe:animate-pulse" />
                <div className="h-2.5 w-4/5 rounded bg-muted motion-safe:animate-pulse" />
              </div>
              <p className="mt-3 text-muted-foreground">~5 s · keeps going if you close this</p>
            </div>
          )}
          {job?.state === "error" && <p className="mt-2" role="alert">{job.message}</p>}
          {job?.state === "done" && (
            <>
              <p className="mt-2 leading-5">{job.answer.meaning}</p>
              {job.answer.source
                ? <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline" href={job.answer.source.url} target="_blank" rel="noopener noreferrer">{job.answer.source.title}<ExternalLink size={12} aria-hidden="true" /></a>
                : <p className="mt-3 text-xs text-muted-foreground">No trusted source found</p>}
              <div className="mt-4">
                <Button type="button" size="sm" variant={job.saved ? "outline" : "default"} disabled={job.saved || saving} onClick={() => void save()}>
                  {job.saved ? <><BookmarkCheck size={14} aria-hidden="true" />Saved to Terms</> : <><BookmarkPlus size={14} aria-hidden="true" />{saving ? "Saving…" : "Save to Terms"}</>}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
