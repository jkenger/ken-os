import { z } from "zod";

// A topic's Build done outside a Loots exercise run: Claude reviewed the owner's code from a real app (or from a Loots
// exercise) and reports it with report_progress, passing the final code word for word as evidence. A passing exercise
// run still ticks Build on its own. Pure, so Claude's tools, the store, the page and the tests share the rules.

export const BUILD_PLACES = ["real-app", "loots-exercise"] as const;
export type BuildPlace = (typeof BUILD_PLACES)[number];

export const BUILD_LIMITS = { files: 10, path: 200, contents: 20_000, note: 500 } as const;

export const buildInput = z
  .object({
    where: z
      .enum(BUILD_PLACES)
      .describe("real-app: the owner built it in their own project. loots-exercise: in a Loots exercise"),
    evidence: z
      .array(
        z
          .object({
            path: z.string().trim().min(1).max(BUILD_LIMITS.path).describe("The file's path, such as app/api/route.ts"),
            contents: z
              .string()
              .max(BUILD_LIMITS.contents)
              .refine((value) => value.trim().length > 0, "Paste the file's code")
              .describe("The owner's final code for the file, copied word for word from what they pasted"),
          })
          .strict(),
      )
      .min(1, "Build needs evidence: the owner's final code, at least one file")
      .max(BUILD_LIMITS.files),
    note: z
      .string()
      .trim()
      .min(1)
      .max(BUILD_LIMITS.note)
      .describe("What went wrong along the way and how it got fixed, in one or two lines"),
  })
  .strict();

export type BuildEvidence = z.infer<typeof buildInput>;
