"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconArrowRight, IconCheck, IconX } from "@tabler/icons-react";
import { parsePredictedLines, type PublicItem } from "@ken-os/domain";
import { CodeBlock, Markdown } from "@/components/lab/markdown";
import { realOutput } from "@/components/lab/topic/client";
import { cn } from "@/lib/utils";
import { eyebrow, Notice, panel, primaryButton, textButton } from "./kit";

// The task flows of the selected 2026-10-06 prototype (intro, assessment, practice, direction): a form or question
// panel beside a notes column, a session heading with a progress track, success views and dialogs. Sizes are the
// prototype's; colours are the Ken OS tokens.

export const field = "mt-2.5 block w-full rounded-[5px] border border-input bg-card px-3 py-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
export const fieldLabel = "block text-[13px] font-semibold";

/** Task panel on the left, notes on the right; one column on a phone. */
export function FlowLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-[5px] grid grid-cols-1 gap-[18px] md:mx-3.5 md:grid-cols-[2fr_1fr] md:gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(230px,1fr)] lg:gap-8", className)}>{children}</div>;
}

export function FlowNotes({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="p-2.5 text-sm leading-[1.65] text-muted-foreground md:py-[15px]">
      <h3 className="text-[17px] font-semibold text-foreground">{title}</h3>
      {children}
    </aside>
  );
}

export function NoteList({ items }: { items: string[] }) {
  return <ul className="mt-2 list-disc pl-[19px] leading-[2.1]">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

/** Save and exit on the left, where you are in the middle, how it works on the right. */
export function SessionHeading({ left, middle, right }: { left: ReactNode; middle: ReactNode; right?: ReactNode }) {
  return (
    <div className="mx-[5px] mb-[18px] flex items-center justify-between gap-3.5 text-[11px] text-muted-foreground md:mx-3.5 md:mb-5 md:text-sm">
      {left}<span className="text-center">{middle}</span>{right ?? <span />}
    </div>
  );
}

export function ProgressTrack({ done, total }: { done: number; total: number }) {
  return (
    <div className="mx-[5px] mb-7 h-1 bg-secondary md:mx-3.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Progress">
      <span className="block h-full bg-rail-lit transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
    </div>
  );
}

export function SuccessView({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="max-w-[680px] py-5">
      <span className="grid size-[50px] place-items-center rounded-full bg-status-solid-surface text-status-solid"><IconCheck size={28} aria-hidden="true" /></span>
      <h2 className="mb-[13px] mt-[17px] text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">{title}</h2>
      {children && <div className="mb-[18px] max-w-[600px] text-sm leading-[1.55] text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}

/** A modal dialog: Escape and the backdrop close it, focus is trapped inside and returns to the opener. */
export function Dialog({ title, trigger, children, triggerClassName }: { title: string; trigger: ReactNode; children: ReactNode | ((close: () => void) => ReactNode); triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !box.current) return;
      const focusable = box.current.querySelectorAll<HTMLElement>("a, button:not([disabled]), input, textarea, select, summary");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    const trigger = opener.current;
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); trigger?.focus(); };
  }, [open]);

  return (
    <>
      <button ref={opener} type="button" className={triggerClassName ?? textButton} onClick={() => setOpen(true)}>{trigger}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-3.5 backdrop-blur-[3px] md:p-6" onMouseDown={close}>
          <section ref={box} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[85vh] w-full max-w-[650px] overflow-auto rounded-[9px] border border-border bg-card p-[22px] shadow-[0_16px_70px_rgba(41,40,36,0.2)] md:p-[27px]">
            <div className="mb-3.5 flex items-center justify-between gap-4">
              <h2 className="text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">{title}</h2>
              <button type="button" aria-label="Close dialog" data-autofocus onClick={close} className="rounded-md p-1 hover:bg-muted"><IconX size={22} aria-hidden="true" /></button>
            </div>
            <div className="text-sm leading-[1.6] text-muted-foreground [&_h3]:mb-2 [&_h3]:mt-[23px] [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-foreground">
              {typeof children === "function" ? children(close) : children}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

/** Confidence before submitting, 1 to 5. Tracked apart from the grade. */
export function Confidence({ value, onChange, disabled }: { value: number | null; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <fieldset className="my-[25px]" disabled={disabled}>
      <legend className="mb-[11px] text-[13px] font-semibold">How sure are you?</legend>
      <div className="flex w-[270px] max-w-full gap-2.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button key={rating} type="button" aria-pressed={value === rating} onClick={() => onChange(rating)}
            className={cn("h-10 w-[45px] rounded-[5px] border bg-card text-sm disabled:opacity-60", value === rating ? "border-primary bg-secondary font-semibold" : "border-input hover:bg-accent")}>
            {rating}
          </button>
        ))}
      </div>
      <small className="mt-2 flex w-[270px] max-w-full justify-between text-[11px] text-muted-foreground"><span>1 · Guessing</span><span>5 · Very sure</span></small>
    </fieldset>
  );
}

export interface QuestionPayload {
  selfRating: number;
  text?: string;
  lines?: string[];
  why?: string;
  actualOutput?: string[];
}

export const questionPanel = cn(panel, "p-[23px] md:p-[30px]");

/**
 * One question as the prototype lays it out: eyebrow, title, prompt, code, the answer box, confidence, then submit.
 * A prediction gets the printed lines (checked by running the code after you submit) and an optional, ungraded why.
 * After submitting, `after` replaces the button; the answer stays visible and locked.
 */
export function QuestionPanel({ kicker, title, item, submitLabel = "Submit answer", onSubmit, after, locked = false, draftKey }: {
  kicker: string; title: string; item: PublicItem; submitLabel?: string;
  /** Keeps an unsent answer in this browser across a refresh, until it's submitted. A convenience, never evidence. */
  draftKey?: string;
  onSubmit: (payload: QuestionPayload) => Promise<void>;
  /** Shown once the answer is in: feedback, the next action. */
  after?: ReactNode;
  locked?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [why, setWhy] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [sent, setSent] = useState(false);
  const done = locked || sent;
  const predict = item.mode === "predict";
  const storageKey = draftKey ? `ken-draft:${draftKey}` : null;

  useEffect(() => {
    if (!storageKey || locked) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as { answer?: string; why?: string } | null;
      if (saved?.answer) setAnswer(saved.answer);
      if (saved?.why) setWhy(saved.why);
    } catch { /* storage unavailable: start empty */ }
  }, [storageKey, locked]);

  useEffect(() => {
    if (!storageKey || done) return;
    try {
      if (answer || why) window.localStorage.setItem(storageKey, JSON.stringify({ answer, why }));
      else window.localStorage.removeItem(storageKey);
    } catch { /* storage unavailable: nothing to keep */ }
  }, [storageKey, done, answer, why]);

  async function submit() {
    if (!rating) return;
    setBusy(true); setProblem("");
    try {
      await onSubmit(predict
        ? { selfRating: rating, lines: parsePredictedLines(answer), ...(why.trim() ? { why: why.trim() } : {}), actualOutput: await realOutput(item.code ?? "") }
        : { selfRating: rating, text: answer });
      setSent(true);
      if (storageKey) { try { window.localStorage.removeItem(storageKey); } catch { /* nothing to clear */ } }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={questionPanel}>
      <div className={eyebrow}>{kicker}</div>
      <h2 className="my-3 text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">{title}</h2>
      <div className="text-[15px] leading-[1.6] md:text-base [&_p]:text-foreground"><Markdown text={item.prompt} /></div>
      {item.code && <div className="mt-4"><CodeBlock code={item.code} label="Question code" /></div>}
      {!locked && (
        <>
          <label className={cn(fieldLabel, "mt-[25px]")}>
            {predict ? "Your answer · one line per log" : "Your answer"}
            <textarea className={cn(field, "min-h-[120px] resize-y leading-[1.6]", predict && "font-mono")} spellCheck={!predict} value={answer} disabled={done}
              placeholder={predict ? "What prints, in order" : "What you think happens and why"} onChange={(event) => setAnswer(event.target.value)} />
          </label>
          {predict && (
            <label className={cn(fieldLabel, "mt-5")}>
              Why <span className="font-normal text-muted-foreground">· optional, not graded</span>
              <textarea className={cn(field, "min-h-[80px] resize-y leading-[1.6]")} value={why} disabled={done} onChange={(event) => setWhy(event.target.value)} />
            </label>
          )}
          <Confidence value={rating} onChange={setRating} disabled={done} />
        </>
      )}
      {problem && <Notice tone="error"><strong className="font-semibold">Couldn&apos;t save</strong><p className="mt-1">{problem}. Your answer is still here</p></Notice>}
      {done ? after : (
        <button type="button" className={primaryButton} disabled={busy || !answer.trim() || !rating} onClick={() => void submit()}>
          {busy ? (predict ? "Running…" : "Grading…") : submitLabel}<IconArrowRight size={18} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/** The block under a submitted answer: a badge, a heading, a line or two, and the next action. */
export function Feedback({ badge, title, children, action }: { badge?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-[25px] border-t border-border pt-[23px]" role="status">
      {badge}
      <h3 className="my-3 text-[17px] font-semibold">{title}</h3>
      {children && <div className="mb-[18px] text-sm leading-[1.55] text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}
