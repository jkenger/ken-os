import { z } from "zod";

// The published portfolio snapshot: what Loots serves at /api/public/portfolio and the portfolio site reads.
// Spec: docs/architecture/portfolio.md. Add new sections as optional fields so an older site deploy keeps working.

export const PORTFOLIO_SNAPSHOT_VERSION = 1;

const link = z.object({ label: z.string(), url: z.string() });

export const portfolioProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  /** City and country, never a street address. */
  location: z.string(),
  summary: z.string(),
  links: z.array(link),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string(),
      /** `YYYY-MM` or `YYYY`; an empty `end` means Present. */
      start: z.string(),
      end: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({ school: z.string(), degree: z.string(), field: z.string(), start: z.string(), end: z.string() }),
  ),
  skills: z.array(z.object({ name: z.string(), items: z.array(z.string()) })),
  projects: z.array(
    z.object({ name: z.string(), link: z.string(), description: z.string(), bullets: z.array(z.string()) }),
  ),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string(), date: z.string() })),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
});

export const portfolioSnapshotSchema = z.object({
  version: z.number().int().positive(),
  /** Which publication this is; goes up by one on every Publish. */
  publication: z.number().int().positive(),
  publishedAt: z.string(),
  profile: portfolioProfileSchema,
});

export type PortfolioProfile = z.infer<typeof portfolioProfileSchema>;
export type PortfolioSnapshot = z.infer<typeof portfolioSnapshotSchema>;

/** Checks a snapshot fetched from Loots. Unknown keys are dropped, so a newer Loots never breaks an older site. */
export function parsePortfolioSnapshot(value: unknown): PortfolioSnapshot {
  return portfolioSnapshotSchema.parse(value);
}
