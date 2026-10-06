import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillTone = "solid" | "partial" | "gap" | "neutral" | "quiet";

const tones: Record<PillTone, string> = {
  solid: "bg-status-solid-surface text-status-solid",
  partial: "bg-status-partial-surface text-status-partial",
  gap: "bg-status-gap-surface text-status-gap",
  neutral: "bg-muted text-foreground",
  quiet: "border border-dashed border-input text-foreground",
};

/** A short status label. Colour adds meaning but never carries it alone: the words always say the same thing. */
export function Pill({ tone, icon, children, className }: { tone: PillTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold", tones[tone], className)}>
      {icon}{children}
    </span>
  );
}
