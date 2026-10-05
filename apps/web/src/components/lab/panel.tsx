import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The lab's tight, bordered layout: a compact title bar per page, and content in bordered panels with a small header
// strip. Chosen on 2026-10-03 so the lab reads as a tool rather than a page. Shared by the home and the profile.

export function TitleBar({ kicker, title, stats, actions }: { kicker?: string; title: string; stats?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border pb-4">
      <div className="min-w-0">
        {kicker && <p className="text-xs text-muted-foreground">{kicker}</p>}
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">{title}</h1>
      </div>
      {(stats || actions) && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {stats && <dl className="flex flex-wrap gap-x-6 gap-y-2">{stats}</dl>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
    </header>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function Panel({ title, meta, id, children, className, bodyClassName }: {
  title: string; meta?: ReactNode; id?: string; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  const headingId = id ?? `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className={cn("min-w-0 rounded-lg border border-border", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold" id={headingId}>{title}</h2>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
