"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BookmarkCheck, BookmarkPlus, Check, CircleDashed, ExternalLink, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill, type PillTone as Tone } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { lookup, savedTerms, type MockTerm } from "./mock-data";

// The status colours, Pill and CodeEditor are now shared Ken OS parts; the mockups reuse them.
export { Pill, type PillTone as Tone } from "@/components/ui/pill";
export { CodeEditor } from "@/components/ui/code-editor";

export const eyebrow = "text-[11px] font-bold tracking-[0.15em] text-muted-foreground";

// ---------- Step bar ----------

export type StepId = "learn" | "practice" | "lab" | "check";
export interface Step { id: StepId; label: string; detail: string; state: "done" | "current" | "todo" }

/** Where you are in a topic. Every step is clickable; the suggested next one is marked, nothing is locked. */
export function StepBar({ steps, active, suggested, onSelect }: { steps: Step[]; active: StepId; suggested: StepId; onSelect: (id: StepId) => void }) {
  return (
    <nav aria-label="Topic steps" className="border-b border-border">
      <ol className="flex overflow-x-auto">
        {steps.map((step, index) => {
          const isActive = step.id === active;
          return (
            <li key={step.id} className="min-w-[132px] flex-1">
              <Button variant="ghost" type="button" onClick={() => onSelect(step.id)} aria-current={isActive ? "step" : undefined}
                className={cn("h-full w-full items-start justify-start gap-3 whitespace-normal rounded-none border-0 border-b-2 px-4 py-3 text-left font-normal hover:bg-muted/60", isActive ? "border-foreground" : "border-transparent")}>
                <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  step.state === "done" ? "bg-status-solid-surface text-status-solid" : isActive ? "bg-primary text-primary-foreground" : "border border-input text-foreground")}>
                  {step.state === "done" ? <Check size={13} aria-label="Done" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{step.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{step.id === suggested && !isActive ? "Suggested next" : step.detail}</span>
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------- Prediction diff ----------

/** Longest common subsequence, so a missing line shows as missing rather than shifting every line after it. */
function matchLines(actual: string[], answer: string[]) {
  const table = Array.from({ length: actual.length + 1 }, () => Array(answer.length + 1).fill(0) as number[]);
  for (let i = actual.length - 1; i >= 0; i--) for (let j = answer.length - 1; j >= 0; j--) {
    table[i][j] = actual[i] === answer[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const rows: { text: string; kind: "match" | "missing" | "extra" }[] = [];
  let i = 0; let j = 0;
  while (i < actual.length || j < answer.length) {
    if (i < actual.length && j < answer.length && actual[i] === answer[j]) { rows.push({ text: actual[i], kind: "match" }); i++; j++; }
    else if (j < answer.length && (i >= actual.length || table[i][j + 1] >= table[i + 1][j])) { rows.push({ text: answer[j], kind: "extra" }); j++; }
    else { rows.push({ text: actual[i], kind: "missing" }); i++; }
  }
  return rows;
}

const diffWords = {
  missing: { moved: "Actually prints here", alone: "Missing from yours" },
  extra: { moved: "You had it here", alone: "Never printed" },
};

export function PredictionDiff({ actual, answer }: { actual: string[]; answer: string[] }) {
  const rows = matchLines(actual, answer);
  // A line that is both missing and extra was printed, just somewhere else: say "moved", not "never printed".
  const missingTexts = new Set(rows.filter((row) => row.kind === "missing").map((row) => row.text));
  const extraTexts = new Set(rows.filter((row) => row.kind === "extra").map((row) => row.text));
  const moved = (row: { text: string; kind: string }) => row.kind === "missing" ? extraTexts.has(row.text) : missingTexts.has(row.text);
  const missing = rows.filter((row) => row.kind === "missing" && !moved(row)).length;
  const extra = rows.filter((row) => row.kind === "extra" && !moved(row)).length;
  const movedCount = rows.filter((row) => row.kind === "missing" && moved(row)).length;
  const summary = [movedCount && `${movedCount} in the wrong place`, missing && `${missing} missing`, extra && `${extra} that never printed`].filter(Boolean).join(", ");
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">Real output against yours</p>
      <ol className="mt-2 overflow-hidden rounded-lg bg-muted font-mono text-[13px] leading-6">
        {rows.map((row, index) => (
          <li key={index} className={cn("flex items-center gap-3 px-3", row.kind === "missing" && "bg-status-gap-surface", row.kind === "extra" && "bg-status-partial-surface")}>
            <span className="w-4 shrink-0" aria-hidden="true">{row.kind === "match" ? <Check size={13} className="text-status-solid" /> : row.kind === "missing" ? <Minus size={13} /> : <Plus size={13} />}</span>
            <span className="flex-1">{row.text}</span>
            {row.kind !== "match" && <span className="font-sans text-xs font-semibold">{diffWords[row.kind][moved(row) ? "moved" : "alone"]}</span>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-muted-foreground">{summary ? `Lines: ${summary}.` : "Every line, in order."}</p>
    </div>
  );
}

// ---------- Rubric checklist ----------

const rubricLook = {
  covered: { tone: "solid" as Tone, text: "Covered" },
  partly: { tone: "partial" as Tone, text: "Partly" },
  missed: { tone: "gap" as Tone, text: "Missed" },
};

export function RubricChecklist({ items }: { items: { point: string; result: keyof typeof rubricLook }[] }) {
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">What the grader looked for</p>
      <ul className="mt-2 divide-y divide-border rounded-lg bg-muted text-sm">
        {items.map((item) => (
          <li key={item.point} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <span className="leading-5">{item.point}</span>
            <Pill tone={rubricLook[item.result].tone}>{rubricLook[item.result].text}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Term lookup (Ken OS-wide; mocked here) ----------

interface TermsContext { terms: MockTerm[]; save: (term: MockTerm) => void; place: string }
const Terms = createContext<TermsContext>({ terms: savedTerms, save: () => undefined, place: "" });
export const useTerms = () => useContext(Terms);

interface Pending { text: string; x: number; y: number; open: boolean }

/**
 * Select text anywhere inside, then press Explain (or E). The real build calls the AI with the surrounding sentence
 * and returns one link from the Researcher's trusted sites; this mock uses canned answers.
 */
export function TermLookup({ place, children }: { place: string; children: ReactNode }) {
  const [terms, setTerms] = useState<MockTerm[]>(savedTerms);
  const [pending, setPending] = useState<Pending | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const readSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!selection || !text || text.length > 60 || !root.current?.contains(selection.anchorNode)) return null;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    return { text, x: Math.min(rect.left + rect.width / 2, window.innerWidth - 24), y: rect.bottom };
  }, []);

  useEffect(() => {
    const onUp = (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-lookup]")) return;
      // Wait a tick: the browser updates the selection after mouseup.
      setTimeout(() => { const found = readSelection(); setPending(found ? { ...found, open: false } : null); }, 0);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPending(null); return; }
      const typing = event.target instanceof Element && event.target.closest("input, textarea, .cm-content");
      if (!typing && event.key.toLowerCase() === "e" && !event.metaKey && !event.ctrlKey) {
        const found = readSelection();
        if (found) { event.preventDefault(); setPending({ ...found, open: true }); }
      }
    };
    const onScroll = () => setPending(null);
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
  }, [readSelection]);

  const save = useCallback((term: MockTerm) => setTerms((current) => current.some((item) => item.term === term.term) ? current : [term, ...current]), []);
  const answer = pending ? lookup(pending.text) : null;
  const saved = answer ? terms.some((item) => item.term.toLowerCase() === answer.term.toLowerCase()) : false;
  const left = pending ? Math.max(16, Math.min(pending.x - 160, window.innerWidth - 336)) : 0;

  return (
    <Terms.Provider value={{ terms, save, place }}>
      <div ref={root}>{children}</div>
      {pending && !pending.open && (
        <Button type="button" size="sm" data-lookup className="fixed z-40 h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-lg"
          style={{ left: Math.max(16, pending.x - 44), top: pending.y + 8 }} onClick={() => setPending({ ...pending, open: true })}>
          Explain <kbd className="rounded border border-primary-foreground/40 px-1 text-[10px]">E</kbd>
        </Button>
      )}
      {pending?.open && answer && (
        <div data-lookup role="dialog" aria-label={`Meaning of ${answer.term}`} className="fixed z-40 w-[320px] max-w-[calc(100vw-32px)] rounded-xl bg-popover p-4 text-sm shadow-2xl ring-1 ring-foreground/5"
          style={{ left, top: Math.min(pending.y + 8, window.innerHeight - 260) }}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-base font-semibold tracking-[-0.02em]">{answer.term}</p>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Close" onClick={() => setPending(null)}><X size={15} /></Button>
          </div>
          <p className="mt-2 leading-5">{answer.meaning}</p>
          <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline" href={answer.source.url} target="_blank" rel="noopener noreferrer">{answer.source.title}<ExternalLink size={12} aria-hidden="true" /></a>
          <div className="mt-4 flex gap-2">
            <Button type="button" size="sm" variant={saved ? "outline" : "default"} disabled={saved}
              onClick={() => save({ ...answer, foundIn: place, savedAt: "Today" })}>
              {saved ? <><BookmarkCheck size={14} aria-hidden="true" />Saved to Terms</> : <><BookmarkPlus size={14} aria-hidden="true" />Save to Terms</>}
            </Button>
          </div>
        </div>
      )}
    </Terms.Provider>
  );
}

export function UntestedIcon() {
  return <CircleDashed size={12} aria-hidden="true" />;
}
