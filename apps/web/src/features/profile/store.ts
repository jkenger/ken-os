import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  AutofillError,
  autofillProfile,
  PROFILE_AUTOFILL_PROMPT_VERSION,
  PROFILE_REWRITE_PROMPT_VERSION,
  rewriteProfile,
} from "@ken-os/agents";
import {
  emptyProfile,
  PDF_MIME,
  isPaperSize,
  isResumeTemplate,
  normalizeProfile,
  ProfileFieldError,
  REWRITE_TARGET_ROLE_MAX,
  type RewriteSuggestion,
  type PaperSize,
  type ProfileDetails,
  type ResumeTemplate,
} from "@ken-os/domain";
import mammoth from "mammoth";
import { db } from "@/lib/db";
import { profileImports, profileRewrites, profiles, users } from "@/lib/schema";
import { getResumeFile } from "./resume-files-store";

// The Profile: the owner's career details, typed in or autofilled from an uploaded resume. Spec: docs/product/profile-resume.md.

export class ProfileInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Below this many characters a Word file has no usable text. */
const MIN_RESUME_TEXT = 50;

export interface ProfileState {
  details: ProfileDetails;
  /** When the owner last saved. Null before the first save, when the details are only prefilled. */
  savedAt: string | null;
  /** The template and paper size last chosen on the Resume page. */
  resume: ResumeSettings;
}

export interface ResumeSettings {
  template: ResumeTemplate;
  paper: PaperSize;
}

const DEFAULT_RESUME: ResumeSettings = { template: "classic", paper: "letter" };

/** The saved Profile, or before the first save, an empty one prefilled with the name and email from sign-in. */
export async function getProfile(userId: string): Promise<ProfileState> {
  const [row] = await db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (row) {
    return {
      details: normalizeProfile(row.details, "import"),
      savedAt: row.updatedAt.toISOString(),
      resume: {
        template: isResumeTemplate(row.template) ? row.template : DEFAULT_RESUME.template,
        paper: isPaperSize(row.paper) ? row.paper : DEFAULT_RESUME.paper,
      },
    };
  }
  const [user] = await db()
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const details = emptyProfile();
  details.contact.fullName = user?.name ?? "";
  details.contact.email = user?.email ?? "";
  return { details, savedAt: null, resume: DEFAULT_RESUME };
}

/** Saves what the owner typed. With an `importId`, it also marks that Autofill as applied. */
export async function saveProfile(
  userId: string,
  input: unknown,
  importId: string | null,
): Promise<{ savedAt: string }> {
  const details = formDetails(input);
  const now = new Date();
  await db().transaction(async (tx) => {
    await tx
      .insert(profiles)
      .values({ userId, details, updatedAt: now })
      .onConflictDoUpdate({ target: profiles.userId, set: { details, updatedAt: now } });
    if (importId) {
      await tx
        .update(profileImports)
        .set({ status: "applied", appliedAt: now })
        .where(
          and(eq(profileImports.id, importId), eq(profileImports.userId, userId), eq(profileImports.status, "pending")),
        );
    }
  });
  return { savedAt: now.toISOString() };
}

/** Remembers the Resume page's template and paper size. Needs saved details, since there's nothing to print before. */
export async function saveResumeSettings(userId: string, input: Record<string, unknown>): Promise<ResumeSettings> {
  const { template, paper } = input;
  if (!isResumeTemplate(template)) throw new ProfileInputError("Choose a template");
  if (!isPaperSize(paper)) throw new ProfileInputError("Choose Letter or A4");
  const updated = await db()
    .update(profiles)
    .set({ template, paper })
    .where(eq(profiles.userId, userId))
    .returning({ userId: profiles.userId });
  if (!updated.length) throw new ProfileInputError("No details saved. Save them first", 409);
  return { template, paper };
}

/** Checks details sent from the form, which may hold edits not saved yet, and names the field that's wrong. */
function formDetails(input: unknown): ProfileDetails {
  try {
    return normalizeProfile(input, "save");
  } catch (error) {
    if (error instanceof ProfileFieldError) throw new ProfileInputError(error.message);
    throw error;
  }
}

/**
 * Suggests a better summary and bullets for the form as it is now, unsaved edits included. Nothing changes until the
 * owner accepts suggestions and saves; the run is kept with its prompt version.
 */
export async function rewriteFromForm(
  userId: string,
  input: Record<string, unknown>,
): Promise<{ rewriteId: string; suggestions: RewriteSuggestion[] }> {
  const details = formDetails(input.details);
  const targetRole = typeof input.targetRole === "string" ? input.targetRole.trim() : "";
  if (targetRole.length > REWRITE_TARGET_ROLE_MAX)
    throw new ProfileInputError(`Target role: up to ${REWRITE_TARGET_ROLE_MAX} characters`);
  if (!details.experience.length && !details.projects.length)
    throw new ProfileInputError("Add experience or a project first", 422);

  const { suggestions, model } = await rewriteProfile(details, targetRole);
  const rewriteId = randomUUID();
  await db()
    .insert(profileRewrites)
    .values({ id: rewriteId, userId, targetRole, suggestions, promptVersion: PROFILE_REWRITE_PROMPT_VERSION, model });
  return { rewriteId, suggestions };
}

/**
 * Reads an uploaded resume into a draft with Claude. Nothing changes until the owner saves: the
 * draft is kept as a `pending` import and the page shows what it would change, field by field. A PDF goes to Claude as
 * is; a Word file goes as its text.
 */
export async function autofillFromResume(
  userId: string,
  fileId: string,
): Promise<{ importId: string; draft: ProfileDetails; fileName: string }> {
  const file = await getResumeFile(userId, fileId);
  if (!file) throw new ProfileInputError("File not found", 404);
  let source: { pdf: Uint8Array } | { text: string };
  if (file.contentType === PDF_MIME) source = { pdf: new Uint8Array(file.data) };
  else {
    const value = await mammoth
      .extractRawText({ buffer: Buffer.from(file.data) })
      .then((result) => result.value)
      .catch(() => {
        throw new ProfileInputError("Couldn't read this Word file. Try saving it again or upload a PDF", 422);
      });
    if (value.trim().length < MIN_RESUME_TEXT) throw new ProfileInputError("No text found in this file", 422);
    source = { text: value };
  }

  let result: Awaited<ReturnType<typeof autofillProfile>>;
  try {
    result = await autofillProfile(source);
  } catch (error) {
    if (error instanceof AutofillError) throw new ProfileInputError(error.message, 422);
    throw error;
  }
  const importId = randomUUID();
  await db()
    .insert(profileImports)
    .values({
      id: importId,
      userId,
      // Null when the file was deleted while Claude read it, so the draft still lands.
      resumeFileId: sql`(select id from profile_resumes where id = ${file.id})`,
      draft: result.draft,
      promptVersion: PROFILE_AUTOFILL_PROMPT_VERSION,
      model: result.model,
    });
  return { importId, draft: result.draft, fileName: file.fileName };
}
