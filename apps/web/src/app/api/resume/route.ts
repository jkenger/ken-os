import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { isResumeMimeType } from "@ken-os/domain";
import { getDriveFile, DriveError } from "@ken-os/drive";
import { db } from "@/lib/db";
import { getGoogleAccessToken } from "@/lib/google";
import { hasValidOrigin } from "@/lib/origin";
import { getSelectedResume } from "@/lib/resume";
import { getSession } from "@/lib/session";
import { artifactSelections } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const selection = await getSelectedResume(session.userId);
  if (!selection) return NextResponse.json({ selection: null });
  try {
    const file = await getDriveFile(selection.fileId, await getGoogleAccessToken(session.userId));
    return NextResponse.json({ selection, file }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof DriveError ? error.status : 502;
    return NextResponse.json({ selection, file: null, error: error instanceof Error ? error.message : "Could not refresh resume." }, { status });
  }
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = await request.json().catch(() => null) as { fileId?: unknown } | null;
  const fileId = input?.fileId;
  if (typeof fileId !== "string" || !/^[A-Za-z0-9_-]{5,256}$/.test(fileId)) {
    return NextResponse.json({ error: "Invalid Drive file ID." }, { status: 400 });
  }
  try {
    const file = await getDriveFile(fileId, await getGoogleAccessToken(session.userId));
    if (file.trashed) return NextResponse.json({ error: "That file is in the trash." }, { status: 400 });
    if (!isResumeMimeType(file.mimeType)) return NextResponse.json({ error: "Select a Google Doc, PDF, or DOCX file." }, { status: 400 });
    await db().insert(artifactSelections).values({
      userId: session.userId,
      purpose: "primary_resume",
      provider: "google_drive",
      externalId: file.id,
      name: file.name,
      mimeType: file.mimeType,
    }).onConflictDoUpdate({
      target: [artifactSelections.userId, artifactSelections.purpose],
      set: {
        externalId: file.id,
        name: file.name,
        mimeType: file.mimeType,
        updatedAt: sql`now()`,
      },
    });
    return NextResponse.json({ file });
  } catch (error) {
    const status = error instanceof DriveError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not select resume." }, { status });
  }
}
