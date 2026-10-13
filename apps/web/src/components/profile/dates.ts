/** A date as Profile screens show it, like "Oct 12". */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
