import type { ProfileDetails } from "@ken-os/domain";

/** Roles from the Profile headline and last two job titles (docs/product/job-finder.md). Blanks are dropped and
 *  a repeat between the headline and a title appears once, in order. */
export function deriveRoles(details: ProfileDetails): string[] {
  const candidates = [details.contact.headline, ...details.experience.slice(0, 2).map((item) => item.title)];
  const roles: string[] = [];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed && !roles.includes(trimmed)) roles.push(trimmed);
  }
  return roles;
}

/** What the owner copies into LinkedIn, Indeed and OnlineJobs when setting up alerts. */
export function alertKeywords(roles: string[]): string {
  return roles.map((role) => role.toLowerCase()).join(", ");
}
