"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, FileDown } from "lucide-react";
import { mergeImport, type ProfileDetails } from "@ken-os/domain";
import type { PortfolioProfile } from "@ken-os/portfolio";
import { DockedPanel, useDocked } from "@/components/docked-panel";
import { PageHeading } from "@/components/page-heading";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EngineeringLine } from "@/features/engineering-lab/roadmap-store";
import { engineering as engineeringRoutes } from "@/features/engineering-lab/routes";
import { toast } from "@/components/ui/toaster";
import { ledgerRows, type LedgerSectionId } from "@/features/profile/ledger";
import type { ResumeFile } from "@/features/profile/resume-files-store";
import type { ProfileState } from "@/features/profile/store";
import { send } from "@/lib/api-client";
import { shortDate } from "./dates";
import { DetailsForm } from "./details-form";
import { DriveFile, type DriveFileState } from "./drive-file";
import { LedgerList, PublicResumeBar, StateBadge } from "./profile-ledger";
import { ResumeFiles } from "./resume-files";
import { RewritePanel } from "./rewrite-panel";

// Profile: the owner's career details as a ledger of sections, each opening its form in the side panel, then the uploaded
// resumes. Spec: docs/product/profile-resume.md; layout: docs/mockups/profile.md, direction A.

/** What the live Portfolio holds, for the public resume bar and each section's Published or Changed state. */
export interface ProfilePublic {
  live: { version: number; publishedAt: string } | null;
  /** The live snapshot's profile; null when nothing is live. */
  profile: PortfolioProfile | null;
  showEmail: boolean;
}

/** One line per Engineering roadmap: the goal and how many topics are learned, linking to that roadmap. */
function EngineeringSummary({ roadmapId, headline, detail }: EngineeringLine) {
  return (
    <Link
      href={engineeringRoutes.roadmap(null, roadmapId)}
      className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle>{headline}</CardTitle>
          <CardDescription>Engineering · {detail}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

export function ProfileWorkspace({
  email,
  profile,
  drive,
  resumes,
  engineering,
  published,
}: {
  email: string;
  published: ProfilePublic;
  profile: ProfileState;
  drive: DriveFileState;
  /** Uploaded resume files, newest first. */
  resumes: ResumeFile[];
  /** The Engineering goal and progress, linking to the roadmap. Null when it couldn't load. */
  engineering: EngineeringLine[] | null;
}) {
  const [saved, setSaved] = useState(profile.details);
  const [savedAt, setSavedAt] = useState(profile.savedAt);
  const [details, setDetails] = useState(profile.details);
  /** Bumped when the whole form is replaced (import, discard), so fields that keep their own typing state and
   *  rewrite suggestions made for the old form reset. */
  const [formVersion, setFormVersion] = useState(0);
  /** The Drive import under review, until it's saved or discarded. */
  const [review, setReview] = useState<{ importId: string; fileName: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [opened, setOpened] = useState<LedgerSectionId | null>(null);
  const docked = useDocked();
  const rows = useMemo(
    () => ledgerRows(details, saved, published.profile, { showEmail: published.showEmail }),
    [details, saved, published],
  );
  const openRow = rows.find((row) => row.id === opened) ?? null;
  const changed = JSON.stringify(details) !== JSON.stringify(saved);
  const { fullName, headline, city, country } = saved.contact;
  // A reviewed import can always be saved, even when it matched what was there, so it's marked applied.
  const canSave = changed || savedAt === null || review !== null;

  function edit(change: (draft: ProfileDetails) => void) {
    setDetails((current) => {
      const next = structuredClone(current);
      change(next);
      return next;
    });
  }

  function replaceForm(next: ProfileDetails) {
    setDetails(next);
    setFormVersion((version) => version + 1);
  }

  async function importDrive() {
    setImporting(true);
    setProblem(null);
    try {
      const result = await send<{ importId: string; draft: ProfileDetails; fileName: string }>(
        "/api/profile/import",
        "POST",
      );
      replaceForm(mergeImport(details, result.draft));
      setReview({ importId: result.importId, fileName: result.fileName });
      setOpened("contact");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Import failed. Try again");
    } finally {
      setImporting(false);
    }
  }

  function discard() {
    replaceForm(saved);
    setReview(null);
    setProblem(null);
  }

  async function save() {
    setSaving(true);
    setProblem(null);
    try {
      const result = await send<{ savedAt: string }>("/api/profile", "PUT", {
        details,
        importId: review?.importId ?? null,
      });
      setSaved(details);
      setSavedAt(result.savedAt);
      setReview(null);
      toast({ tone: "success", title: "Profile saved" });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
    } finally {
      setSaving(false);
    }
  }

  const saveBar = (
    <div className="flex items-center justify-end gap-2 px-3 py-3 md:px-5">
      <span className="mr-auto text-sm text-muted-foreground">
        {changed || review ? "Unsaved changes" : savedAt ? `Saved ${shortDate(savedAt)}` : "Not saved"}
      </span>
      {(changed || review) && (
        <Button type="button" variant="ghost" onClick={discard} disabled={saving}>
          Discard
        </Button>
      )}
      <Button type="button" onClick={save} disabled={saving || !canSave}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );

  return (
    <WorkspaceShell email={email} active="profile">
      <div className="flex min-w-0 items-start">
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl px-3 pt-6 pb-24 md:px-5 md:pt-7.5">
            <PageHeading
              title="Profile"
              description={[fullName, headline, [city, country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
              facts={
                <>
                  <dt className="text-xs text-muted-foreground">Saved</dt>
                  <dd className="text-sm">{savedAt ? shortDate(savedAt) : "Not saved"}</dd>
                  <dt className="text-xs text-muted-foreground">Public</dt>
                  <dd className="text-sm">
                    {published.live
                      ? `Version ${published.live.version}, ${shortDate(published.live.publishedAt)}`
                      : "Not published"}
                  </dd>
                </>
              }
            />

            <div className="flex flex-col gap-5">
              {review && (
                <Alert>
                  <FileDown />
                  <AlertTitle>Imported from {review.fileName}. Not saved yet</AlertTitle>
                </Alert>
              )}
              {problem && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>{problem}</AlertTitle>
                </Alert>
              )}

              <PublicResumeBar live={published.live} changed={rows.filter((row) => row.publishChanges).length} />
              <LedgerList rows={rows} opened={opened} onOpen={setOpened} />
              <ResumeFiles initial={resumes} />
              {engineering?.map((line) => (
                <EngineeringSummary key={line.roadmapId ?? "path"} {...line} />
              ))}
              <DriveFile state={drive} importing={importing} onImport={importDrive} />
              <RewritePanel key={`rewrite-${formVersion}`} details={details} setDetails={setDetails} />
            </div>
          </div>
        </div>

        <DockedPanel
          open={openRow !== null}
          docked={docked}
          onClose={() => setOpened(null)}
          closeLabel="Close section"
          badges={openRow && <StateBadge state={openRow.state} />}
          title={openRow?.title ?? ""}
          descriptionFallback="Section details"
        >
          <DetailsForm key={formVersion} details={details} edit={edit} only={opened} />
          {/* As a sheet the panel covers the page's Save bar and its error, so it carries its own. */}
          {!docked && (
            <div className="sticky bottom-0 mt-auto border-t bg-background">
              {problem && (
                <Alert variant="destructive" className="mx-3 mt-3 w-auto md:mx-5">
                  <AlertCircle />
                  <AlertTitle>{problem}</AlertTitle>
                </Alert>
              )}
              {saveBar}
            </div>
          )}
        </DockedPanel>
      </div>

      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl">{saveBar}</div>
      </div>
    </WorkspaceShell>
  );
}
