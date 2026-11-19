import type { CSSProperties } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Match and ATS compatibility figure on a Jobs card footer (docs/architecture/job-card-actions.md, "New
// component: ScoreRing"): a 40px rainbow ring, same visual language as the Tailor CV/Write cover letter
// buttons' .rainbow-ring, since both come from the same skill-matching work. `label` doubles as which figure
// this is: "ATS" renders as a percentage ("85%"), anything else (just "Match" today) as a bare number.

export function ScoreRing({ value, label, tooltip }: { value: number; label: string; tooltip: string }) {
  const figure = label === "ATS" ? `${value}%` : `${value}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5" role="img" aria-label={tooltip}>
          <span
            className="score-ring grid size-10 shrink-0 place-items-center rounded-full bg-transparent"
            style={{ "--score-ring-value": value } as CSSProperties}
            aria-hidden="true"
          >
            <b className="relative font-mono text-xs font-semibold tracking-tight tabular-nums">{figure}</b>
          </span>
          <span className="text-xs font-medium text-muted-foreground" aria-hidden="true">
            {label}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
