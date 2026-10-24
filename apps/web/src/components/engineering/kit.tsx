import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { LEVELS, levelRank, type Level } from "@ken-os/domain";
import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Loots page building blocks, on the shadcn default look (see docs/architecture/design-system-shadcn-setup.md).

export { panel, selectedSurface } from "@/components/surfaces";
export const eyebrow = "mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground";

/** The page-heading badge: shadcn's Badge in the secondary look. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ShadcnBadge variant="secondary" className={cn("align-middle", className)}>
      {children}
    </ShadcnBadge>
  );
}

export function Back({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mx-1 mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground md:mx-3.5"
    >
      <IconArrowLeft size={17} aria-hidden="true" />
      {children}
    </Link>
  );
}

export function Fact({ label, children, first }: { label: string; children: ReactNode; first?: boolean }) {
  return (
    <div className="contents">
      <dt className={cn("text-xs text-muted-foreground", !first && "md:mt-2.5")}>{label}</dt>
      <dd className="text-xs font-semibold md:text-sm">{children}</dd>
    </div>
  );
}

/** Junior, mid and senior as three rounded segments, the reached level lit. Nothing lit below junior. */
export function Rail({ level, soft = false, label }: { level: Level | null; soft?: boolean; label?: string }) {
  const lit = levelRank(level);
  return (
    <div className="mt-1 min-w-0" role="img" aria-label={label ?? `Level: ${level ?? "Developing"}`}>
      <div className="flex gap-0.5">
        {LEVELS.map((item, index) => (
          <span
            key={item}
            className={cn(
              "h-2 flex-1 rounded-full",
              index === lit ? (soft ? "bg-primary/40" : "bg-primary") : "bg-muted",
            )}
          />
        ))}
      </div>
      <small className="mt-1 flex justify-between gap-1 text-xs text-muted-foreground lg:text-xs">
        <span>Junior</span>
        <span>Mid</span>
        <span>Senior</span>
      </small>
    </div>
  );
}

/** One segment per requirement for the target, met ones lit. A count, never a percentage. */
export function Coverage({ met, total }: { met: number; total: number }) {
  if (!total) return <span className="text-xs text-muted-foreground">Nothing required</span>;
  return (
    <div className="mt-1 min-w-0" role="img" aria-label={`${met} of ${total} requirements met`}>
      <div className="flex gap-0.5">
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={cn("h-2 flex-1 rounded-full", index < met ? "bg-primary/40" : "bg-muted")} />
        ))}
      </div>
      <small className="mt-1 block text-xs text-muted-foreground lg:text-xs">
        {met} of {total} met
      </small>
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

/** A notice block. It has no margin of its own, so the layout around it sets the spacing; corners match `panel`. */
export function Notice({
  tone = "info",
  className,
  children,
}: {
  tone?: "info" | "error" | "success";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3.5 text-sm leading-relaxed",
        className,
        tone === "info" && "border bg-card text-foreground",
        tone === "error" && "bg-destructive/10 text-destructive",
        tone === "success" && "bg-muted text-foreground",
      )}
    >
      {children}
    </div>
  );
}

/** Level names as the prototype's table writes them: Junior, Mid, Senior. */
export function levelShort(level: Level | null) {
  return level === null ? "Developing" : { junior: "Junior", mid: "Mid", senior: "Senior" }[level];
}
