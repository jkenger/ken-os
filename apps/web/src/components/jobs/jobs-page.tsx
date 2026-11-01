"use client";

import { useMemo, useState } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { PayBandSuggestion } from "@/features/jobs/pay-band-suggestion";
import type { JobPreferences } from "@/features/jobs/preferences-store";
import { sortPostings, type SortKey } from "@/features/jobs/sort-postings";
import type { PostingView } from "@/features/jobs/store";
import { FilterSidebar } from "./filter-sidebar";
import { NewList } from "./new-list";
import { PayBandReminder } from "./pay-band-reminder";
import { ResultsBar } from "./results-bar";
import { RunPipelineButton, RunPipelineLog, useRunPipeline } from "./run-pipeline-panel";

function matchesSearch(posting: PostingView, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return posting.title.toLowerCase().includes(query) || posting.company.toLowerCase().includes(query);
}

/** New postings, once any have been scraped (docs/mockups/Jobs redesign.html). Scraping needs no setup: it runs
 *  on its own schedule against the owner's roles. */
export function JobsPage({
  email,
  effectiveRoles,
  postings,
  preferences,
  filteredOutCount,
  payBandSuggestion,
}: {
  email: string;
  effectiveRoles: string[];
  postings: PostingView[];
  preferences: JobPreferences;
  filteredOutCount: number;
  payBandSuggestion: PayBandSuggestion | null;
}) {
  const { busy, log, run } = useRunPipeline();
  const [sort, setSort] = useState<SortKey>("score");
  const [search, setSearch] = useState("");
  const visible = useMemo(
    () =>
      sortPostings(
        postings.filter((posting) => matchesSearch(posting, search)),
        sort,
      ),
    [postings, sort, search],
  );

  return (
    <WorkspaceShell email={email} active="jobs">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-6xl px-page pt-page pb-section">
        <div className="flex items-center justify-between gap-3 border-b pb-block">
          <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">Jobs</h1>
          <RunPipelineButton busy={busy} onRun={() => void run()} />
        </div>
        {log.length > 0 && (
          <div className="mt-4">
            <RunPipelineLog log={log} />
          </div>
        )}
        {payBandSuggestion && (
          <div className="mt-6">
            <PayBandReminder suggestion={payBandSuggestion} preferences={preferences} />
          </div>
        )}

        <div className={payBandSuggestion || log.length > 0 ? "mt-4" : "mt-6"}>
          {postings.length > 0 ? (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[17rem_1fr]">
              <FilterSidebar preferences={preferences} search={search} onSearchChange={setSearch} />
              <div>
                <ResultsBar
                  count={visible.length}
                  hiddenCount={filteredOutCount}
                  preferences={preferences}
                  sort={sort}
                  onSortChange={setSort}
                />
                <NewList postings={visible} />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">No postings yet</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {effectiveRoles.length > 0 ? (
                  <>freehire is checked every minute for {effectiveRoles.join(", ")}.</>
                ) : (
                  "Add a headline or job title on Profile so Jobs knows what to search for."
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
