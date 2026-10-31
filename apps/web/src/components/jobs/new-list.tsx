import { DotSeparator } from "@/components/dot-separator";
import type { PostingView } from "@/features/jobs/store";
import { timeAgo } from "@/features/jobs/time-ago";
import { sourceWords } from "@/features/jobs/words";

// New postings (docs/product/job-finder.md, release step 1): title, company, source, how long ago it arrived, and a
// link to the posting. No score, pay, type or shift yet — those come from the full-posting AI read in step 2.

export function NewList({ postings }: { postings: PostingView[] }) {
  return (
    <div className="rounded-lg border">
      {postings.map((posting) => (
        <a
          key={posting.id}
          href={posting.sources[0]?.link ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="grid gap-1 border-b p-4 last:border-b-0 hover:bg-muted"
        >
          <span className="text-sm font-medium">{posting.title}</span>
          <span className="flex flex-wrap items-center text-xs text-muted-foreground">
            {posting.company}
            <DotSeparator />
            {posting.location}
            <DotSeparator />
            {posting.sources.map((source) => sourceWords[source.source]).join(", ")}
            <DotSeparator />
            {timeAgo(posting.firstSeenAt)}
          </span>
        </a>
      ))}
      {postings.length === 0 && <p className="p-4 text-sm text-muted-foreground">No new postings</p>}
    </div>
  );
}
