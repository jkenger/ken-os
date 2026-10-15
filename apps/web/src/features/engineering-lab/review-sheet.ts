import { z } from "zod";

// A topic's review sheet (docs/architecture/engineering-claude-first.md, section 9h): one structured sheet per topic,
// organised by its points, that Claude writes with save_review and replaces as the owner learns. Pure, so Claude's
// tools, the store, the page and the tests share the rules.

export const REVIEW_LIMITS = {
  points: 12,
  question: 200,
  explanation: 600,
  example: 1_500,
  mistake: 400,
  terms: 20,
  term: 80,
  meaning: 300,
} as const;

const text = (max: number) => z.string().trim().min(1).max(max);

export const reviewSheetInput = z
  .object({
    points: z
      .array(
        z
          .object({
            pointId: z
              .string()
              .regex(/^p[1-9][0-9]?$/, "Use the point ids from get_topic: p1, p2, …")
              .describe("The point this covers, from get_topic: p1, p2, …"),
            question: text(REVIEW_LIMITS.question).describe(
              "The point as a question the owner can test themselves on, such as 'What causes a re-render?'",
            ),
            explanation: text(REVIEW_LIMITS.explanation).describe("2 to 3 lines in plain language"),
            example: text(REVIEW_LIMITS.example).describe("One small code example"),
            mistake: text(REVIEW_LIMITS.mistake).describe(
              "The common mistake to avoid, ideally the one the owner actually made",
            ),
            ownMistake: z.boolean().default(false).describe("True when the owner made this mistake in a session"),
          })
          .strict(),
      )
      .min(1)
      .max(REVIEW_LIMITS.points),
    terms: z
      .array(
        z
          .object({
            term: text(REVIEW_LIMITS.term),
            meaning: text(REVIEW_LIMITS.meaning).describe("One line"),
          })
          .strict(),
      )
      .max(REVIEW_LIMITS.terms)
      .default([]),
  })
  .strict();

export type ReviewSheet = z.infer<typeof reviewSheetInput>;
export type ReviewPoint = ReviewSheet["points"][number];

const pointNumber = (pointId: string) => Number(pointId.slice(1));

/** Checks the sheet covers each of the topic's points exactly once, and returns it in point order. */
export function checkSheet(pointCount: number, sheet: ReviewSheet): ReviewSheet {
  const seen = new Set<string>();
  for (const item of sheet.points) {
    if (seen.has(item.pointId)) throw new Error(`${item.pointId} is in the sheet twice`);
    if (pointNumber(item.pointId) > pointCount)
      throw new Error(`The topic has ${pointCount} points; there is no ${item.pointId}`);
    seen.add(item.pointId);
  }
  const missing = Array.from({ length: pointCount }, (_, index) => `p${index + 1}`).filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`Cover every point. Missing: ${missing.join(", ")}`);
  return {
    ...sheet,
    points: [...sheet.points].sort((a, b) => pointNumber(a.pointId) - pointNumber(b.pointId)),
  };
}

export interface SearchEntry {
  topicId: string;
  title: string;
  sheet: ReviewSheet | null;
  notes: { id: string; body: string }[];
}

export interface SearchHit {
  topicId: string;
  title: string;
  where: "term" | "point" | "note";
  /** The term, the point id, or "Note". */
  label: string;
  text: string;
}

/** The shortest search; one letter matches nearly everything. */
export const SEARCH_MIN = 2;
const SEARCH_MAX_HITS = 50;
const order = { term: 0, point: 1, note: 2 } as const;

/** Finds a term across every review sheet and note, ignoring case: terms first, then points, then notes. */
export function searchReviews(entries: readonly SearchEntry[], query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < SEARCH_MIN) return [];
  const has = (...fields: string[]) => fields.some((field) => field.toLowerCase().includes(needle));
  const hits = entries.flatMap(({ topicId, title, sheet, notes }) => [
    ...(sheet?.terms ?? [])
      .filter((term) => has(term.term, term.meaning))
      .map((term) => ({ topicId, title, where: "term" as const, label: term.term, text: term.meaning })),
    ...(sheet?.points ?? [])
      .filter((item) => has(item.question, item.explanation, item.example, item.mistake))
      .map((item) => ({ topicId, title, where: "point" as const, label: item.pointId, text: item.question })),
    ...notes
      .filter((note) => has(note.body))
      .map((note) => ({ topicId, title, where: "note" as const, label: "Note", text: note.body })),
  ]);
  return hits.sort((a, b) => order[a.where] - order[b.where]).slice(0, SEARCH_MAX_HITS);
}
