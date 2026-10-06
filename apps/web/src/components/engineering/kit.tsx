import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { LEVELS, levelRank, type Level } from "@ken-os/domain";
import { cn } from "@/lib/utils";

// Building blocks of the selected 2026-10-06 Engineering prototype ("light Evidence Workbench"), one to one: sizes,
// weights and spacing are the prototype's. Colours come from the Ken OS tokens (features/design-system/contract.ts).

export const button = "inline-flex min-h-11 items-center justify-center gap-3.5 rounded-[5px] border px-[19px] py-[11px] text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
export const primaryButton = cn(button, "border-primary bg-primary text-primary-foreground hover:bg-primary-hover");
export const secondaryButton = cn(button, "border-input bg-card text-secondary-foreground hover:bg-accent");
export const textButton = "inline-flex items-center gap-2 text-[13px] font-semibold text-foreground underline decoration-input underline-offset-4 hover:decoration-foreground";
export const panel = "rounded-[5px] border border-border bg-card";
export const eyebrow = "mb-[9px] text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-[4px] bg-secondary px-2.5 py-[5px] align-middle text-[11px] font-medium leading-[1.2] tracking-normal text-quiet", className)}>{children}</span>;
}

export function Back({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="mx-[5px] mb-[23px] inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground md:mx-3.5"><IconArrowLeft size={17} aria-hidden="true" />{children}</Link>;
}

/** Eyebrow, title with an optional badge, and facts on the right. No tagline: screens name things, they don't sell them. */
export function PageHeading({ kicker = "Engineering", title, badge, facts, aside }: { kicker?: string; title: string; badge?: ReactNode; facts?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-[5px] mb-[25px] block items-start justify-between gap-[22px] md:mx-3.5 md:mb-8 md:flex">
      <div className="min-w-0">
        <div className={eyebrow}>{kicker}</div>
        <h1 className="text-[28px] font-[750] leading-[1.25] tracking-[-0.8px] md:text-[30px] xl:text-[36px] xl:tracking-[-1.3px]">
          {title}{badge && <Badge className="mt-2.5 table md:ml-2 md:mt-0 md:inline-flex">{badge}</Badge>}
        </h1>
      </div>
      {facts && <dl className="mt-[22px] grid w-full shrink-0 grid-cols-[1fr_1.7fr] gap-2.5 md:mt-0 md:flex md:w-[185px] md:flex-col md:gap-2 md:pt-1 lg:w-[215px]">{facts}</dl>}
      {aside}
    </div>
  );
}

export function Fact({ label, children, first }: { label: string; children: ReactNode; first?: boolean }) {
  return (
    <div className="contents">
      <dt className={cn("text-xs text-muted-foreground", !first && "md:mt-2.5")}>{label}</dt>
      <dd className="text-xs font-[650] md:text-[15px]">{children}</dd>
    </div>
  );
}

/** Junior, mid and senior as three rounded segments, the reached level lit. Nothing lit below junior. */
export function Rail({ level, soft = false, label }: { level: Level | null; soft?: boolean; label?: string }) {
  const lit = levelRank(level);
  return (
    <div className="mt-[5px] min-w-0" role="img" aria-label={label ?? `Level: ${level ?? "not yet junior"}`}>
      <div className="flex gap-[3px]">
        {LEVELS.map((item, index) => <span key={item} className={cn("h-3 flex-1 rounded-lg", index === lit ? (soft ? "bg-rail-soft" : "bg-rail-lit") : "bg-rail")} />)}
      </div>
      <small className="mt-[5px] flex justify-between gap-1 text-[9px] text-muted-foreground lg:text-[10px]"><span>Junior</span><span>Mid</span><span>Senior</span></small>
    </div>
  );
}

/** One segment per requirement for the target, met ones lit. A count, never a percentage. */
export function Coverage({ met, total }: { met: number; total: number }) {
  if (!total) return <span className="text-xs text-muted-foreground">Nothing required</span>;
  return (
    <div className="mt-[5px] min-w-0" role="img" aria-label={`${met} of ${total} requirements met`}>
      <div className="flex gap-[3px]">
        {Array.from({ length: total }, (_, index) => <span key={index} className={cn("h-3 flex-1 rounded-lg", index < met ? "bg-rail-soft" : "bg-rail")} />)}
      </div>
      <small className="mt-[5px] block text-[9px] text-muted-foreground lg:text-[10px]">{met} of {total} met</small>
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {action}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return (
    <div className={cn("my-5 rounded-[5px] border p-4 text-[13px] leading-[1.6]",
      tone === "info" && "border-border bg-tint text-foreground",
      tone === "error" && "border-status-gap/30 bg-status-gap-surface text-status-gap",
      tone === "success" && "border-status-solid/30 bg-status-solid-surface text-status-solid")}>
      {children}
    </div>
  );
}

/** Level names as the prototype's table writes them: Junior, Mid, Senior. */
export function levelShort(level: Level | null) {
  return level === null ? "Not yet junior" : { junior: "Junior", mid: "Mid", senior: "Senior" }[level];
}
