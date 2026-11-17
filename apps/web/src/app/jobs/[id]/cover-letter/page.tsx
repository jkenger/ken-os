import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { BackToJobsLink } from "@/features/jobs/back-to-jobs-link";
import { CoverLetterView } from "@/features/jobs/cover-letter-view";
import { getCoverLetter, getPosting } from "@/features/jobs/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** The cover letter's own page, a sibling to the posting detail page, not inline in its panel
 *  (docs/architecture/cover-letter.md). */
export default async function CoverLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(`/jobs/${id}/cover-letter`);
  const [posting, letter] = await Promise.all([getPosting(session.userId, id), getCoverLetter(session.userId, id)]);
  if (!posting) notFound();

  return (
    <WorkspaceShell email={session.email} active="jobs" extraCrumb={`${posting.title} · Cover letter`}>
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-3xl px-page pt-page pb-section">
        <BackToJobsLink />
        <div className="mb-6 grid gap-1">
          <h1 className="text-2xl font-semibold">Cover letter</h1>
          <p className="text-sm text-muted-foreground">
            {posting.title} &middot; {posting.company}
          </p>
        </div>
        <CoverLetterView postingId={posting.id} initialContent={letter?.content ?? null} />
      </div>
    </WorkspaceShell>
  );
}
