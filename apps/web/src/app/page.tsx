import { DOCX_MIME, GOOGLE_DOC_MIME, type Artifact } from "@ken-os/domain";
import { getDriveFile } from "@ken-os/drive";
import { ResumeWorkspace } from "@/components/resume-workspace";
import { getGoogleAccessToken } from "@/lib/google";
import { getSelectedResume } from "@/lib/resume";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="landing-shell">
        <div className="landing-grid">
          <div className="eyebrow">
            <span className="brand-mark">K</span> PRIVATE WORKSPACE
          </div>
          <div className="landing-copy">
            <p className="kicker">Your work, in one place</p>
            <h1>A home for the things you keep coming back to.</h1>
            <p className="lead">
              Ken OS starts with your resume. Select it once from Google Drive,
              then keep its latest version within reach.
            </p>
            <a className="primary-button" href="/api/auth/google">
              Continue with Google <span aria-hidden="true">↗</span>
            </a>
            <p className="fine-print">
              Private access for the configured owner.
            </p>
          </div>
          <div className="landing-art" aria-hidden="true">
            <div className="art-topline">
              <span>KEN OS</span>
              <span>01 / RESUME</span>
            </div>
            <div className="art-document">
              <div className="art-doc-label">PRIMARY RESUME</div>
              <div className="art-doc-title">
                Your latest work,
                <br />
                ready when you are.
              </div>
              <div className="art-rule" />
              <div className="art-line wide" />
              <div className="art-line" />
              <div className="art-line short" />
              <div className="art-rule lower" />
              <div className="art-line wide" />
              <div className="art-line" />
            </div>
            <div className="art-footer">
              CONNECTED TO GOOGLE DRIVE <span>● LIVE</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const selection = await getSelectedResume(session.userId);
  let file: Artifact | null = null;
  let error: string | null = null;
  if (selection) {
    try {
      file = await getDriveFile(
        selection.fileId,
        await getGoogleAccessToken(session.userId),
      );
      if (file.trashed) {
        file = null;
        error = "This file is in the trash. Choose another resume.";
      }
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "Could not reach Google Drive.";
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
      previewUrl={previewUrl}
      canAsk={
        file?.mimeType === GOOGLE_DOC_MIME &&
        Boolean(process.env.OPENAI_API_KEY)
      }
    />
  );
}
