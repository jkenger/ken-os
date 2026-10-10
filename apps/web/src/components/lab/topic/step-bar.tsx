"use client";

import { Button } from "@/components/ui/button";
import { IconCheck } from "@tabler/icons-react";
import type { StepId, StepState } from "@/features/engineering-lab/steps";
import { cn } from "@/lib/utils";

/**
 * Where you are in a topic, as the 2026-10-06 prototype draws it: numbered steps on one line, the open one underlined.
 * Every step is clickable; the suggested one is marked, nothing is locked. Each step's state is in its tooltip and
 * read to screen readers.
 */
export function StepBar({ steps, active, suggested, onSelect }: { steps: StepState[]; active: StepId; suggested: StepId; onSelect: (id: StepId) => void }) {
  return (
    <nav aria-label="Topic steps" className="border-b border-border bg-background">
      <ol className="flex gap-5 overflow-x-auto md:gap-7">
        {steps.map((step, index) => {
          const isActive = step.id === active;
          const detail = step.id === suggested && !isActive && !step.done ? "Suggested next" : step.detail;
          return (
            <li key={step.id} className="shrink-0">
              <Button variant="ghost" type="button" onClick={() => onSelect(step.id)} aria-current={isActive ? "step" : undefined} title={detail}
                className={cn("-mb-px h-auto gap-2.5 rounded-none border-0 border-b-2 px-1 pb-4 pt-3 text-sm font-normal hover:bg-transparent md:text-sm", isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <span className={cn("grid size-6 place-items-center rounded-full border text-xs", step.done ? "border-primary bg-muted text-foreground" : isActive ? "border-primary" : "border-input")}>
                  {step.done ? <IconCheck size={13} aria-hidden="true" /> : index + 1}
                </span>
                {step.label}
                {step.id === suggested && !isActive && !step.done && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                <span className="sr-only">: {detail}</span>
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
