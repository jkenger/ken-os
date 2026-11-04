"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CheckStatus } from "@/features/jobs/format-check-status";
import { formatBoardName } from "@/features/jobs/job-boards";
import type { JobPreferences } from "@/features/jobs/preferences-store";
import type { PostingSortKey, PostingView } from "@/features/jobs/store";
import { FilterSidebar } from "./filter-sidebar";
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
  };
}

/** The value `listPostingsPage` expects back as `cursorValue` for the given sort key, read off the last posting
 *  on the page just loaded -- must match `store.ts`'s `SORT_COLUMN` exactly. */
function cursorValueFor(sort: PostingSortKey, posting: PostingView): string | null {
  if (sort === "score") return posting.score == null ? null : String(posting.score);
  if (sort === "pay") return posting.payAmount == null ? null : String(posting.payAmount);
  return (posting.sourcePostedAt ?? posting.firstSeenAt).toISOString();
}

async function fetchPostingsPage(params: {
  search: string;
  sort: PostingSortKey;
  board?: string;
  cursorValue: string | null;
  cursorId: string | null;
}): Promise<{ postings: PostingView[]; hasMore: boolean }> {
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
  /** The first page from the server component, so there's something on screen before any client fetch. */
  initialPostings: PostingView[];
  initialHasMore: boolean;
  /** Every New posting the owner has, not just what's loaded -- the list header's stable total. */
  newCount: number;
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
  const [sort, setSort] = useState<PostingSortKey>("score");
  const [search, setSearch] = useState("");
  const [showSetupStatus, setShowSetupStatus] = useState(false);
  const [items, setItems] = useState(initialPostings);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const skipNextReload = useRef(true);
  const requestId = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Search and sort both replace the whole list from the server. Skips its own first run: the initial render
  // already matches the default sort and an empty search, from the server component's own first page.
  useEffect(() => {
    if (skipNextReload.current) {
      skipNextReload.current = false;
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(
      () => {
        void fetchPostingsPage({ search, sort, board: boardFilter, cursorValue: null, cursorId: null }).then((page) => {
          if (requestId.current !== id) return; // a newer search/sort change already landed
          setItems(page.postings);
          setHasMore(page.hasMore);
        });
      },
      search ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [search, sort, boardFilter]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || items.length === 0) return;
    const last = items[items.length - 1]!;
    setLoadingMore(true);
    fetchPostingsPage({
      search,
      sort,
      board: boardFilter,
      cursorValue: cursorValueFor(sort, last),
      cursorId: last.id,
    })
      .then((page) => {
        setItems((prev) => [...prev, ...page.postings]);
        setHasMore(page.hasMore);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, items, search, sort, boardFilter]);

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
            <Overview effectiveRoles={effectiveRoles} preferences={preferences} checkStatus={checkStatus} />
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
