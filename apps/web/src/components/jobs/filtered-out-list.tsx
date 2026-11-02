"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DotSeparator } from "@/components/dot-separator";
import { toast } from "@/components/ui/toaster";
import type { PostingView } from "@/features/jobs/store";
import { sourceWords } from "@/features/jobs/words";
import { send } from "@/lib/api-client";

// Filtered out: hidden postings with their reason and Show anyway (docs/product/job-finder.md). Nothing disappears
// silently — a posting a strict filter hides still shows here.

export function FilteredOutList({ postings }: { postings: PostingView[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function showAnyway(id: string) {
    setBusyId(id);
    try {
      await send(`/api/jobs/postings/${id}/show-anyway`, "POST", {});
      toast({ tone: "success", title: "Moved to New" });
      router.refresh();
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't move it. Try again" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-lg border">
      {postings.map((posting) => (
        <div key={posting.id} className="flex items-center justify-between gap-4 border-b p-4 last:border-b-0">
          <div className="grid min-w-0 gap-1">
            <span className="text-sm font-medium">{posting.title}</span>
            <span className="flex flex-wrap items-center text-xs text-muted-foreground">
              {posting.company}
              <DotSeparator />
              {posting.sources.map((source) => sourceWords[source.source]).join(", ")}
              <DotSeparator />
              <span className="text-destructive">{posting.filterReason}</span>
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busyId === posting.id}
            onClick={() => void showAnyway(posting.id)}
            className="shrink-0"
          >
            Show anyway
          </Button>
        </div>
      ))}
      {postings.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing filtered out</p>}
    </div>
  );
}
