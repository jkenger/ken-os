"use client";

import { WorkspaceShell } from "@/components/workspace-shell";
import type { PostingView } from "@/features/jobs/store";
import { PostingCard } from "./new-list";

// Job Board: every Saved/Applied posting, reusing the New list's own card component -- no new card markup
// (docs/architecture/job-board.md, "Job Board screen").

export function JobsBoardPage({
  email,
  postings,
  profileSkills,
}: {
  email: string;
  postings: PostingView[];
  profileSkills: string[];
}) {
  return (
    <WorkspaceShell email={email} active="jobs">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-5xl px-page pt-page pb-section">
        <h1 className="border-b pb-block font-heading text-2xl leading-tight font-semibold tracking-tight">
          Job board
        </h1>
        <div className="mt-6 flex flex-col gap-3">
          {postings.map((posting, index) => (
            <PostingCard key={posting.id} posting={posting} profileSkills={profileSkills} index={index} />
          ))}
          {postings.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing saved or applied yet</p>}
        </div>
      </div>
    </WorkspaceShell>
  );
}
