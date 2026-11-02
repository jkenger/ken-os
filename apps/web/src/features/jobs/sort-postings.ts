export type SortKey = "score" | "newest" | "pay";

type Sortable = {
  score: number | null;
  payAmount: number | null;
  sourcePostedAt: Date | null;
  firstSeenAt: Date;
};

/** Orders the New list for the results bar's Sort control (docs/mockups/job-finder.md, "Redesign"). A posting
 *  missing the field being sorted on always sorts last, never thrown as a comparison error. Returns a new array;
 *  the input is never mutated. */
export function sortPostings<T extends Sortable>(postings: T[], sort: SortKey): T[] {
  const copy = [...postings];
  if (sort === "score") return copy.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  if (sort === "pay") return copy.sort((a, b) => (b.payAmount ?? -Infinity) - (a.payAmount ?? -Infinity));
  return copy.sort(
    (a, b) => (b.sourcePostedAt ?? b.firstSeenAt).getTime() - (a.sourcePostedAt ?? a.firstSeenAt).getTime(),
  );
}
