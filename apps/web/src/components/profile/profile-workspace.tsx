"use client";

import { useState } from "react";
import { AlertCircle, FileDown } from "lucide-react";
import { mergeImport, type ProfileDetails } from "@ken-os/domain";
import { PageHeading } from "@/components/page-heading";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { ProfileState } from "@/features/profile/store";
import { send } from "@/lib/api-client";
import { shortDate } from "./dates";
import { DetailsForm } from "./details-form";
import { DriveFile, type DriveFileState } from "./drive-file";

// Profile: the owner's career details and the Drive resume they can be imported from. Spec: docs/product/profile-resume.md.

export function ProfileWorkspace({ email, profile, drive }: { email: string; profile: ProfileState; drive: DriveFileState }) {
  const [saved, setSaved] = useState(profile.details);
  const [savedAt, setSavedAt] = useState(profile.savedAt);
  const [details, setDetails] = useState(profile.details);
  /** Bumped when the whole form is replaced (import, discard), so fields that keep their own typing state reset. */
  const [formVersion, setFormVersion] = useState(0);
  /** The Drive import under review, until it's saved or discarded. */
  const [review, setReview] = useState<{ importId: string; fileName: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const changed = JSON.stringify(details) !== JSON.stringify(saved);
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
      const result = await send<{ importId: string; draft: ProfileDetails; fileName: string }>("/api/profile/import", "POST");
      replaceForm(mergeImport(details, result.draft));
      setReview({ importId: result.importId, fileName: result.fileName });
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
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
        <PageHeading kicker="Profile" title="Details" />

        <div className="flex flex-col gap-4">
          {review && <Alert><FileDown /><AlertTitle>Imported from {review.fileName}. Not saved yet</AlertTitle></Alert>}
          {problem && <Alert variant="destructive"><AlertCircle /><AlertTitle>{problem}</AlertTitle></Alert>}

          <DriveFile state={drive} importing={importing} onImport={importDrive} />
          <DetailsForm key={formVersion} details={details} edit={edit} />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-3 py-3 md:px-5">
          <span className="mr-auto text-sm text-muted-foreground">{changed || review ? "Unsaved changes" : savedAt ? `Saved ${shortDate(savedAt)}` : "Not saved"}</span>
          {(changed || review) && <Button type="button" variant="ghost" onClick={discard} disabled={saving}>Discard</Button>}
          <Button type="button" onClick={save} disabled={saving || !canSave}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </WorkspaceShell>
  );
}
