"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import { parsePredictedLines, type PublicItem } from "@ken-os/domain";
import { CodeBlock, Markdown } from "@/components/lab/markdown";
import { realOutput } from "@/components/lab/topic/client";
import { cn } from "@/lib/utils";
import { eyebrow, Notice, panel } from "./kit";
import { Button } from "@/components/ui/button";
import { Dialog as DialogRoot, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// The task flows of the selected 2026-10-06 prototype (intro, assessment, practice, direction): a form or question
// panel beside a notes column, a session heading with a progress track, success views and dialogs. Sizes are the
// prototype's; colours are the Ken OS tokens.

/** Spacing and size for a form control under its label; the control itself is the shadcn primitive. */
export const field = "mt-2.5 py-3";
export const fieldLabel = "block text-sm font-semibold";

/** Task panel on the left, notes on the right; one column on a phone. */
export function FlowLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-1 grid grid-cols-1 gap-4 md:mx-3.5 md:grid-cols-[2fr_1fr] md:gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(230px,1fr)] lg:gap-8", className)}>{children}</div>;
}

export function FlowNotes({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="p-2.5 text-sm leading-relaxed text-muted-foreground md:py-3.5">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </aside>
  );
}

export function NoteList({ items }: { items: string[] }) {
  return <ul className="mt-2 list-disc pl-5 leading-loose">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

/** Save and exit on the left, where you are in the middle, how it works on the right. */
export function SessionHeading({ left, middle, right }: { left: ReactNode; middle: ReactNode; right?: ReactNode }) {
  return (
    <div className="mx-1 mb-4 flex items-center justify-between gap-3.5 text-xs text-muted-foreground md:mx-3.5 md:mb-5 md:text-sm">
      {left}<span className="text-center">{middle}</span>{right ?? <span />}
    </div>
  );
}

export function ProgressTrack({ done, total }: { done: number; total: number }) {
  return (
    <div className="mx-1 mb-7 h-1 bg-secondary md:mx-3.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Progress">
      <span className="block h-full bg-primary transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
    </div>
  );
}

export function SuccessView({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="max-w-2xl py-5">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-foreground"><IconCheck size={28} aria-hidden="true" /></span>
      <h2 className="mb-3 mt-4 text-2xl font-bold tracking-tight md:text-2xl">{title}</h2>
      {children && <div className="mb-4 max-w-xl text-sm leading-normal text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}

/** A modal dialog on shadcn's Dialog: Escape and the backdrop close it, focus is trapped inside and returns to the opener. */
export function Dialog({ title, trigger, children }: { title: string; trigger: ReactNode; children: ReactNode | ((close: () => void) => ReactNode) }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="link" type="button">{trigger}</Button></DialogTrigger>
      <DialogContent aria-describedby={undefined} className="max-h-[85vh] w-full max-w-[calc(100%-1.75rem)] gap-0 overflow-auto p-5 sm:max-w-2xl md:p-7">
        <DialogTitle className="mb-3.5 pr-8 text-2xl font-bold leading-tight tracking-tight md:text-2xl">{title}</DialogTitle>
        <div className="text-sm leading-relaxed text-muted-foreground [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground">
          {typeof children === "function" ? children(close) : children}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

/** Confidence before submitting, 1 to 5. Tracked apart from the grade. */
export function Confidence({ value, onChange, disabled }: { value: number | null; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <fieldset className="my-6" disabled={disabled}>
      <legend className="mb-2.5 text-sm font-semibold">How sure are you?</legend>
      <ToggleGroup type="single" spacing={2.5} variant="outline" aria-label="How sure are you?" disabled={disabled} className="w-3xs max-w-full"
        value={value ? String(value) : ""} onValueChange={(next) => { if (next) onChange(Number(next)); }}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <ToggleGroupItem key={rating} value={String(rating)} className="h-10 w-11 border-input bg-card text-sm font-normal hover:bg-accent data-[state=on]:border-primary data-[state=on]:bg-secondary data-[state=on]:font-semibold">
            {rating}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <small className="mt-2 flex w-3xs max-w-full justify-between text-xs text-muted-foreground"><span>1 · Guessing</span><span>5 · Very sure</span></small>
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

export const questionPanel = cn(panel, "p-6 md:p-7");

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
      <h2 className="my-3 text-2xl font-bold tracking-tight md:text-2xl">{title}</h2>
      <div className="text-sm leading-relaxed md:text-base [&_p]:text-foreground"><Markdown text={item.prompt} /></div>
      {item.code && <div className="mt-4"><CodeBlock code={item.code} label="Question code" /></div>}
      {!locked && (
        <>
          <Label className={cn(fieldLabel, "mt-6")}>
            {predict ? "Your answer · one line per log" : "Your answer"}
            <Textarea className={cn(field, "min-h-28 resize-y leading-relaxed", predict && "font-mono")} spellCheck={!predict} value={answer} disabled={done}
              placeholder={predict ? "What prints, in order" : "What you think happens and why"} onChange={(event) => setAnswer(event.target.value)} />
          </Label>
          {predict && (
            <Label className={cn(fieldLabel, "mt-5")}>
              Why <span className="font-normal text-muted-foreground">· optional, not graded</span>
              <Textarea className={cn(field, "min-h-20 resize-y leading-relaxed")} value={why} disabled={done} onChange={(event) => setWhy(event.target.value)} />
            </Label>
          )}
          <Confidence value={rating} onChange={setRating} disabled={done} />
        </>
      )}
      {problem && <Notice tone="error"><strong className="font-semibold">Couldn&apos;t save</strong><p className="mt-1">{problem}. Your answer is still here</p></Notice>}
      {done ? after : (
        <Button type="button" disabled={busy || !answer.trim() || !rating} onClick={() => void submit()}>
          {busy ? (predict ? "Running…" : "Grading…") : submitLabel}<IconArrowRight size={18} aria-hidden="true" />
        </Button>
      )}
    </section>
  );
}

/** The block under a submitted answer: a badge, a heading, a line or two, and the next action. */
export function Feedback({ badge, title, children, action }: { badge?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 border-t border-border pt-6" role="status">
      {badge}
      <h3 className="my-3 text-base font-semibold">{title}</h3>
      {children && <div className="mb-4 text-sm leading-normal text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}
