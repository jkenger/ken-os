import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { artifactSelections } from "./schema";

export interface ResumeSelection {
  fileId: string;
  name: string;
  mimeType: string;
  selectedAt: string;
}

export async function getSelectedResume(userId: string): Promise<ResumeSelection | null> {
  const rows = await db()
    .select({
      fileId: artifactSelections.externalId,
      name: artifactSelections.name,
      mimeType: artifactSelections.mimeType,
      selectedAt: artifactSelections.updatedAt,
    })
    .from(artifactSelections)
    .where(and(eq(artifactSelections.userId, userId), eq(artifactSelections.purpose, "primary_resume")))
    .limit(1);
  if (!rows[0]) return null;
  return {
    fileId: rows[0].fileId,
    name: rows[0].name,
    mimeType: rows[0].mimeType,
    selectedAt: rows[0].selectedAt.toISOString(),
  };
}
