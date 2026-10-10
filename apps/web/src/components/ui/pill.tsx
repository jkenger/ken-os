import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export type PillTone = "solid" | "partial" | "gap" | "neutral" | "quiet";

// shadcn has no success or warning colour, so status uses the default Badge variants.
const variants = { solid: "default", partial: "secondary", gap: "destructive", neutral: "outline", quiet: "outline" } as const;

/** A short status label on shadcn's Badge. The icon and the words carry the meaning, never colour alone. */
export function Pill({ tone, icon, children, className }: { tone: PillTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Badge variant={variants[tone]} className={className}>
      {icon}{children}
    </Badge>
  );
}
