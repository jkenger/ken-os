"use client";

import { WorkspaceShell } from "@/components/workspace-shell";
import type { PostingView } from "@/features/jobs/store";
import { FilteredOutList } from "./filtered-out-list";

export function JobsFilteredOutPage({ email, postings }: { email: string; postings: PostingView[] }) {
  return (
    <WorkspaceShell email={email} active="jobs">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-5xl px-page pt-page pb-section">
        <h1 className="border-b pb-block font-heading text-2xl leading-tight font-semibold tracking-tight">
          Filtered out
        </h1>
        <div className="mt-6">
          <FilteredOutList postings={postings} />
        </div>
      </div>
    </WorkspaceShell>
  );
}
