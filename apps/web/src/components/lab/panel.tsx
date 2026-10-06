import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Engineering's page heading and bordered panels, in the selected 2026-10-06 prototype's sizes ("light Evidence
// Workbench"): an eyebrow, a large title, facts on the right, and white panels with a small header strip.
// Colours come from the Ken OS tokens. Shared by practice, the assessment, Direction and evidence.

export function TitleBar({ kicker = "Engineering", title, stats, actions }: { kicker?: string; title: string; stats?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-[25px] flex flex-wrap items-start justify-between gap-x-8 gap-y-4 md:mb-8">
      <div className="min-w-0">
        <p className="mb-[9px] text-[11px] font-medium uppercase tracking-[0.06em] text-[#586579]">{kicker}</p>
        <h1 className="text-[28px] font-[750] leading-[1.25] tracking-[-0.8px] md:text-[30px] xl:text-[36px] xl:tracking-[-1.3px]">{title}</h1>
      </div>
      {(stats || actions) && (
        <div className="flex flex-wrap items-end gap-x-7 gap-y-3 md:pt-1">
          {stats && <dl className="flex flex-wrap gap-x-7 gap-y-2">{stats}</dl>}
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
      <dd className="mt-1 text-[15px] font-[650]">{value}</dd>
    </div>
  );
}

export function Panel({ title, meta, id, children, className, bodyClassName }: {
  title: string; meta?: ReactNode; id?: string; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  const headingId = id ?? `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className={cn("min-w-0 rounded-[5px] border border-border bg-card", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-t-[5px] border-b border-border bg-table-head px-[18px] py-3">
        <h2 className="text-xs font-semibold text-[#566178]" id={headingId}>{title}</h2>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </div>
      <div className={cn("p-[18px]", bodyClassName)}>{children}</div>
    </section>
  );
}
