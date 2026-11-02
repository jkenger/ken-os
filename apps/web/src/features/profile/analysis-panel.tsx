"use client";

import { useState } from "react";
import { IconCheck, IconCircleCheck, IconCircleDot, IconHistory, IconSparkles } from "@tabler/icons-react";
import {
  ANALYSIS_STANDARD,
  analysisTargets,
  isAnalysisStale,
  type AnalysisSection,
  type ProfileDetails,
} from "@ken-os/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { panel } from "@/components/surfaces";
import { cn } from "@/lib/utils";
import { shortDate } from "./dates";

// The analyzer on Profile: under each analyzed section, the recommendation to use and a Report that opens the
// section's checks against the standard. Stale once the section's lines change; Used once they match the recommendation.

type Status = "used" | "stale" | "fresh";

function statusOf(section: AnalysisSection, details: ProfileDetails): Status {
  const now = analysisTargets(details).find((target) => target.id === section.id);
  if (section.recommendation && now && JSON.stringify(now.lines) === JSON.stringify(section.recommendation))
    return "used";
  return isAnalysisStale(section, details) ? "stale" : "fresh";
}

const toImprove = (section: AnalysisSection) => section.checks.filter((check) => !check.pass).length;

/** The section's checks, one row each with the standard's wording and what to change. */
function ReportDialog({
  section,
  analyzedAt,
  open,
  onOpenChange,
  onUse,
  canUse,
}: {
  section: AnalysisSection;
  analyzedAt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: () => void;
  canUse: boolean;
}) {
  const improve = toImprove(section);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{section.place}</DialogTitle>
          <DialogDescription>
            {improve ? `${improve} of ${section.checks.length} to improve` : "Meets the standard"}, analyzed{" "}
            {shortDate(analyzedAt)}
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y text-sm">
          {section.checks.map((check) => {
            const Icon = check.pass ? IconCircleCheck : IconCircleDot;
            return (
              <li key={check.id} className="flex gap-3 py-2.5">
                <Icon
                  size={18}
                  aria-hidden="true"
                  className={cn("mt-px shrink-0", check.pass ? "text-topic-learned" : "text-topic-active")}
                />
                <div className="min-w-0">
                  <p className="font-medium">
                    {check.label}
                    <span className="sr-only">{check.pass ? ", passes" : ", to improve"}</span>
                  </p>
                  {!check.pass && check.note && <p className="text-muted-foreground">{check.note}</p>}
                </div>
              </li>
            );
          })}
        </ul>
        {section.tip && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="font-medium">Add yourself: </span>
            {section.tip}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canUse && (
            <Button
              type="button"
              onClick={() => {
                onUse();
                onOpenChange(false);
              }}
            >
              <IconCheck data-icon="inline-start" aria-hidden="true" />
              Use recommendation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The analyzer's result for one summary, role or project, shown under it in read and edit mode alike. */
export function AnalysisCard({
  section,
  analyzedAt,
  details,
  onUse,
  showPlace,
}: {
  section: AnalysisSection;
  analyzedAt: string;
  details: ProfileDetails;
  onUse: (section: AnalysisSection) => void;
  /** Name the role or project, when a panel holds more than one. */
  showPlace: boolean;
}) {
  const [open, setOpen] = useState(false);
  const status = statusOf(section, details);
  const improve = toImprove(section);
  const canUse = section.recommendation !== null && status !== "used";
  return (
    <div className="rounded-md border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <IconSparkles size={16} aria-hidden="true" className="text-muted-foreground" />
        <p className="font-medium">{section.recommendation ? "Recommended" : "Analysis"}</p>
        {showPlace && <span className="truncate text-muted-foreground">{section.place}</span>}
        {status === "used" && (
          <Badge variant="outline">
            <IconCheck data-icon="inline-start" aria-hidden="true" />
            Used
          </Badge>
        )}
        {status === "stale" && (
          <Badge variant="outline" className="text-muted-foreground">
            <IconHistory data-icon="inline-start" aria-hidden="true" />
            Changed since analysis
          </Badge>
        )}
        {improve > 0 && (
          <Badge variant="outline" className="ml-auto text-muted-foreground">
            {improve} to improve
          </Badge>
        )}
        <Button
          type="button"
          variant="link"
          size="sm"
          className={cn("h-auto px-0", !improve && "ml-auto")}
          onClick={() => setOpen(true)}
        >
          Report
        </Button>
      </div>
      {section.recommendation ? (
        section.kind === "summary" ? (
          <p className="mt-2 leading-relaxed">{section.recommendation[0]}</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {section.recommendation.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        )
      ) : (
        <p className="mt-2 text-muted-foreground">
          {improve ? "No safe rewrite. Open the report for what to change" : "Meets the standard"}
        </p>
      )}
      {section.tip && <p className="mt-2 text-muted-foreground">Add yourself: {section.tip}</p>}
      {canUse && (
        <Button type="button" size="sm" className="mt-3" onClick={() => onUse(section)}>
          <IconCheck data-icon="inline-start" aria-hidden="true" />
          Use it
        </Button>
      )}
      <ReportDialog
        section={section}
        analyzedAt={analyzedAt}
        open={open}
        onOpenChange={setOpen}
        onUse={() => onUse(section)}
        canUse={canUse}
      />
    </div>
  );
}

/** Every check in the standard with how many analyzed sections pass it, in the standard's order. */
function tally(sections: AnalysisSection[]) {
  const order = [...ANALYSIS_STANDARD.summary, ...ANALYSIS_STANDARD.bullets];
  const rows = new Map<string, { label: string; pass: number; total: number }>();
  for (const { label } of order) if (!rows.has(label)) rows.set(label, { label, pass: 0, total: 0 });
  for (const section of sections)
    for (const check of section.checks) {
      const row = rows.get(check.label);
      if (!row) continue;
      row.total += 1;
      if (check.pass) row.pass += 1;
    }
  return [...rows.values()];
}

/** The analyzer's own panel: what it reads and why, the standard as a checklist with how many sections pass each
 *  check, and the Analyze button. */
export function WritingPanel({
  sections,
  analyzedAt,
  analyzing,
  onAnalyze,
}: {
  sections: AnalysisSection[] | null;
  analyzedAt: string | null;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  const meeting = sections?.filter((section) => toImprove(section) === 0).length ?? 0;
  const rows = tally(sections ?? []);
  return (
    <section aria-labelledby="writing-title" className={cn(panel, "overflow-hidden")}>
      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <IconSparkles size={18} aria-hidden="true" className="text-sidebar-primary" />
            <h2 id="writing-title" className="font-heading text-base font-semibold">
              Writing
            </h2>
          </div>
          <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
            The analyzer reads your summary and the bullets of every role and project, and holds each one to the same
            standard a recruiter skims for: a strong opening verb, results instead of duties, real numbers, and lines
            short enough to read in a glance. Anything that falls short gets a rewrite built only from what you have
            already written, ready to use or change.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          {sections && analyzedAt ? (
            <p className="flex items-baseline gap-1.5 md:justify-end">
              <span className="font-heading text-2xl leading-none font-semibold tabular-nums">
                {meeting} of {sections.length}
              </span>
              <span className="text-muted-foreground">meet the standard</span>
            </p>
          ) : (
            <p className="text-muted-foreground">Not analyzed yet</p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onAnalyze} disabled={analyzing}>
            <IconSparkles data-icon="inline-start" aria-hidden="true" />
            {analyzing ? "Analyzing…" : sections ? "Analyze again" : "Analyze"}
          </Button>
          {sections && analyzedAt && !analyzing && (
            <p className="text-xs text-muted-foreground">Last run {shortDate(analyzedAt)}</p>
          )}
        </div>
      </div>
      <ul className="grid border-t bg-muted/30 sm:grid-cols-2" aria-label="The standard">
        {rows.map((row) => {
          const done = row.total > 0 && row.pass === row.total;
          const Icon = done ? IconCircleCheck : IconCircleDot;
          return (
            <li key={row.label} className="flex items-center gap-2.5 border-b px-5 py-2.5 sm:odd:border-r">
              <Icon
                size={16}
                aria-hidden="true"
                className={cn(
                  "shrink-0",
                  !row.total ? "text-muted-foreground" : done ? "text-topic-learned" : "text-topic-active",
                )}
              />
              <span className="min-w-0 flex-1">{row.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {row.total ? `${row.pass} of ${row.total}` : "-"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
