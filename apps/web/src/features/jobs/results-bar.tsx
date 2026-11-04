"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toaster";
import { activeFilterChips, clearFilterChip } from "@/features/jobs/active-filter-chips";
import type { JobPreferences } from "@/features/jobs/preferences-store";
import type { PostingSortKey as SortKey } from "@/features/jobs/store";
import { send } from "@/lib/api-client";

// Option C from docs/mockups/Jobs redesign.html, "New heading / Three directions": no page-wide heading, a bar
// over the card column that says what the filters did, with each active filter one click to drop.

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Best match" },
  { value: "newest", label: "Newest first" },
  { value: "pay", label: "Pay, high to low" },
];

export function ResultsBar({
  totalCount,
  hiddenCount,
  preferences,
  sort,
  onSortChange,
}: {
  /** Every posting the owner has, New and Filtered out together -- not just what search and sort currently
   *  show, so the header stays a stable total instead of changing as the owner types in Search. */
  totalCount: number;
  hiddenCount: number;
  preferences: JobPreferences;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
}) {
  const router = useRouter();
  const chips = activeFilterChips(preferences);

  async function dropChip(key: string) {
    try {
      await send("/api/jobs/preferences", "PUT", clearFilterChip(preferences, key));
      router.refresh();
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't save. Try again" });
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-2 px-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold">
          {totalCount} posting{totalCount === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort</span>
          <NativeSelect
            aria-label="Sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            className="h-8 w-44"
          >
            {SORT_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 py-0 pr-0.5">
              {chip.label}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Drop filter: ${chip.label}`}
                onClick={() => void dropChip(chip.key)}
                className="size-4 rounded-full"
              >
                ×
              </Button>
            </Badge>
          ))}
          {hiddenCount > 0 && <span className="text-xs text-muted-foreground">{hiddenCount} hidden by these</span>}
        </div>
      )}
    </div>
  );
}
