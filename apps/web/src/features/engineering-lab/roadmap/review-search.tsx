"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { IconSearch } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SEARCH_MIN, type SearchHit } from "@/features/engineering-lab/review-sheet";

// Search across every review sheet and note by term (docs/architecture/engineering-claude-first.md, section 9h). A hit
// opens its topic on the Review tab.

const groups: { where: SearchHit["where"]; heading: string }[] = [
  { where: "term", heading: "Terms" },
  { where: "point", heading: "Points" },
  { where: "note", heading: "Notes" },
];

async function searchReviews(term: string): Promise<SearchHit[]> {
  const response = await fetch(`/api/lab/reviews/search?q=${encodeURIComponent(term)}`);
  const body = (await response.json().catch(() => ({}))) as { hits?: SearchHit[]; error?: string };
  if (!response.ok) throw new Error(body.error ?? "Couldn't search. Try again");
  return body.hits ?? [];
}

/** `null` under the minimum term length -- SWR fetches nothing until there's enough to search. Caching here means
 *  retyping a term already searched this session (backspace then retype, or reopening the dialog) shows results
 *  instantly instead of hitting the server again. */
function searchKey(term: string) {
  return term.length >= SEARCH_MIN ? { scope: "review-search" as const, term } : null;
}

export function ReviewSearch({ onOpen }: { onOpen: (topicId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTerm(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: hits = [], error } = useSWR(searchKey(debouncedTerm), (key) => searchReviews(key.term), {
    keepPreviousData: true,
  });
  const problem = error instanceof Error ? error.message : error ? "Couldn't search. Try again" : "";

  const searched = debouncedTerm.length >= SEARCH_MIN;
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Search reviews"
            onClick={() => setOpen(true)}
          >
            <IconSearch aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Search reviews</TooltipContent>
      </Tooltip>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search reviews"
        description="Terms, points and notes across every topic"
      >
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="updater function" />
          <CommandList>
            {problem && <p className="p-4 text-sm text-destructive">{problem}</p>}
            {searched && !problem && <CommandEmpty>No matches</CommandEmpty>}
            {groups.map(({ where, heading }) => {
              const matching = hits.filter((hit) => hit.where === where);
              if (!matching.length) return null;
              return (
                <CommandGroup key={where} heading={heading}>
                  {matching.map((hit, index) => (
                    <CommandItem
                      key={`${hit.topicId}-${hit.label}-${index}`}
                      value={`${where}-${hit.topicId}-${hit.label}-${index}`}
                      onSelect={() => {
                        setOpen(false);
                        onOpen(hit.topicId);
                      }}
                      className="flex-col items-start gap-0.5"
                    >
                      <span className="text-sm font-medium">
                        {where === "point" ? `${hit.title} · ${hit.text}` : `${hit.label} · ${hit.title}`}
                      </span>
                      {where !== "point" && (
                        <span className="line-clamp-2 text-xs text-muted-foreground">{hit.text}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
