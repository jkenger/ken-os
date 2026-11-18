import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A bordered, centered placeholder for "nothing here yet" -- the Company tab's own empty state
 *  (docs/mockups/Jobs redesign.html, "Job detail / Company tab, empty"), reused wherever a value is missing
 *  instead of a bare text fallback that reads as broken rather than intentional. `className` overrides size and
 *  spacing for a smaller context (tailwind-merge-aware `cn`, so a passed p-0/gap-0/rounded-md wins over the
 *  defaults below). */
export function EmptyState({
  title,
  message,
  action,
  className,
  icon,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
  /** Shown above the title/message, e.g. the Cover letter tab's Mail/CircleAlert (docs/mockups/
   *  cover-letter-canvas/). */
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-3 rounded-xl border p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {icon}
      <div className="grid gap-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        <p>{message}</p>
      </div>
      {action}
    </div>
  );
}
