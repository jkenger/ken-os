"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCircleCheck, IconCopy, IconExternalLink, IconEyeOff, IconHistory, IconPencil } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { panel } from "@/components/surfaces";
import type { LedgerState } from "@/features/profile/ledger";
import { cn } from "@/lib/utils";
import { shortDate } from "./dates";

// Profile's state badge for each section (whether the public resume has it) and the public resume block in the right
// column. The word and icon carry each state; no colour alone.

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
      {Icon && <Icon aria-hidden="true" />}
      {stateWords[state]}
    </Badge>
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
    <section id="public-link" aria-labelledby="public-link-title" className={cn(panel, "scroll-mt-16 p-5")}>
      <div className="flex items-center gap-2">
        <h2 id="public-link-title" className="font-heading text-base font-semibold">
          Public resume
        </h2>
        {live ? (
          <Badge className="bg-topic-learned-soft text-topic-learned">
            <IconCircleCheck data-icon="inline-start" aria-hidden="true" />
            Live
          </Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground">Not published</Badge>
        )}
      </div>
      <p className="mt-1 text-muted-foreground">
        {live
          ? changed
            ? `${changed} ${changed === 1 ? "section" : "sections"} changed since ${shortDate(live.publishedAt)}`
            : `Up to date, version ${live.version}`
          : "Publish from Portfolio"}
      </p>
      {live && link && (
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={link}>
          {link.replace(/^https?:\/\//, "")}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {live && (
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => void copy()}>
            <IconCopy data-icon="inline-start" aria-hidden="true" />
            Copy link
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href="/portfolio">
            Open Portfolio
            <IconExternalLink data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
