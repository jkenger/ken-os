import { CircleCheck, CircleDashed, Clock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckStatusView } from "./format-check-status";

/** One icon per "Last checked" state (docs/mockups/jobs-redesign-canvas/Last-checked.dc.html) -- shared between
 *  the Overview's Setup status row and the condensed status strip, so the two never drift apart. */
export function CheckStatusIcon({ kind, className }: { kind: CheckStatusView["kind"]; className?: string }) {
  if (kind === "working") return <CircleCheck className={className} aria-hidden="true" />;
  if (kind === "failing") return <TriangleAlert className={cn(className, "text-destructive")} aria-hidden="true" />;
  if (kind === "late") return <Clock className={cn(className, "text-muted-foreground")} aria-hidden="true" />;
  return <CircleDashed className={cn(className, "text-muted-foreground")} aria-hidden="true" />;
}
