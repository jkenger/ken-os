"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, FileDown } from "lucide-react";
import { IconChevronRight, IconFlask, IconMapPin } from "@tabler/icons-react";
import { mergeImport, type ProfileDetails } from "@ken-os/domain";
import type { PortfolioProfile } from "@ken-os/portfolio";
import { DockedPanel, useDocked } from "@/components/docked-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { EngineeringLine } from "@/features/engineering-lab/roadmap-store";
import { engineering as engineeringRoutes } from "@/features/engineering-lab/routes";
import { toast } from "@/components/ui/toaster";
import { panel } from "@/components/surfaces";
import { isLedgerSection, ledgerRows, type LedgerSectionId } from "@/features/profile/ledger";
import type { ResumeFile } from "@/features/profile/resume-files-store";
import type { ProfileState } from "@/features/profile/store";
import { send } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";
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
      aria-label={`Engineering, ${headline}, ${detail}`}
      className={cn(
        panel,
        "flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <IconFlask size={18} aria-hidden="true" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{headline}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <IconChevronRight size={14} aria-hidden="true" className="text-muted-foreground" />
    </Link>
  );
}

/** The page head from the Ledger mockup: the title over who the Profile is, and the Saved and Public facts beside it. */
function ProfileHeading({
  fullName,
  headline,
  place,
  savedAt,
  live,
}: {
  fullName: string;
  headline: string;
  place: string;
  savedAt: string | null;
  live: ProfilePublic["live"];
}) {
  return (
    <div className="block items-end justify-between gap-6 md:flex">
      <div className="min-w-0">
        <h1 className="font-heading text-3xl leading-none font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-muted-foreground">
          {fullName && <span>{fullName}</span>}
          {headline && <span>{headline}</span>}
          {place && (
            <span className="inline-flex items-center gap-1.25">
              <IconMapPin size={14} aria-hidden="true" />
              {place}
            </span>
          )}
        </p>
      </div>
      <dl className="mt-3.5 grid shrink-0 grid-cols-[auto_auto] justify-start gap-x-3.5 gap-y-1 text-sm md:mt-0">
        <dt className="text-muted-foreground">Saved</dt>
        <dd>{savedAt ? shortDate(savedAt) : "Not saved"}</dd>
        <dt className="text-muted-foreground">Public</dt>
        <dd>{live ? `Version ${live.version}, ${shortDate(live.publishedAt)}` : "Not published"}</dd>
      </dl>
    </div>
  );
}

export function ProfileWorkspace({
  email,
  profile,
  drive,
  resumes,
  engineering,
  published,
  initialSection = null,
}: {
  email: string;
  /** The section open on load, from `?section=`, so a refresh or a shared link keeps it. */
  initialSection?: LedgerSectionId | null;
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
  const [opened, setOpened] = useState<LedgerSectionId | null>(initialSection);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [files, setFiles] = useState(resumes);
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

  // The open section lives in `?section=`: opening one adds a history entry, so Back closes the panel (the phone's
  // sheet above all) instead of leaving Profile, and a refresh reopens it. Only the address changes; no navigation.
  const openSection = useCallback((id: LedgerSectionId) => {
    const url = new URL(window.location.href);
    const wasOpen = url.searchParams.has("section");
    url.searchParams.set("section", id);
    // Our own state object, never a copy of Next's: Next skips syncing its router for a state that carries its markers.
    if (wasOpen) window.history.replaceState({ profileSection: window.history.state?.profileSection }, "", url);
    else window.history.pushState({ profileSection: true }, "", url);
    setOpened(id);
  }, []);

  const closeSection = useCallback(() => {
    // Opened from this page: step back over the entry it added. Opened from the address: drop the parameter in place.
    if (window.history.state?.profileSection) window.history.back();
    else {
      const url = new URL(window.location.href);
      url.searchParams.delete("section");
      window.history.replaceState(null, "", url);
      setOpened(null);
    }
  }, []);

  // The address decides the panel, whatever changed it: Back, a section link in the sidebar (Next navigates in place, so
  // no popstate fires) or the pushState above, which Next also reports through useSearchParams.
  const searchParams = useSearchParams();
  const addressSection = searchParams.get("section");
  useEffect(() => {
    setOpened(addressSection && isLedgerSection(addressSection) ? addressSection : null);
  }, [addressSection]);

  // One Save covers every section, so leaving with unsaved edits asks first: a reload or tab close through
  // beforeunload, and a link to another page in the app, which Next follows without unloading, through a click guard.
  const unsaved = changed || review !== null;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const to = new URL(link.href, window.location.href);
      // Profile's own links (a section, #resumes) keep the edits.
      if (to.origin === window.location.origin && to.pathname === window.location.pathname) return;
      if (!window.confirm("Leave Profile? Unsaved changes are lost")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [unsaved]);
  const unsavedSections = rows.filter((row) => row.state === "unsaved").length;

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
      openSection("contact");
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
    setConfirmDiscard(false);
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
        {review
          ? "Import not saved"
          : unsavedSections
            ? `${unsavedSections} ${unsavedSections === 1 ? "section" : "sections"} unsaved`
            : savedAt
              ? `Saved ${shortDate(savedAt)}`
              : "Not saved"}
      </span>
      {unsaved && (
        <Button type="button" variant="ghost" onClick={() => setConfirmDiscard(true)} disabled={saving}>
          {unsavedSections > 1 || review ? "Discard all" : "Discard"}
        </Button>
      )}
      <Button type="button" onClick={save} disabled={saving || !canSave}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );

  return (
    <WorkspaceShell
      email={email}
      active="profile"
      sectionCounts={{ "/profile": rows.length, "/profile#resumes": files.length }}
    >
      <div className="flex min-w-0 items-start">
        <div className="min-w-0 flex-1">
          <div className="px-3.5 pt-5 pb-10 md:px-7 md:pt-7 md:pb-12">
            <div className="flex flex-col gap-5">
              <ProfileHeading
                fullName={fullName}
                headline={headline}
                place={[city, country].filter(Boolean).join(", ")}
                savedAt={savedAt}
                live={published.live}
              />
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
              <LedgerList rows={rows} opened={opened} onOpen={openSection} />
              <ResumeFiles files={files} setFiles={setFiles} />
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
          onClose={closeSection}
          closeLabel="Close section"
          badges={openRow && <StateBadge state={openRow.state} />}
          title={openRow?.title ?? ""}
          descriptionFallback="Section details"
        >
          <DetailsForm key={formVersion} details={details} edit={edit} only={opened} />
          {/* The panel carries Save and its error, docked or as a sheet, so the page needs no Save bar while it's open. */}
          <div className="sticky bottom-0 mt-auto border-t bg-card">
            {problem && (
              <Alert variant="destructive" className="mx-3 mt-3 w-auto md:mx-5">
                <AlertCircle />
                <AlertTitle>{problem}</AlertTitle>
              </Alert>
            )}
            {saveBar}
          </div>
        </DockedPanel>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title={unsavedSections > 1 ? `Discard ${unsavedSections} sections?` : "Discard changes?"}
        description={
          review
            ? `Can't be undone · drops the import from ${review.fileName}`
            : `Can't be undone · back to ${savedAt ? `Saved ${shortDate(savedAt)}` : "empty"}`
        }
        action={unsavedSections > 1 || review ? "Discard all" : "Discard"}
        onOpenChange={setConfirmDiscard}
        onConfirm={discard}
      />

      {/* With no section open, a Save bar shows only when there is something to save (an import, a rewrite). */}
      {canSave && openRow === null && (
        <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur">{saveBar}</div>
      )}
    </WorkspaceShell>
  );
}
