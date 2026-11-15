import Link from "next/link";
import { cn } from "@/lib/utils";

// New vs Job board, drawn as a segmented pair with each tab's own count
// (docs/mockups/jobs-redesign-canvas/JB.dc.html) -- these are two routes, not one page's panels, so it's plain
// links styled like shadcn's Tabs rather than a Radix Tabs root with no real tab-panel switching to do.

const TAB_ITEM =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
const TAB_ITEM_ACTIVE = "bg-background text-foreground shadow-sm";

export function JobsTabs({
  active,
  newCount,
  boardCount,
}: {
  active: "new" | "board";
  newCount: number;
  boardCount: number;
}) {
  return (
    <div className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-muted p-1">
      <Link
        href="/jobs"
        aria-current={active === "new" ? "page" : undefined}
        className={cn(TAB_ITEM, active === "new" && TAB_ITEM_ACTIVE)}
      >
        New <span className="font-mono text-xs text-muted-foreground">{newCount}</span>
      </Link>
      <Link
        href="/jobs/board"
        aria-current={active === "board" ? "page" : undefined}
        className={cn(TAB_ITEM, active === "board" && TAB_ITEM_ACTIVE)}
      >
        Job board <span className="font-mono text-xs text-muted-foreground">{boardCount}</span>
      </Link>
    </div>
  );
}
