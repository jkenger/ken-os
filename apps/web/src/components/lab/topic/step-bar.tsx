"use client";

import { Check } from "lucide-react";
import type { StepId, StepState } from "@/features/engineering-lab/steps";
import { cn } from "@/lib/utils";

/** Where you are in a topic. Every step is clickable; the suggested one is marked, nothing is locked. */
export function StepBar({ steps, active, suggested, onSelect }: { steps: StepState[]; active: StepId; suggested: StepId; onSelect: (id: StepId) => void }) {
  return (
    <nav aria-label="Topic steps" className="border-b border-border bg-background">
      <ol className="flex overflow-x-auto">
        {steps.map((step, index) => {
          const isActive = step.id === active;
          return (
            <li key={step.id} className="min-w-[84px] flex-1 sm:min-w-[136px]">
              <button type="button" onClick={() => onSelect(step.id)} aria-current={isActive ? "step" : undefined}
                className={cn("flex h-full w-full items-start gap-2 border-b-2 px-2.5 py-3 sm:gap-3 sm:px-4 text-left transition-colors hover:bg-muted/60", isActive ? "border-foreground" : "border-transparent")}>
                <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  step.done ? "bg-status-solid-surface text-status-solid" : isActive ? "bg-primary text-primary-foreground" : "border border-input text-foreground")}>
                  {step.done ? <Check size={13} aria-label="Done" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{step.label}</span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">{step.id === suggested && !isActive && !step.done ? "Suggested next" : step.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
