"use client";

import { useState, type ReactNode } from "react";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { panel } from "./kit";
import { Button } from "@/components/ui/button";
import { Dialog as DialogRoot, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// The task flows (intake, assessment, practice, direction): a form or question panel beside a notes column, a session
// heading with a progress track, success views and dialogs.

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

export const questionPanel = cn(panel, "p-6 md:p-7");

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
