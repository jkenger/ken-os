import { z } from "zod";

// The published portfolio snapshot: what Loots serves at /api/public/portfolio and the portfolio site reads.
// Spec: docs/architecture/portfolio.md. Add new sections as optional fields so an older site deploy keeps working.

export const PORTFOLIO_SNAPSHOT_VERSION = 1;

const link = z.object({ label: z.string(), url: z.string() });

export const portfolioProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  /** Only when the owner switched Show email on before Publish. */
  email: z.string().optional(),
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

/** How the public resume PDF prints: the template and paper chosen on the Resume page when Publish ran. */
export const portfolioResumeSchema = z.object({
  template: z.enum(["classic", "compact", "technical"]),
  paper: z.enum(["letter", "a4"]),
});

/** Claude's review sheet for a topic, as the site prints it. */
export const portfolioReviewSchema = z.object({
  points: z.array(
    z.object({ question: z.string(), explanation: z.string(), example: z.string(), mistake: z.string() }),
  ),
  terms: z.array(z.object({ term: z.string(), meaning: z.string() })),
});

export const portfolioTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["not_started", "in_progress", "learned", "skipped"]),
  /** When it was marked Learned; null otherwise. */
  learnedAt: z.string().nullable(),
  /** Claude's latest review sheet, when there is one. */
  review: portfolioReviewSchema.nullable(),
  /** The owner's own explanation, word for word. Only when switched on for this topic before Publish. */
  explanation: z.string().optional(),
});

/** The roadmaps the owner chose to show, in the order they were last opened. */
export const portfolioEngineeringSchema = z.object({
  roadmaps: z.array(
    z.object({
      goal: z.string(),
      counts: z.object({ learned: z.number(), inProgress: z.number(), total: z.number() }),
      chapters: z.array(z.object({ title: z.string(), area: z.string(), topics: z.array(portfolioTopicSchema) })),
    }),
  ),
});

export const portfolioSnapshotSchema = z.object({
  version: z.number().int().positive(),
  /** Which publication this is; goes up by one on every Publish. */
  publication: z.number().int().positive(),
  publishedAt: z.string(),
  profile: portfolioProfileSchema,
  /** Added after version 1 shipped, so snapshots published before it have none and print as Classic on Letter. */
  resume: portfolioResumeSchema.optional(),
  /** Added after version 1 shipped (spec step 3), so older snapshots have none. */
  engineering: portfolioEngineeringSchema.optional(),
});

export type PortfolioProfile = z.infer<typeof portfolioProfileSchema>;
export type PortfolioResume = z.infer<typeof portfolioResumeSchema>;
export type PortfolioReview = z.infer<typeof portfolioReviewSchema>;
export type PortfolioTopic = z.infer<typeof portfolioTopicSchema>;
export type PortfolioEngineering = z.infer<typeof portfolioEngineeringSchema>;
export type PortfolioSnapshot = z.infer<typeof portfolioSnapshotSchema>;

/** Checks a snapshot fetched from Loots. Unknown keys are dropped, so a newer Loots never breaks an older site. */
export function parsePortfolioSnapshot(value: unknown): PortfolioSnapshot {
  return portfolioSnapshotSchema.parse(value);
}
