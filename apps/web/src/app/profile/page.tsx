import { DOCX_MIME, type Artifact } from "@ken-os/domain";
import { getDriveFile } from "@ken-os/drive";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { getProfile } from "@/features/profile/store";
import { driveErrorText } from "@/lib/auth-errors";
import { DriveAccessError, getGoogleAccessToken, hasDriveConnection, type DriveAccess } from "@/lib/google";
import { getSelectedResume } from "@/lib/resume";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ drive_error?: string | string[] }> }) {
  const session = await requireSession("/profile");
  const { drive_error } = await searchParams;
  const [profile, selection, connected] = await Promise.all([getProfile(session.userId), getSelectedResume(session.userId), hasDriveConnection(session.userId)]);
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
      else error = "Couldn't reach Google Drive. Refresh to try again";
    }
  }
  const previewUrl =
    file && file.canDownload !== false
      ? file.mimeType === DOCX_MIME
        ? `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/preview`
        : "/api/resume/content"
      : null;
  return (
    <ProfileWorkspace
      email={session.email}
      profile={profile}
      drive={{
        access: drive,
        selection,
        file,
        error,
        notice: driveErrorText(Array.isArray(drive_error) ? drive_error[0] : drive_error),
        previewUrl,
        canImport: Boolean(file) && Boolean(process.env.OPENAI_API_KEY),
      }}
    />
  );
}
