"use client";

import Link from "next/link";
import {
  IconChevronRight,
  IconCircleCheck,
  IconCircleDashed,
  IconCopy,
  IconEyeOff,
  IconHistory,
  IconPencil,
  IconWorld,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { panel, selectedRow } from "@/components/surfaces";
import type { LedgerRow, LedgerSectionId, LedgerState } from "@/features/profile/ledger";
import { cn } from "@/lib/utils";
import { shortDate } from "./dates";

// Profile direction A, "Ledger" (docs/mockups/profile.md): every section in one list with what it holds and whether
// the public resume has it, and the public resume link above. The word and icon carry each state; no colour alone.

const stateWords: Record<LedgerState, string> = {
  unsaved: "Unsaved",
  empty: "Empty",
  private: "Private",
  "not-published": "Not published",
  changed: "Changed",
  published: "Published",
};

const stateIcons = {
  unsaved: IconPencil,
  private: IconEyeOff,
  changed: IconHistory,
} as const;

export function StateBadge({ state }: { state: LedgerState }) {
  const Icon = state in stateIcons ? stateIcons[state as keyof typeof stateIcons] : null;
  return (
    <Badge
      variant={state === "unsaved" || state === "changed" ? "secondary" : "outline"}
      className={cn(state === "empty" && "text-muted-foreground")}
    >
      {/* No data-icon: the row is a Button, which would pad itself for an icon it finds inside. */}
      {Icon && <Icon aria-hidden="true" />}
      {stateWords[state]}
    </Badge>
  );
}

export function LedgerList({
  rows,
  opened,
  onOpen,
}: {
  rows: LedgerRow[];
  opened: LedgerSectionId | null;
  onOpen: (id: LedgerSectionId) => void;
}) {
  const filled = rows.filter((row) => row.count > 0).length;
  return (
    <section aria-labelledby="ledger-title">
      <div className="mb-2 flex items-baseline justify-between px-0.5">
        <h2 id="ledger-title" className="font-heading text-base font-semibold">
          Details
        </h2>
        <span className="text-sm text-muted-foreground">
          {filled} of {rows.length} filled
        </span>
      </div>
      <ul className={cn(panel, "divide-y")}>
        {rows.map((row) => {
          const Filled = row.count ? IconCircleCheck : IconCircleDashed;
          return (
            <li key={row.id} className={cn(opened === row.id && selectedRow)}>
              <Button
                type="button"
                variant="ghost"
                aria-expanded={opened === row.id}
                aria-label={`${row.title}, ${row.count ? `${row.count} filled` : "empty"}, ${stateWords[row.state]}`}
                onClick={() => onOpen(row.id)}
                className="grid h-11 w-full grid-cols-[16px_minmax(0,1fr)_auto_16px] items-center justify-stretch gap-3 rounded-none px-3.5 text-left font-normal hover:bg-muted/50 md:grid-cols-[16px_128px_minmax(0,1fr)_40px_136px_16px]"
              >
                <Filled
                  size={16}
                  aria-hidden="true"
                  className={row.count ? "text-foreground" : "text-muted-foreground"}
                />
                <span className="truncate font-semibold">{row.title}</span>
                <span className="hidden truncate text-muted-foreground md:block">{row.glimpse}</span>
                <span className="hidden text-right font-mono text-xs text-muted-foreground md:block">{row.count}</span>
                <span className="justify-self-start">
                  <StateBadge state={row.state} />
                </span>
                <IconChevronRight size={14} aria-hidden="true" className="text-muted-foreground" />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The Portfolio's resume as visitors get it: live or not, and how many sections a Publish would change. */
export function PublicResumeBar({
  live,
  changed,
}: {
  live: { version: number; publishedAt: string } | null;
  changed: number;
}) {
  async function copy() {
    const url = new URL("/api/public/portfolio/resume", window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast({ tone: "success", title: "Link copied" });
    } catch {
      toast({ tone: "error", title: "Couldn't copy. Try again" });
    }
  }

  return (
    <section aria-label="Public resume" className={cn(panel, "flex flex-wrap items-center gap-3 px-3.5 py-3")}>
      <IconWorld size={16} aria-hidden="true" className="shrink-0" />
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Public resume
          {live ? (
            <Badge variant="outline">
              <IconCircleCheck data-icon="inline-start" aria-hidden="true" />
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not published
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {live
            ? `Version ${live.version}, ${shortDate(live.publishedAt)} · ${
                changed ? `${changed} ${changed === 1 ? "section" : "sections"} changed since` : "Up to date"
              }`
            : "Publish from Portfolio"}
        </p>
      </div>
      <div className="flex gap-2 max-sm:w-full">
        {live && (
          <Button type="button" variant="outline" className="max-sm:flex-1" onClick={() => void copy()}>
            <IconCopy data-icon="inline-start" aria-hidden="true" />
            Copy link
          </Button>
        )}
        <Button asChild variant="outline" className="max-sm:flex-1">
          <Link href="/portfolio">Open Portfolio</Link>
        </Button>
      </div>
    </section>
  );
}
