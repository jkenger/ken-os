"use client";

import { useState } from "react";
import { DotSeparator } from "@/components/dot-separator";
import { Button } from "@/components/ui/button";
import type { PostingView } from "@/features/jobs/store";
import { timeAgo } from "@/features/jobs/time-ago";
import { sourceWords } from "@/features/jobs/words";
import { PostingPanel } from "./posting-panel";

// New postings (docs/product/job-finder.md, release step 1 and 2): title, company, source, how long ago it
// arrived, and once a posting is processed, pay, job type, work setup, country, shift and score. Clicking a row
// opens the side panel instead of navigating away -- the external link lives there as "Open posting".

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};

const WORK_SETUP_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
};

function payLabel(posting: PostingView): string | null {
  if (posting.payAmount == null || !posting.payCurrency || !posting.payPeriod) return null;
  return `${posting.payCurrency} ${Math.round(posting.payAmount).toLocaleString()}/${posting.payPeriod}`;
}

function processedFields(posting: PostingView): string[] {
  const fields: string[] = [];
  const pay = payLabel(posting);
  if (pay) fields.push(pay);
  if (posting.jobType) fields.push(JOB_TYPE_LABELS[posting.jobType]);
  if (posting.workSetup) fields.push(WORK_SETUP_LABELS[posting.workSetup]);
  if (posting.countries && posting.countries.length > 0) fields.push(posting.countries.join(", "));
  if (posting.shift) fields.push(posting.shift);
  return fields;
}

function DottedLine({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap items-center text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={item} className="inline-flex items-center">
          {index > 0 && <DotSeparator />}
          {item}
        </span>
      ))}
    </span>
  );
}

export function NewList({ postings }: { postings: PostingView[] }) {
  const [openPosting, setOpenPosting] = useState<PostingView | null>(null);

  return (
    <div className="rounded-lg border">
      {postings.map((posting) => {
        const fields = posting.processedAt ? processedFields(posting) : [];
        return (
          <Button
            key={posting.id}
            type="button"
            variant="ghost"
            onClick={() => setOpenPosting(posting)}
            className="grid h-auto w-full items-start justify-start gap-1 rounded-none border-b p-4 text-left font-normal whitespace-normal last:border-b-0"
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="text-sm font-medium">{posting.title}</span>
              {posting.score != null && (
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium">{posting.score}</span>
              )}
            </span>
            <DottedLine
              items={[
                posting.company,
                posting.location,
                sourceWords[posting.sources[0]?.source ?? "freehire"],
                timeAgo(posting.firstSeenAt),
              ]}
            />
            {fields.length > 0 && <DottedLine items={fields} />}
          </Button>
        );
      })}
      {postings.length === 0 && <p className="p-4 text-sm text-muted-foreground">No new postings</p>}
      <PostingPanel posting={openPosting} onClose={() => setOpenPosting(null)} />
    </div>
  );
}
