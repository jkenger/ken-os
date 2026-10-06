import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { LEVELS, levelRank, type Level } from "@ken-os/domain";
import { cn } from "@/lib/utils";

// Ken OS page building blocks in the Studio look chosen on 2026-10-06: round controls, raised white panels on the
// stone ground, one cobalt signal. Colours, radii and shadows come from features/design-system/contract.ts.

export const button = "inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border px-5 py-[11px] text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
export const primaryButton = cn(button, "border-primary bg-primary text-primary-foreground hover:bg-primary-hover");
export const secondaryButton = cn(button, "border-input bg-card text-secondary-foreground hover:bg-accent");
export const textButton = "inline-flex items-center gap-2 text-[13px] font-semibold text-foreground underline decoration-input underline-offset-4 hover:decoration-foreground";
export const panel = "rounded-xl bg-card shadow-panel";
export const eyebrow = "mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full bg-secondary px-2.5 py-[5px] align-middle font-sans text-xs font-semibold leading-[1.2] tracking-normal text-quiet", className)}>{children}</span>;
}

export function Back({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="mx-[5px] mb-[23px] inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground md:mx-3.5"><IconArrowLeft size={17} aria-hidden="true" />{children}</Link>;
}

/** Eyebrow, title with an optional badge and one-line description, and facts on the right. The description says what
 *  the page holds; never a tagline: screens name things, they don't sell them. */
export function PageHeading({ kicker = "Engineering", title, badge, description, facts, aside }: { kicker?: string; title: string; badge?: ReactNode; description?: string; facts?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-[5px] mb-5 block items-start justify-between gap-6 md:mx-3.5 md:mb-7 md:flex">
      <div className="min-w-0">
        <div className={eyebrow}>{kicker}</div>
        <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-0.035em] md:text-[34px] xl:text-[40px] xl:leading-[1.05]">
          {title}{badge && <Badge className="mt-2.5 table md:ml-3 md:mt-0 md:inline-flex">{badge}</Badge>}
        </h1>
        {description && <p className="mt-2.5 max-w-[560px] text-sm text-muted-foreground">{description}</p>}
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
        {LEVELS.map((item, index) => <span key={item} className={cn("h-2 flex-1 rounded-full", index === lit ? (soft ? "bg-rail-soft" : "bg-rail-lit") : "bg-rail")} />)}
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
        {Array.from({ length: total }, (_, index) => <span key={index} className={cn("h-2 flex-1 rounded-full", index < met ? "bg-rail-soft" : "bg-rail")} />)}
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
    <div className={cn("my-5 rounded-md px-4 py-3.5 text-[13px] leading-[1.6]",
      tone === "info" && "bg-card text-foreground shadow-panel",
      tone === "error" && "bg-status-gap-surface text-status-gap",
      tone === "success" && "bg-status-solid-surface text-status-solid")}>
      {children}
    </div>
  );
}

/** Level names as the prototype's table writes them: Junior, Mid, Senior. */
export function levelShort(level: Level | null) {
  return level === null ? "Not yet junior" : { junior: "Junior", mid: "Mid", senior: "Senior" }[level];
}
