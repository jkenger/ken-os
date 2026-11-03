"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CheckStatus } from "@/features/jobs/format-check-status";
import { formatBoardName } from "@/features/jobs/job-boards";
import type { JobPreferences } from "@/features/jobs/preferences-store";
import { sortPostings, type SortKey } from "@/features/jobs/sort-postings";
import type { PostingView } from "@/features/jobs/store";
import { FilterSidebar } from "./filter-sidebar";
import { NewList } from "./new-list";
import { Overview, SetupStatusPanel } from "./overview";
import { ResultsBar } from "./results-bar";
import { StatusStrip } from "./status-strip";

function matchesSearch(posting: PostingView, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return posting.title.toLowerCase().includes(query) || posting.company.toLowerCase().includes(query);
}

/** New postings, once any have been scraped (docs/mockups/Jobs redesign.html). Scraping needs no setup: it runs
 *  on its own schedule against the owner's roles -- no page-wide heading, the bar over the cards does the work
 *  (docs/mockups/Jobs redesign.html, "New heading / Three directions", option C). */
export function JobsPage({
  email,
  effectiveRoles,
  derivedRoles,
  postings,
  profileSkills,
  preferences,
  companies,
  filteredOutCount,
  boardFilter,
  checkStatus,
}: {
  email: string;
  effectiveRoles: string[];
  /** Roles read fresh from the Profile headline and last two titles -- what the filter sidebar's "Import from
   *  Profile" offers, separate from `effectiveRoles` (which already falls back to these when the owner hasn't
   *  edited any, so searching itself is never blocked on an import). */
  derivedRoles: string[];
  postings: PostingView[];
  profileSkills: string[];
  preferences: JobPreferences;
  /** Every distinct company name from the owner's own postings, for the Skip companies filter's search list. */
  companies: string[];
  filteredOutCount: number;
  /** Set from the `?board=` URL param (a job detail page's "Sourced from" link); scopes the list to postings
   *  freehire itself pulled from that one board, as opposed to a `job_preferences` field -- this filter lives in
   *  the URL, not saved preferences, since it's a one-off "show me where this came from", not a standing
   *  setting. */
  boardFilter?: string;
  /** `null` means the outside scheduler has never called `/api/jobs/check/freehire` for this owner -- the
   *  Overview's "Last checked" fact. */
  checkStatus: CheckStatus | null;
}) {
  const [sort, setSort] = useState<SortKey>("score");
  const [search, setSearch] = useState("");
  const [showSetupStatus, setShowSetupStatus] = useState(false);
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
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-7xl px-page py-page">
        {boardFilter && (
          <Badge variant="secondary" className="mb-3 gap-1 py-0 pr-0.5">
            Source: {formatBoardName(boardFilter)}
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Clear source filter" asChild>
              <Link href="/jobs" className="size-4 rounded-full">
                ×
              </Link>
            </Button>
          </Badge>
        )}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[17rem_1fr]">
          <FilterSidebar
            preferences={preferences}
            derivedRoles={derivedRoles}
            companies={companies}
            search={search}
            onSearchChange={setSearch}
          />
          {postings.length > 0 ? (
            <div>
              <StatusStrip
                effectiveRoles={effectiveRoles}
                checkStatus={checkStatus}
                newCount={postings.length}
                filteredOutCount={filteredOutCount}
                expanded={showSetupStatus}
                onToggle={() => setShowSetupStatus((shown) => !shown)}
              />
              {showSetupStatus && (
                <div className="mb-3">
                  <SetupStatusPanel
                    effectiveRoles={effectiveRoles}
                    preferences={preferences}
                    checkStatus={checkStatus}
                  />
                </div>
              )}
              <ResultsBar
                count={visible.length}
                hiddenCount={filteredOutCount}
                preferences={preferences}
                sort={sort}
                onSortChange={setSort}
              />
              <NewList postings={visible} profileSkills={profileSkills} />
            </div>
          ) : (
            <Overview effectiveRoles={effectiveRoles} preferences={preferences} checkStatus={checkStatus} />
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
