"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconChevronRight,
  IconCircleCheck,
  IconCircleDashed,
  IconCopy,
  IconExternalLink,
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
  private: "Hidden",
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
      variant={state === "unsaved" ? "secondary" : state === "changed" || state === "empty" ? "default" : "outline"}
      className={cn(
        // Blue, as the Ledger frame draws it: the owner chose this over DESIGN.md's blue-only-for-selection rule.
        state === "changed" && "bg-selected/12 text-selected",
        state === "empty" && "bg-muted text-muted-foreground",
      )}
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
        <h2 id="ledger-title" className="font-heading text-base font-bold">
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
                className="grid h-11 w-full grid-cols-[18px_minmax(0,1fr)_auto_16px] items-center justify-stretch gap-3 rounded-none px-3.5 text-left font-normal hover:bg-muted/50 md:grid-cols-[18px_128px_minmax(0,1fr)_64px_150px_16px]"
              >
                <Filled
                  size={18}
                  aria-hidden="true"
                  className={row.count ? "text-topic-learned" : "text-muted-foreground"}
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

/** The public resume's address as it is copied, shown without the scheme. Read after mount: the server doesn't know
 *  which host the page is on. */
function useResumeLink() {
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => setLink(new URL("/api/public/portfolio/resume", window.location.origin).toString()), []);
  return link;
}

/** The Portfolio's resume as visitors get it: live or not, and how many sections a Publish would change. */
export function PublicResumeBar({
  live,
  changed,
}: {
  live: { version: number; publishedAt: string } | null;
  changed: number;
}) {
  const link = useResumeLink();

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast({ tone: "success", title: "Link copied" });
    } catch {
      toast({ tone: "error", title: "Couldn't copy. Try again" });
    }
  }

  return (
    <section
      id="public-link"
      aria-label="Public link"
      className={cn(panel, "flex scroll-mt-24 flex-wrap items-center gap-3 px-3.5 py-3 md:flex-nowrap")}
    >
      <IconWorld size={18} aria-hidden="true" className="shrink-0" />
      <div className="flex min-w-0 flex-1 basis-[calc(100%-2.5rem)] flex-col gap-0.5 md:basis-auto">
        <div className="flex items-center gap-2 font-semibold">
          Public resume
          {live ? (
            <Badge className="bg-topic-learned-soft text-topic-learned">
              <IconCircleCheck data-icon="inline-start" aria-hidden="true" />
              Live
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground">Not published</Badge>
          )}
        </div>
        <p className="flex min-w-0 items-baseline gap-1 text-sm whitespace-nowrap text-muted-foreground">
          {live ? (
            <>
              {/* The link gives way first, so the state after it stays readable in a narrow bar. */}
              {link && (
                <span className="hidden min-w-0 truncate font-mono text-xs md:inline">
                  {link.replace(/^https?:\/\//, "")}
                </span>
              )}
              {link && (
                <span aria-hidden="true" className="hidden md:inline">
                  ·
                </span>
              )}
              <span className="shrink-0">
                {changed
                  ? `${changed} ${changed === 1 ? "section" : "sections"} changed since ${shortDate(live.publishedAt)}`
                  : `Up to date, version ${live.version}`}
              </span>
            </>
          ) : (
            "Publish from Portfolio"
          )}
        </p>
      </div>
      {live && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-[13px] max-md:flex-1"
          onClick={() => void copy()}
        >
          <IconCopy data-icon="inline-start" aria-hidden="true" />
          Copy link
        </Button>
      )}
      <Button asChild variant="outline" size="sm" className="text-[13px] max-md:flex-1">
        <Link href="/portfolio">
          Open Portfolio
          <IconExternalLink data-icon="inline-end" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
