import { randomUUID } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileImports, profileResumes, users } from "@/lib/schema";
import { checkResumeFile, RESUME_FILE_MAX_COUNT, ResumeFileError } from "./resume-files";

// Stored resume files, kept in Postgres. Spec: docs/product/profile-resume.md, "Step 5 design".

export interface ResumeFile {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  /** When an Autofill from this file was last saved into the details; null when none was. */
  appliedAt: string | null;
}

const listed = {
  id: profileResumes.id,
  fileName: profileResumes.fileName,
  contentType: profileResumes.contentType,
  size: profileResumes.size,
  uploadedAt: profileResumes.uploadedAt,
};

function shape(row: {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  appliedAt?: string | null;
}): ResumeFile {
  return { ...row, uploadedAt: row.uploadedAt.toISOString(), appliedAt: row.appliedAt ?? null };
}

/** Newest first, without the file bytes. */
export async function listResumeFiles(userId: string): Promise<ResumeFile[]> {
  const rows = await db()
    .select({
      ...listed,
      // Written out in full: Drizzle drops the table name from columns inside a select, which would point "id" at the
      // subquery's own table.
      appliedAt: sql<string | null>`(
        select to_char(max(pi.applied_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        from profile_imports pi where pi.resume_file_id = "profile_resumes"."id"
      )`,
    })
    .from(profileResumes)
    .where(eq(profileResumes.userId, userId))
    .orderBy(desc(profileResumes.uploadedAt));
  return rows.map(shape);
}

export async function addResumeFile(userId: string, name: string, bytes: Uint8Array): Promise<ResumeFile> {
  const { fileName, contentType } = checkResumeFile(name, bytes);
  return db().transaction(async (tx) => {
    // Locks the owner's row so two uploads at once can't both pass the count.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const [{ total }] = await tx
      .select({ total: count() })
      .from(profileResumes)
      .where(eq(profileResumes.userId, userId));
    if (total >= RESUME_FILE_MAX_COUNT)
      throw new ResumeFileError(`You can keep up to ${RESUME_FILE_MAX_COUNT} files. Delete one first`);
    const [row] = await tx
      .insert(profileResumes)
      .values({ id: randomUUID(), userId, fileName, contentType, size: bytes.byteLength, data: Buffer.from(bytes) })
      .returning(listed);
    return shape(row);
  });
}

/** One file with its bytes, only when it belongs to the owner asking. */
export async function getResumeFile(userId: string, id: string) {
  const [row] = await db()
    .select({ ...listed, data: profileResumes.data })
    .from(profileResumes)
    .where(and(eq(profileResumes.userId, userId), eq(profileResumes.id, id)))
    .limit(1);
  return row ?? null;
}

/** True when a file was deleted. */
export async function deleteResumeFile(userId: string, id: string): Promise<boolean> {
  const deleted = await db()
    .delete(profileResumes)
    .where(and(eq(profileResumes.userId, userId), eq(profileResumes.id, id)))
    .returning({ id: profileResumes.id });
  return deleted.length > 0;
}
