import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PillTone = "solid" | "partial" | "gap" | "neutral" | "quiet";

const variants = { solid: "solid", partial: "partial", gap: "gap", neutral: "neutral", quiet: "dashed" } as const;

/** A short status label on shadcn's Badge. Colour adds meaning but never carries it alone: the words always say the same thing. */
export function Pill({ tone, icon, children, className }: { tone: PillTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Badge variant={variants[tone]} className={cn("h-[26px] gap-1.5 px-2.5 font-semibold", className)}>
      {icon}{children}
    </Badge>
  );
}
