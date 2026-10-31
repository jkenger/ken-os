"use client";

import { WorkspaceShell } from "@/components/workspace-shell";
import type { PostingView } from "@/features/jobs/store";
import { NewList } from "./new-list";
import { SetupChecklist } from "./setup-checklist";

/** New postings, once any have arrived. Until then, the setup checklist (docs/product/job-finder.md). */
export function JobsPage({
  email,
  forwardingAddress,
  postings,
}: {
  email: string;
  forwardingAddress: string | undefined;
  postings: PostingView[];
}) {
  return (
    <WorkspaceShell email={email} active="jobs">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-5xl px-page pt-page pb-section">
        <h1 className="border-b pb-block font-heading text-2xl leading-tight font-semibold tracking-tight">Jobs</h1>
        {postings.length > 0 ? (
          <div className="mt-6">
            <NewList postings={postings} />
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">No postings yet</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Postings show up here once LinkedIn, Indeed or OnlineJobs send an alert. Finish setup to start receiving
                them.
              </p>
            </div>
            <div className="mt-6">
              <SetupChecklist forwardingAddress={forwardingAddress} />
            </div>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
