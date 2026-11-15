"use client";

import { WorkspaceShell } from "@/components/workspace-shell";
import type { PostingView } from "@/features/jobs/store";
import { JobsTabs } from "./jobs-tabs";
import { PostingCard } from "./new-list";

// Job Board: every Saved/Applied posting, reusing the New list's own card component -- no new card markup
// (docs/architecture/job-board.md, "Job Board screen").

export function JobsBoardPage({
  email,
  postings,
  profileSkills,
  newCount,
}: {
  email: string;
  postings: PostingView[];
  profileSkills: string[];
  newCount: number;
}) {
  return (
    <WorkspaceShell email={email} active="jobs">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-7xl px-page py-page">
        <JobsTabs active="board" newCount={newCount} boardCount={postings.length} />
        <div className="flex max-w-3xl flex-col gap-3">
          {postings.map((posting, index) => (
            <PostingCard key={posting.id} posting={posting} profileSkills={profileSkills} index={index} onBoard />
          ))}
          {postings.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing saved or applied yet</p>}
        </div>
      </div>
    </WorkspaceShell>
  );
}
