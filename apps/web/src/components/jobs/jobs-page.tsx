"use client";

import { WorkspaceShell } from "@/components/workspace-shell";
import type { PayBandSuggestion } from "@/features/jobs/pay-band-suggestion";
import type { PostingView } from "@/features/jobs/store";
import { NewList } from "./new-list";
import { PayBandReminder } from "./pay-band-reminder";

/** New postings, once any have been scraped (docs/product/job-finder.md). Scraping needs no setup: it runs on its
 *  own schedule against the Profile's roles. */
export function JobsPage({
  email,
  roles,
  postings,
  payBandSuggestion,
}: {
  email: string;
  roles: string[];
  postings: PostingView[];
  payBandSuggestion: PayBandSuggestion | null;
}) {
  return (
    <WorkspaceShell email={email} active="jobs">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-5xl px-page pt-page pb-section">
        <h1 className="border-b pb-block font-heading text-2xl leading-tight font-semibold tracking-tight">Jobs</h1>
        {payBandSuggestion && (
          <div className="mt-6">
            <PayBandReminder suggestion={payBandSuggestion} />
          </div>
        )}
        {postings.length > 0 ? (
          <div className={payBandSuggestion ? "mt-4" : "mt-6"}>
            <NewList postings={postings} />
          </div>
        ) : (
          <div className={payBandSuggestion ? "mt-4 grid gap-2" : "mt-6 grid gap-2"}>
            <h2 className="text-sm font-semibold text-muted-foreground">No postings yet</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              {roles.length > 0
                ? "Loots checks LinkedIn and Indeed every minute."
                : "Add a headline or job title on Profile so Loots knows what to search for."}
            </p>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
