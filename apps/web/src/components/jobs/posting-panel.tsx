"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PostingView } from "@/features/jobs/store";
import { sourceWords } from "@/features/jobs/words";

// Why it fits, what's missing, and the full posting text (docs/product/job-finder.md, release step 2, "Clicking
// a processed posting opens a side panel"). Open posting/Save/Mark applied/Dismiss buttons are here but inert --
// their behavior is release step 5 ("Act on a match"), not this slice.

export function PostingPanel({ posting, onClose }: { posting: PostingView | null; onClose: () => void }) {
  const link = posting?.sources[0]?.link;
  const text = posting?.fullDescription ?? posting?.summary ?? null;

  return (
    <Sheet open={posting !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        {posting && (
          <>
            <SheetHeader>
              <SheetTitle>{posting.title}</SheetTitle>
              <SheetDescription>{posting.company}</SheetDescription>
            </SheetHeader>
            <div className="grid gap-6 px-6 pb-6">
              {posting.score != null && (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold">{posting.score}</span>
                    <span className="text-sm text-muted-foreground">fit score</span>
                  </div>
                  {posting.whyFits.length > 0 && (
                    <div className="grid gap-1.5">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase">Why it fits</h3>
                      <ul className="grid gap-1.5">
                        {posting.whyFits.map((item) => (
                          <li key={item.reason} className="text-sm">
                            <p>{item.reason}</p>
                            <p className="text-xs text-muted-foreground">"{item.citation}"</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {posting.whatsMissing.length > 0 && (
                    <div className="grid gap-1.5">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase">What's missing</h3>
                      <ul className="grid gap-1 text-sm">
                        {posting.whatsMissing.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                  {posting.partial ? "Summary" : "Full posting"}
                </h3>
                <p className="text-sm whitespace-pre-wrap">{text ?? "Not processed yet."}</p>
              </div>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2 border-t p-6">
              <Button type="button" variant="outline" disabled>
                Save
              </Button>
              <Button type="button" variant="outline" disabled>
                Mark applied
              </Button>
              <Button type="button" variant="outline" disabled>
                Dismiss
              </Button>
              {link ? (
                <Button type="button" asChild>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    Open posting
                  </a>
                </Button>
              ) : (
                <Button type="button" disabled>
                  Open posting
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
