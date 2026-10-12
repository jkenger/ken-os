import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { importProfile, PROFILE_IMPORT_PROMPT_VERSION } from "@ken-os/agents";
import { emptyProfile, mergeImport, normalizeProfile, ProfileFieldError, type ProfileDetails } from "@ken-os/domain";
import { DriveError, getDriveFile, getResumeText } from "@ken-os/drive";
import { db } from "@/lib/db";
import { DriveAccessError, getGoogleAccessToken } from "@/lib/google";
import { getSelectedResume } from "@/lib/resume";
import { profileImports, profiles, users } from "@/lib/schema";

// The Profile: the owner's career details, typed in or imported from the Drive resume. Spec: docs/product/profile-resume.md.

export class ProfileInputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Below this many characters a file has no usable text, usually a scanned PDF. */
const MIN_RESUME_TEXT = 50;

export interface ProfileView {
  details: ProfileDetails;
  /** When the owner last saved. Null before the first save, when the details are only prefilled. */
  savedAt: string | null;
}

/** The saved Profile, or before the first save, an empty one prefilled with the name and email from sign-in. */
export async function getProfile(userId: string): Promise<ProfileView> {
  const [row] = await db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (row) return { details: normalizeProfile(row.details, "import"), savedAt: row.updatedAt.toISOString() };
  const [user] = await db().select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const details = emptyProfile();
  details.contact.fullName = user?.name ?? "";
  details.contact.email = user?.email ?? "";
  return { details, savedAt: null };
}

/** Saves what the owner typed. With an `importId`, it also marks that Drive import as applied. */
export async function saveProfile(userId: string, input: unknown, importId: string | null): Promise<{ savedAt: string }> {
  let details: ProfileDetails;
  try {
    details = normalizeProfile(input, "save");
  } catch (error) {
    if (error instanceof ProfileFieldError) throw new ProfileInputError(error.message);
    throw error;
  }
  const now = new Date();
  await db().transaction(async (tx) => {
    await tx.insert(profiles).values({ userId, details, updatedAt: now })
      .onConflictDoUpdate({ target: profiles.userId, set: { details, updatedAt: now } });
    if (importId) {
      await tx.update(profileImports).set({ status: "applied", appliedAt: now })
        .where(and(eq(profileImports.id, importId), eq(profileImports.userId, userId), eq(profileImports.status, "pending")));
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

/**
 * Reads the chosen Drive resume into a draft for review. Nothing in the Profile changes until the owner saves; the
 * draft is kept as a `pending` import with the file's Drive version.
 */
export async function importFromDrive(userId: string): Promise<{ importId: string; details: ProfileDetails; fileName: string }> {
  const { file, text } = await readChosenResume(userId);
  if (text.trim().length < MIN_RESUME_TEXT) throw new ProfileInputError("No text found in this file. Use a Google Doc or a text PDF", 422);

  const { draft, model } = await importProfile(text);
  const importId = randomUUID();
  await db().insert(profileImports).values({
    id: importId,
    userId,
    driveFileId: file.id,
    driveModifiedTime: file.modifiedTime ?? null,
    draft,
    promptVersion: PROFILE_IMPORT_PROMPT_VERSION,
    model,
  });
  const { details: saved } = await getProfile(userId);
  return { importId, details: mergeImport(saved, draft), fileName: file.name };
}
