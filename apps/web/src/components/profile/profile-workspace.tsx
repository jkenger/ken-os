"use client";

import { useState } from "react";
import { AlertCircle, FileDown } from "lucide-react";
import type { ProfileDetails } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeading } from "@/components/engineering/kit";
import { send } from "@/components/lab/topic/client";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { ProfileView } from "@/features/profile/store";
import { DetailsForm } from "./details-form";
import { DriveFile, type DriveFileState } from "./drive-file";

// Profile: the owner's career details and the Drive resume they can be imported from. Spec: docs/product/profile-resume.md.

const savedWords = (savedAt: string | null) => savedAt
  ? `Saved ${new Date(savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  : "Not saved";

export function ProfileWorkspace({ email, profile, drive }: { email: string; profile: ProfileView; drive: DriveFileState }) {
  const [saved, setSaved] = useState(profile.details);
  const [savedAt, setSavedAt] = useState(profile.savedAt);
  const [details, setDetails] = useState(profile.details);
  /** The Drive import under review, until it's saved or discarded. */
  const [review, setReview] = useState<{ importId: string; fileName: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const changed = JSON.stringify(details) !== JSON.stringify(saved);

  function edit(change: (draft: ProfileDetails) => void) {
    setDetails((current) => {
      const next = structuredClone(current);
      change(next);
      return next;
    });
  }

  async function importDrive() {
    setImporting(true);
    setProblem(null);
    try {
      const result = await send<{ importId: string; details: ProfileDetails; fileName: string }>("/api/profile/import", "POST");
      setDetails(result.details);
      setReview({ importId: result.importId, fileName: result.fileName });
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Import failed. Try again");
    } finally {
      setImporting(false);
    }
  }

  function discard() {
    setDetails(saved);
    setReview(null);
    setProblem(null);
  }

  async function save() {
    setSaving(true);
    setProblem(null);
    try {
      const result = await send<{ savedAt: string }>("/api/profile", "PUT", { details, importId: review?.importId ?? null });
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

  return (
    <WorkspaceShell email={email} active="profile">
      <div className="mx-auto max-w-5xl px-3 pb-24 pt-6 md:px-5 md:pt-7.5">
        <PageHeading kicker="Profile" title="Details" badge={changed ? "Unsaved" : savedWords(savedAt)} />

        <div className="flex flex-col gap-4">
          {review && (
            <Alert>
              <FileDown />
              <AlertTitle>Imported from {review.fileName}</AlertTitle>
              <AlertDescription>Review each section, then save</AlertDescription>
              <AlertAction><Button type="button" variant="outline" size="sm" onClick={discard}>Discard</Button></AlertAction>
            </Alert>
          )}
          {problem && <Alert variant="destructive"><AlertCircle /><AlertTitle>{problem}</AlertTitle></Alert>}

          <DriveFile state={drive} importing={importing} onImport={importDrive} />
          <DetailsForm details={details} edit={edit} />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-3 py-3 md:px-5">
          <span className="mr-auto text-sm text-muted-foreground">{changed ? "Unsaved changes" : savedWords(savedAt)}</span>
          {changed && <Button type="button" variant="ghost" onClick={discard} disabled={saving}>Discard</Button>}
          <Button type="button" onClick={save} disabled={saving || (!changed && savedAt !== null)}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </WorkspaceShell>
  );
}
