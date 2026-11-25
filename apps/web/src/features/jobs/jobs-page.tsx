"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CheckStatus } from "@/features/jobs/format-check-status";
import { formatBoardName } from "@/features/jobs/job-boards";
import type { JobPreferences } from "@/features/jobs/preferences-store";
import type { ScraperSourceState } from "@/features/jobs/scraper-state";
import type { PostingSortKey, PostingView } from "@/features/jobs/store";
import { FilterSidebar } from "./filter-sidebar";
import { JobsTabs } from "./jobs-tabs";
import { NewList } from "./new-list";
import { Overview, SetupStatusPanel } from "./overview";
import { ResultsBar } from "./results-bar";
import { StatusStrip } from "./status-strip";

const SEARCH_DEBOUNCE_MS = 300;

/** `/api/jobs/postings`'s JSON response turns Date fields into strings; the server component's own props don't.
 *  Every posting that reaches `items` goes through here once, so the rest of the page can trust `PostingView`'s
 *  declared types regardless of which path it arrived by. */
function hydratePosting(raw: PostingView): PostingView {
  return {
    ...raw,
    firstSeenAt: new Date(raw.firstSeenAt),
    sourcePostedAt: raw.sourcePostedAt ? new Date(raw.sourcePostedAt) : null,
    sourceUpdatedAt: raw.sourceUpdatedAt ? new Date(raw.sourceUpdatedAt) : null,
    viewedAt: raw.viewedAt ? new Date(raw.viewedAt) : null,
  };
}

/** The value `listPostingsPage` expects back as `cursorValue` for the given sort key, read off the last posting
 *  on the page just loaded -- must match `store.ts`'s `SORT_COLUMN` exactly. */
function cursorValueFor(sort: PostingSortKey, posting: PostingView): string | null {
  if (sort === "score") return posting.score == null ? null : String(posting.score);
  if (sort === "pay") return posting.payAmount == null ? null : String(posting.payAmount);
  return (posting.sourcePostedAt ?? posting.firstSeenAt).toISOString();
}

type PostingsPage = { postings: PostingView[]; hasMore: boolean };
type PostingsPageKey = {
  search: string;
  sort: PostingSortKey;
  board?: string;
  preferences: JobPreferences;
  cursorValue: string | null;
  cursorId: string | null;
};

async function fetchPostingsPage(params: PostingsPageKey): Promise<PostingsPage> {
  const query = new URLSearchParams({ sort: params.sort });
  if (params.search) query.set("search", params.search);
  if (params.board) query.set("board", params.board);
  if (params.cursorValue !== null) query.set("cursorValue", params.cursorValue);
  if (params.cursorId !== null) query.set("cursorId", params.cursorId);
  const response = await fetch(`/api/jobs/postings?${query}`);
  if (!response.ok) throw new Error("Couldn't load postings");
  const data = (await response.json()) as { postings: PostingView[]; hasMore: boolean };
  return { postings: data.postings.map(hydratePosting), hasMore: data.hasMore };
}

/** New postings, once any have been scraped (docs/mockups/Jobs redesign.html). Scraping needs no setup: it runs
 *  on its own schedule against the owner's roles -- no page-wide heading, the bar over the cards does the work
 *  (docs/mockups/Jobs redesign.html, "New heading / Three directions", option C).
 *
 *  Search, sort and paging all run in SQL (`listPostingsPage`), not in the browser: past a few hundred postings,
 *  filtering or sorting an array already fully fetched into the page stops being viable. `items` only ever holds
 *  what's actually been loaded; scrolling near the bottom fetches the next batch of `PAGE_SIZE`. */
export function JobsPage({
  email,
  effectiveRoles,
  derivedRoles,
  initialPostings,
  initialHasMore,
  newCount,
  boardCount,
  profileSkills,
  preferences,
  companies,
  filteredOutCount,
  boardFilter,
  checkStatus,
  scraperStates,
}: {
  email: string;
  effectiveRoles: string[];
  /** Roles read fresh from the Profile headline and last two titles -- what the filter sidebar's "Import from
   *  Profile" offers, separate from `effectiveRoles` (which already falls back to these when the owner hasn't
   *  edited any, so searching itself is never blocked on an import). */
  derivedRoles: string[];
  /** The first page from the server component, so there's something on screen before any client fetch. */
  initialPostings: PostingView[];
  initialHasMore: boolean;
  /** Every New posting the owner has, not just what's loaded -- the list header's stable total. */
  newCount: number;
  /** The New/Job board tabs' own count for the other tab. */
  boardCount: number;
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
  /** Every scraped source's own block/run state (plans/jobs-scraper-sources.md, Slice 3) -- the Overview's
   *  per-source rows, generic over however many sources have run at least once. */
  scraperStates: ScraperSourceState[];
}) {
  const [sort, setSort] = useState<PostingSortKey>("score");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSetupStatus, setShowSetupStatus] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Only the search box debounces -- a sort click or a filter chip is a discrete action the owner expects to act
  // on immediately, not wait out an artificial delay for.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [search]);

  // Search, sort and a saved preferences change (Filter sidebar, or dropping a chip in ResultsBar) each form a
  // different key, so SWR fetches page 1 fresh under the new key automatically -- no manual "skip the first
  // render" bookkeeping the way a plain effect needed. `preferences` is a key dependency, not just a display
  // prop: `router.refresh()` after a preferences PUT recomputes the server data (see store.ts's
  // `refilterExisting`), and changing the key is what makes the already-mounted list pick that up instead of
  // needing a hard reload. `previousPageData.hasMore === false` stops paging at the key's own end, matching
  // `listPostingsPage`'s own cursor contract.
  const getKey = useCallback(
    (pageIndex: number, previousPageData: PostingsPage | null): PostingsPageKey | null => {
      if (previousPageData && !previousPageData.hasMore) return null;
      if (pageIndex === 0) {
        return { search: debouncedSearch, sort, board: boardFilter, preferences, cursorValue: null, cursorId: null };
      }
      const last = previousPageData!.postings[previousPageData!.postings.length - 1]!;
      return {
        search: debouncedSearch,
        sort,
        board: boardFilter,
        preferences,
        cursorValue: cursorValueFor(sort, last),
        cursorId: last.id,
      };
    },
    [debouncedSearch, sort, boardFilter, preferences],
  );

  const { data, size, setSize, isValidating } = useSWRInfinite(getKey, fetchPostingsPage, {
    fallbackData: [{ postings: initialPostings, hasMore: initialHasMore }],
    revalidateFirstPage: false,
    revalidateOnMount: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  });

  // `useSWRInfinite` doesn't reset `size` on its own when the key changes -- without this, a search typed while
  // 3 pages were already loaded would re-fetch all 3 pages under the new search instead of just page 1.
  useEffect(() => {
    void setSize(1);
  }, [debouncedSearch, sort, boardFilter, preferences, setSize]);

  const items = data ? data.flatMap((page) => page.postings) : initialPostings;
  const hasMore = data ? data[data.length - 1]!.hasMore : initialHasMore;
  const loadingMore = isValidating && size > 1;

  const loadMore = useCallback(() => {
    if (isValidating || !hasMore || items.length === 0) return;
    void setSize((current) => current + 1);
  }, [isValidating, hasMore, items.length, setSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: "400px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

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
        <JobsTabs active="new" newCount={newCount} boardCount={boardCount} />
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[20rem_1fr]">
          <FilterSidebar
            preferences={preferences}
            derivedRoles={derivedRoles}
            companies={companies}
            search={search}
            onSearchChange={setSearch}
          />
          {newCount > 0 ? (
            <div>
              <StatusStrip
                effectiveRoles={effectiveRoles}
                checkStatus={checkStatus}
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
                    scraperStates={scraperStates}
                  />
                </div>
              )}
              <ResultsBar
                totalCount={newCount + filteredOutCount}
                hiddenCount={filteredOutCount}
                preferences={preferences}
                sort={sort}
                onSortChange={setSort}
              />
              <NewList postings={items} profileSkills={profileSkills} />
              <div ref={sentinelRef} className="h-px" aria-hidden="true" />
              {loadingMore && <p className="py-3 text-center text-xs text-muted-foreground">Loading more…</p>}
            </div>
          ) : (
            <Overview
              effectiveRoles={effectiveRoles}
              preferences={preferences}
              checkStatus={checkStatus}
              scraperStates={scraperStates}
            />
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
