/** `ProfileExperience.start`/`end`: `YYYY-MM`, `YYYY` alone (January is assumed), or an empty `end` meaning
 *  Present (`@ken-os/domain`'s own `month()` validator). */
function monthIndex(value: string): number | null {
  if (!value) return null;
  const [year, month] = value.split("-");
  return Number(year) * 12 + (month ? Number(month) - 1 : 0);
}

/** How many whole years of experience the Profile shows, for comparing against a posting's stated
 *  `yearsRequired` (docs/product/job-finder.md's "Requirements" mismatch check). Spans earliest start to latest
 *  end (or `now`, for a still-ongoing role) rather than summing each role's own length, so two roles held at the
 *  same time aren't double counted. A role with no start date at all is skipped -- there's nothing to span. */
export function yearsOfExperience(experience: { start: string; end: string }[], now: Date = new Date()): number {
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const spans = experience
    .map((role) => ({ start: monthIndex(role.start), end: monthIndex(role.end) ?? nowIndex }))
    .filter((span): span is { start: number; end: number } => span.start !== null);
  if (spans.length === 0) return 0;

  const earliestStart = Math.min(...spans.map((span) => span.start));
  const latestEnd = Math.max(...spans.map((span) => span.end));
  return Math.floor((latestEnd - earliestStart) / 12);
}
