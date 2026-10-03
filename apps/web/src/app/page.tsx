import { DOCX_MIME, GOOGLE_DOC_MIME, type Artifact } from "@ken-os/domain";
import { getDriveFile } from "@ken-os/drive";
import { ResumeWorkspace } from "@/components/resume-workspace";
import { getGoogleAccessToken } from "@/lib/google";
import { getSelectedResume } from "@/lib/resume";
import { getSession } from "@/lib/session";
import { labSummary } from "@/features/engineering-lab/profile-store";
import { ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="min-h-screen bg-[#f5f3ef] p-3 sm:p-8">
        <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-7xl overflow-hidden rounded-2xl border border-border bg-background shadow-sm sm:min-h-[calc(100vh-64px)] lg:grid-cols-2">
          <div className="flex flex-col px-6 py-7 sm:px-12 sm:py-10 lg:px-16">
            <div className="flex items-center gap-3 font-display text-xl font-bold tracking-[-0.05em]"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">K</span>ken.os</div>
            <div className="my-auto max-w-xl py-24">
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Your work, in one place</p>
              <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-[-0.06em] sm:text-6xl">A home for the things you keep coming back to.</h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">Ken OS starts with your resume. Select it once from Google Drive, then keep its latest version within reach.</p>
              <Button asChild size="lg" className="mt-8 h-11 px-5"><a href="/api/auth/google">Continue with Google <ArrowUpRight size={16} /></a></Button>
              <p className="mt-4 text-xs text-muted-foreground">Private access for the configured owner.</p>
            </div>
          </div>
          <div className="flex flex-col justify-between bg-primary p-8 text-primary-foreground sm:p-12 lg:m-3 lg:rounded-xl">
            <div className="flex justify-between text-[11px] font-bold tracking-[0.16em] text-primary-foreground/60"><span>KEN OS</span><span>01 / RESUME</span></div>
            <div className="max-w-md py-20"><FileText size={34} strokeWidth={1.3} className="mb-10 text-primary-foreground/70" /><p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-primary-foreground/60">PRIMARY RESUME</p><h2 className="font-display text-4xl font-medium leading-tight tracking-[-0.05em] sm:text-5xl">Your latest work, ready when you are.</h2><p className="mt-6 max-w-sm text-sm leading-6 text-primary-foreground/60">One selected source file. Always connected to its current version.</p></div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-primary-foreground/60">CONNECTED TO GOOGLE DRIVE</p>
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
      labSummary={await labSummary(session.userId).catch(() => null)}
    />
  );
}
