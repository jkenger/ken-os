import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { importProfile, PROFILE_IMPORT_PROMPT_VERSION } from "@ken-os/agents";
import {
  emptyProfile,
  isPaperSize,
  isResumeTemplate,
  normalizeProfile,
  ProfileFieldError,
  type PaperSize,
  type ProfileDetails,
  type ResumeTemplate,
} from "@ken-os/domain";
import { DriveError, getDriveFile, getResumeText } from "@ken-os/drive";
import { db } from "@/lib/db";
import { DriveAccessError, getGoogleAccessToken } from "@/lib/google";
import { getSelectedResume } from "@/lib/resume";
import { profileImports, profiles, users } from "@/lib/schema";

// The Profile: the owner's career details, typed in or imported from the Drive resume. Spec: docs/product/profile-resume.md.

export class ProfileInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Below this many characters a file has no usable text, usually a scanned PDF. */
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

/** Saves what the owner typed. With an `importId`, it also marks that Drive import as applied. */
export async function saveProfile(
  userId: string,
  input: unknown,
  importId: string | null,
): Promise<{ savedAt: string }> {
  let details: ProfileDetails;
  try {
    details = normalizeProfile(input, "save");
  } catch (error) {
    if (error instanceof ProfileFieldError) throw new ProfileInputError(error.message);
    throw error;
  }
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

async function readChosenResume(userId: string) {
  const selection = await getSelectedResume(userId);
  if (!selection) throw new ProfileInputError("No resume chosen. Choose one from Drive first");
  try {
    const token = await getGoogleAccessToken(userId);
    const file = await getDriveFile(selection.fileId, token);
    if (file.trashed) throw new ProfileInputError("In Drive trash. Choose another file");
    return { file, text: await getResumeText(file, token) };
  } catch (error) {
    if (error instanceof DriveAccessError) throw new ProfileInputError("Google Drive disconnected. Reconnect it", 409);
    if (error instanceof DriveError) throw new ProfileInputError("Couldn't open the Drive file. Choose it again", 409);
    throw error;
  }
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

/**
 * Reads the chosen Drive resume into a draft for review. Nothing in the Profile changes until the owner saves; the
 * draft is kept as a `pending` import with the file's Drive version. The page lays it over the form with `mergeImport`,
 * so edits not saved yet survive.
 */
export async function importFromDrive(
  userId: string,
): Promise<{ importId: string; draft: ProfileDetails; fileName: string }> {
  const { file, text } = await readChosenResume(userId);
  if (text.trim().length < MIN_RESUME_TEXT)
    throw new ProfileInputError("No text found in this file. Use a Google Doc or a text PDF", 422);

  const { draft, model } = await importProfile(text);
  const importId = randomUUID();
  await db()
    .insert(profileImports)
    .values({
      id: importId,
      userId,
      driveFileId: file.id,
      driveModifiedTime: file.modifiedTime ?? null,
      draft,
      promptVersion: PROFILE_IMPORT_PROMPT_VERSION,
      model,
    });
  return { importId, draft, fileName: file.name };
}
