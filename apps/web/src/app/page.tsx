import { DOCX_MIME, GOOGLE_DOC_MIME, type Artifact } from "@ken-os/domain";
import { getDriveFile } from "@ken-os/drive";
import { ResumeWorkspace } from "@/components/resume-workspace";
import { driveErrorText } from "@/lib/auth-errors";
import { DriveAccessError, getGoogleAccessToken, hasDriveConnection, type DriveAccess } from "@/lib/google";
import { getSelectedResume } from "@/lib/resume";
import { requireSession } from "@/lib/session";
import { labSummary } from "@/features/engineering-lab/profile-store";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ drive_error?: string | string[] }> }) {
  const session = await requireSession("/");
  const { drive_error } = await searchParams;
  const [selection, connected] = await Promise.all([
    getSelectedResume(session.userId),
    hasDriveConnection(session.userId),
  ]);
  let drive: DriveAccess = connected ? "connected" : "not_connected";
  let file: Artifact | null = null;
  let error: string | null = null;
  if (selection && connected) {
    try {
      file = await getDriveFile(selection.fileId, await getGoogleAccessToken(session.userId));
      if (file.trashed) {
        file = null;
        error = "In Drive trash. Choose another file";
      }
    } catch (cause) {
      if (cause instanceof DriveAccessError) drive = cause.access;
      else error = cause instanceof Error ? cause.message : "Couldn't reach Google Drive. Refresh to try again";
    }
  }
  const previewUrl =
    file && file.canDownload !== false
      ? file.mimeType === DOCX_MIME
        ? `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/preview`
        : "/api/resume/content"
      : null;
  return (
    <ResumeWorkspace
      email={session.email}
      selection={selection}
      file={file}
      error={error}
      drive={drive}
      driveNotice={driveErrorText(Array.isArray(drive_error) ? drive_error[0] : drive_error)}
      previewUrl={previewUrl}
      canAsk={file?.mimeType === GOOGLE_DOC_MIME && Boolean(process.env.OPENAI_API_KEY)}
      labSummary={await labSummary(session.userId).catch(() => null)}
    />
  );
}
