import type { ProfileDetails } from "@ken-os/domain";

/** Roles from the Profile headline and last two job titles (docs/product/job-finder.md). Each candidate is split
 *  on "·" first -- a headline written as "Full-stack Engineer · React / Next.js / TypeScript · Production Web
 *  Applications" is the owner's own phrase separator, not one literal role, and searching freehire with the
 *  whole compound string verbatim is both a worse search and an unreadable chip. A candidate with no "·" splits
 *  into exactly itself, so a plain job title is unaffected. Blanks are dropped and a repeat appears once, in
 *  order. */
export function deriveRoles(details: ProfileDetails): string[] {
  const candidates = [details.contact.headline, ...details.experience.slice(0, 2).map((item) => item.title)];
  const roles: string[] = [];
  for (const candidate of candidates) {
    for (const segment of candidate.split("·")) {
      const trimmed = segment.trim();
      if (trimmed && !roles.includes(trimmed)) roles.push(trimmed);
    }
  }
  return roles;
}
