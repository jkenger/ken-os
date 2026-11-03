"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckStatusIcon } from "@/features/jobs/check-status-icon";
import { describeCheckStatus, type CheckStatus } from "@/features/jobs/format-check-status";
import { cn } from "@/lib/utils";

/** The condensed form of the Overview once postings exist (docs/mockups/jobs-redesign-canvas/Status-strip.dc.html)
 *  -- the same "is this working?" facts as one line above the results bar, with a toggle back to the full Setup
 *  status detail instead of a separate page that stops mattering once there's data. */
export function StatusStrip({
  effectiveRoles,
  checkStatus,
  newCount,
  filteredOutCount,
  expanded,
  onToggle,
}: {
  effectiveRoles: string[];
  checkStatus: CheckStatus | null;
  newCount: number;
  filteredOutCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const check = describeCheckStatus(checkStatus);
  const checkLabel =
    check.kind === "failing"
      ? `Last check failed ${check.agoLabel}`
      : check.kind === "never"
        ? "Never checked"
        : `Checked ${check.agoLabel}`;

  const shownRoles = effectiveRoles.slice(0, 2);
  const overflow = effectiveRoles.length - shownRoles.length;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-card px-3 py-2 text-xs">
      <span className={cn("flex items-center gap-1.5", check.kind === "failing" && "font-medium text-destructive")}>
        <CheckStatusIcon kind={check.kind} className="size-3.5" />
        {checkLabel}
      </span>
      <span className="h-3.5 w-px bg-border" aria-hidden="true" />
      <span className="text-muted-foreground">
        Searching: {shownRoles.length > 0 ? shownRoles.join(", ") : "None yet"}
        {overflow > 0 && ` +${overflow}`}
      </span>
      <span className="h-3.5 w-px bg-border" aria-hidden="true" />
      <span className="text-muted-foreground">
        {newCount} new ·{" "}
        <Link href="/jobs/filtered-out" className="underline">
          {filteredOutCount} filtered out
        </Link>
      </span>
      <span className="flex-1" />
      <Button
        type="button"
        variant="link"
        size="xs"
        className="h-auto p-0 text-muted-foreground"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        {expanded ? "Hide setup status" : "Setup status"}
      </Button>
    </div>
  );
}
