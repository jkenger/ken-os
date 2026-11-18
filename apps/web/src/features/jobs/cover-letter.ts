import { knownNumbers, type ProfileDetails } from "@ken-os/domain";
import type { CoverLetterFields } from "./store";

// Builds and stores a cover letter for one posting (docs/architecture/cover-letter.md). Dependencies are
// injected so this stays testable without a real AI call or database, same DI shape as `tailor.ts`'s
// `tailorResume`.

/** Whether `content` states a number the Profile doesn't contain anywhere -- reuses `knownNumbers` unchanged,
 *  same guardrail `rewrite.ts`'s `checkRewrite` already applies to rewrite suggestions. */
export function hasInventedNumber(content: string, profile: ProfileDetails): boolean {
  const known = knownNumbers(profile);
  const found = content.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return found.some((number) => !known.has(number));
}

/** Whether clicking Regenerate needs the owner's confirmation before overwriting the letter (docs/architecture/
 *  cover-letter.md, "UI: a Cover letter tab" and the POST route's own 409 check -- the same decision, applied on
 *  both sides). A letter never edited (`generatedAt === updatedAt`) always regenerates with no confirmation; an
 *  edited one needs confirming unless `force` is already set, which is the confirm dialog's own resubmit. */
export function needsRewriteConfirmation(params: { generatedAt: Date; updatedAt: Date; force: boolean }): boolean {
  const edited = params.updatedAt.getTime() > params.generatedAt.getTime();
  return edited && !params.force;
}

export async function writeCoverLetterForPosting(params: {
  userId: string;
  postingId: string;
  getProfile: (userId: string) => Promise<ProfileDetails>;
  getPosting: (
    userId: string,
    postingId: string,
  ) => Promise<{ title: string; company: string; whyFits: { reason: string; citation: string }[] } | null>;
  generate: (input: {
    profile: ProfileDetails;
    title: string;
    company: string;
    whyFits: { reason: string; citation: string }[];
  }) => Promise<{ content: string; promptVersion: string; model: string }>;
  save: (postingId: string, userId: string, fields: CoverLetterFields) => Promise<void>;
}): Promise<void> {
  const profile = await params.getProfile(params.userId);
  const posting = await params.getPosting(params.userId, params.postingId);
  if (!posting) throw new Error("Posting not found");

  // Nothing to write from -- fails before ever calling the AI (docs/architecture/cover-letter.md).
  if (posting.whyFits.length === 0) throw new Error("No reasons to write a cover letter from");

  const result = await params.generate({
    profile,
    title: posting.title,
    company: posting.company,
    whyFits: posting.whyFits,
  });

  // An invented number fails the whole generation, same bucket as an AI error or empty whyFits -- there's no
  // partial letter to fall back to the way `checkRewrite` falls back to dropping one bad suggestion.
  if (hasInventedNumber(result.content, profile)) throw new Error("Invented a number the profile doesn't have");

  // Save only after every check passes, so a failed generate/regenerate never touches an existing row.
  await params.save(params.postingId, params.userId, {
    content: result.content,
    promptVersion: result.promptVersion,
    model: result.model,
  });
}
