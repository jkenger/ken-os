"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, FileDown } from "lucide-react";
import { IconChevronRight, IconFlask } from "@tabler/icons-react";
import { applyAutofill, autofillChanges, PDF_MIME, type AutofillChange, type ProfileDetails } from "@ken-os/domain";
import type { PortfolioProfile } from "@ken-os/portfolio";
import { DockedPanel } from "@/components/docked-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EngineeringLine } from "@/features/engineering-lab/roadmap-store";
import { engineering as engineeringRoutes } from "@/features/engineering-lab/routes";
import { toast } from "@/components/ui/toaster";
import { panel } from "@/components/surfaces";
import { isLedgerSection, ledgerRows, type LedgerSectionId } from "@/features/profile/ledger";
import type { ResumeFile } from "@/features/profile/resume-files-store";
import { reviewProfile } from "@/features/profile/review";
import type { ProfileState } from "@/features/profile/store";
import { send } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AutofillReview } from "./autofill-review";
import { ConfirmDialog } from "./confirm-dialog";
import { shortDate } from "./dates";
import { DetailsForm } from "./details-form";
import { PublicResumeBar } from "./profile-ledger";
import { ProfileHeader, ReviewPanel, SectionIndex } from "./profile-overview";
import { MoreSections, OPTIONAL_SECTIONS, SectionPanel, SectionView } from "./profile-sections";
import { ResumeFiles } from "./resume-files";
import { RewritePanel } from "./rewrite-panel";

// Profile in three columns: the section index on the left, the details readable in place in the centre (each section
// edits in its own panel, one Save for all), and the resumes and public resume on the right. Autofill's review takes
// over the right column while it's open. Spec: docs/product/profile-resume.md.

/** What the live Portfolio holds, for the public resume block and each section's Published or Changed state. */
export interface ProfilePublic {
  live: { version: number; publishedAt: string } | null;
  /** The live snapshot's profile; null when nothing is live. */
  profile: PortfolioProfile | null;
  showEmail: boolean;
}

/** True from 1024px, where the right column sits beside the centre instead of under it. */
function useBeside() {
  const [beside, setBeside] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setBeside(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return beside;
}

/** One line per Engineering roadmap: the goal and how many topics are learned, linking to that roadmap. */
function EngineeringSummary({ roadmapId, headline, detail }: EngineeringLine) {
  return (
    <Link
      href={engineeringRoutes.roadmap(null, roadmapId)}
      aria-label={`Engineering, ${headline}, ${detail}`}
      className={cn(
        panel,
        "flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <IconFlask size={18} aria-hidden="true" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{headline}</p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
      <IconChevronRight size={14} aria-hidden="true" className="text-muted-foreground" />
    </Link>
  );
}

export function ProfileWorkspace({
  email,
  profile,
  resumes,
  engineering,
  published,
  initialSection = null,
}: {
  email: string;
  /** The section being edited on load, from `?section=`, so a refresh or a shared link keeps it. */
  initialSection?: LedgerSectionId | null;
  published: ProfilePublic;
  profile: ProfileState;
  /** Uploaded resume files, newest first. */
  resumes: ResumeFile[];
  /** The Engineering goal and progress, linking to the roadmap. Null when it couldn't load. */
  engineering: EngineeringLine[] | null;
}) {
  const [saved, setSaved] = useState(profile.details);
  const [savedAt, setSavedAt] = useState(profile.savedAt);
  const [details, setDetails] = useState(profile.details);
  /** Bumped when the whole form is replaced (Autofill, discard), so fields that keep their own typing state and
   *  rewrite suggestions made for the old form reset. */
  const [formVersion, setFormVersion] = useState(0);
  /** The accepted Autofill in the form, until it's saved or discarded. */
  const [review, setReview] = useState<{ importId: string; fileName: string; fileId: string } | null>(null);
  /** The Autofill open in the right column, before any of it reaches the form. */
  const [autofill, setAutofill] = useState<{
    file: ResumeFile;
    importId: string;
    draft: ProfileDetails;
    changes: AutofillChange[];
    matches: string[];
  } | null>(null);
  /** The changes picked in the open Autofill. */
  const [picked, setPicked] = useState<string[]>([]);
  const [autofilling, setAutofilling] = useState<string | null>(null);
  /** The form as it is now, for an Autofill that comes back after the owner kept typing. */
  const latest = useRef(details);
  latest.current = details;
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** The section whose form is open in its panel. */
  const [opened, setOpened] = useState<LedgerSectionId | null>(initialSection);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [files, setFiles] = useState(resumes);
  const beside = useBeside();
  const rows = useMemo(
    () => ledgerRows(details, saved, published.profile, { showEmail: published.showEmail }),
    [details, saved, published],
  );
  const issues = useMemo(() => reviewProfile(details), [details]);
  const issuesIn = (id: LedgerSectionId) => issues.filter((issue) => issue.section === id).length;
  const changed = JSON.stringify(details) !== JSON.stringify(saved);
  // An accepted Autofill can always be saved, even when it matched what was there, so it's marked applied.
  const canSave = changed || savedAt === null || review !== null;

  // The open section lives in `?section=`: opening one adds a history entry, so Back closes its form instead of leaving
  // Profile, and a refresh reopens it. Only the address changes; no navigation.
  const openSection = useCallback((id: LedgerSectionId) => {
    const url = new URL(window.location.href);
    const wasOpen = url.searchParams.has("section");
    url.searchParams.set("section", id);
    // Our own state object, never a copy of Next's: Next skips syncing its router for a state that carries its markers.
    if (wasOpen) window.history.replaceState({ profileSection: window.history.state?.profileSection }, "", url);
    else window.history.pushState({ profileSection: true }, "", url);
    setOpened(id);
    setAutofill(null);
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

  // The address decides which form is open, whatever changed it: Back, a link, or the pushState above, which Next also
  // reports through useSearchParams.
  const searchParams = useSearchParams();
  const addressSection = searchParams.get("section");
  useEffect(() => {
    const section = addressSection && isLedgerSection(addressSection) ? addressSection : null;
    setOpened(section);
    if (section) setAutofill(null);
  }, [addressSection]);

  // An opened section scrolls to the top of the screen, so its form is in view wherever it was opened from.
  useEffect(() => {
    if (opened) document.getElementById(opened)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [opened]);

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

  /** Claude reads the file; what it found opens in the right column, every change picked. */
  async function startAutofill(file: ResumeFile) {
    setAutofilling(file.id);
    setProblem(null);
    try {
      const result = await send<{ importId: string; draft: ProfileDetails; fileName: string }>(
        `/api/profile/resumes/${encodeURIComponent(file.id)}/autofill`,
        "POST",
      );
      const { changes, matches } = autofillChanges(latest.current, result.draft);
      if (opened) closeSection();
      setAutofill({ file, importId: result.importId, draft: result.draft, changes, matches });
      setPicked(changes.map((change) => change.id));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Autofill failed. Try again");
    } finally {
      setAutofilling(null);
    }
  }

  /** Puts the picked changes into the form; Save keeps them. */
  function acceptAutofill() {
    if (!autofill || !picked.length) return;
    const { draft, file, importId } = autofill;
    replaceForm(picked.reduce((next, id) => applyAutofill(next, draft, id), details));
    setReview({ importId, fileName: file.fileName, fileId: file.id });
    setAutofill(null);
    toast({
      tone: "success",
      title: `${picked.length} ${picked.length === 1 ? "change" : "changes"} from ${file.fileName}. Save to keep them`,
    });
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
      if (review)
        setFiles((current) =>
          current.map((file) => (file.id === review.fileId ? { ...file, appliedAt: result.savedAt } : file)),
        );
      setReview(null);
      toast({ tone: "success", title: "Profile saved" });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
    } finally {
      setSaving(false);
    }
  }

  const formFor = (id: LedgerSectionId) => (
    <DetailsForm key={`${formVersion}-${id}`} details={details} edit={edit} only={id} />
  );
  // ledgerRows always returns Contact first; the header is that row.
  const [contactRow, ...sectionRows] = rows;
  const shownRows = sectionRows.filter(
    (row) => !OPTIONAL_SECTIONS.includes(row.id) || row.count > 0 || row.state === "unsaved" || opened === row.id,
  );
  const waitingRows = sectionRows.filter((row) => !shownRows.includes(row));

  const autofillTitle = autofill && (
    <>
      <Badge variant="secondary">Autofill</Badge>
      <Badge variant="outline">{autofill.file.contentType === PDF_MIME ? "PDF" : "DOCX"}</Badge>
    </>
  );
  const autofillFacts = autofill && (
    <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Uploaded</dt>
      <dd>{shortDate(autofill.file.uploadedAt)}</dd>
      <dt className="text-muted-foreground">Changes</dt>
      <dd>
        {autofill.changes.length
          ? `${autofill.changes.length}, ${picked.length} selected`
          : "None, every field matches"}
      </dd>
    </dl>
  );
  const autofillBody = autofill && (
    <>
      <AutofillReview
        changes={autofill.changes}
        matches={autofill.matches}
        selected={picked}
        onToggle={(id, on) => setPicked((current) => (on ? [...current, id] : current.filter((item) => item !== id)))}
      />
      <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 border-t bg-card px-5 py-3">
        {autofill.changes.length > 0 && (
          <span className="mr-auto text-sm text-muted-foreground">
            {picked.length} of {autofill.changes.length}
          </span>
        )}
        <Button type="button" variant="ghost" onClick={() => setAutofill(null)}>
          {autofill.changes.length ? "Discard" : "Close"}
        </Button>
        {autofill.changes.length > 0 && (
          <Button type="button" onClick={acceptAutofill} disabled={!picked.length}>
            Accept {picked.length} {picked.length === 1 ? "change" : "changes"}
          </Button>
        )}
      </div>
    </>
  );

  let right: ReactNode;
  if (autofill && beside) {
    right = (
      <section aria-labelledby="autofill-title" className={cn(panel, "flex flex-col overflow-hidden")}>
        <div className="border-b p-5">
          <div className="flex items-center gap-2">{autofillTitle}</div>
          <h2 id="autofill-title" className="mt-2 truncate font-heading text-base font-semibold">
            {autofill.file.fileName}
          </h2>
          {autofillFacts}
        </div>
        {autofillBody}
      </section>
    );
  } else {
    right = (
      <>
        <ResumeFiles
          files={files}
          setFiles={setFiles}
          reviewing={autofill?.file.id ?? review?.fileId ?? null}
          autofilling={autofilling}
          pending={review?.fileName ?? null}
          onAutofill={(file) => void startAutofill(file)}
        />
        <PublicResumeBar live={published.live} changed={rows.filter((row) => row.publishChanges).length} />
        {engineering?.map((line) => (
          <EngineeringSummary key={line.roadmapId ?? "path"} {...line} />
        ))}
      </>
    );
  }

  return (
    <WorkspaceShell
      email={email}
      active="profile"
      sectionTabs={false}
      sectionCounts={{ "/profile": rows.length, "/profile#resumes": files.length }}
    >
      <div className="px-page pt-page pb-section text-sm">
        {/* At 1440 with the shell folded: 200 index + 16 + centre + 16 + 320 right fills the 1344px canvas. */}
        <div className="mx-auto grid max-w-336 items-start gap-block lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[12.5rem_minmax(0,1fr)_20rem]">
          <aside className="sticky top-page hidden xl:block">
            <SectionIndex rows={rows} issues={issues} />
          </aside>

          <div className="flex min-w-0 flex-col gap-block">
            {review && (
              <Alert>
                <FileDown />
                <AlertTitle>Autofill from {review.fileName}. Not saved yet</AlertTitle>
              </Alert>
            )}
            {problem && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{problem}</AlertTitle>
              </Alert>
            )}
            <ProfileHeader
              contact={details.contact}
              row={contactRow}
              issues={issuesIn("contact")}
              savedAt={savedAt}
              live={published.live}
              editing={opened === "contact"}
              onEdit={() => openSection("contact")}
              onDone={closeSection}
              form={formFor("contact")}
            />
            <ReviewPanel issues={issues} rows={rows} onOpen={openSection} />
            <RewritePanel key={`rewrite-${formVersion}`} details={details} setDetails={setDetails} />
            {shownRows.map((row) => (
              <SectionPanel
                key={row.id}
                row={row}
                issues={issuesIn(row.id)}
                editing={opened === row.id}
                onEdit={() => openSection(row.id)}
                onDone={closeSection}
                form={formFor(row.id)}
              >
                <SectionView id={row.id} details={details} />
              </SectionPanel>
            ))}
            <MoreSections rows={waitingRows} onAdd={openSection} />
          </div>

          <div className="flex min-w-0 flex-col gap-block">{right}</div>
        </div>
      </div>

      {/* Below 1024px the right column sits under the centre, so Autofill's review opens as a sheet instead. */}
      {!beside && (
        <DockedPanel
          open={autofill !== null}
          docked={false}
          onClose={() => setAutofill(null)}
          closeLabel="Close Autofill"
          badges={autofillTitle}
          title={autofill?.file.fileName ?? ""}
          descriptionFallback="Changes from this resume"
          facts={autofillFacts}
        >
          {autofillBody}
        </DockedPanel>
      )}

      <ConfirmDialog
        open={confirmDiscard}
        title={unsavedSections > 1 ? `Discard ${unsavedSections} sections?` : "Discard changes?"}
        description={
          review
            ? `Can't be undone · drops the Autofill from ${review.fileName}`
            : `Can't be undone · back to ${savedAt ? `Saved ${shortDate(savedAt)}` : "empty"}`
        }
        action={unsavedSections > 1 || review ? "Discard all" : "Discard"}
        onOpenChange={setConfirmDiscard}
        onConfirm={discard}
      />

      {/* One Save bar for the whole page: it shows while a form is open or there is something to save. */}
      {(canSave || opened !== null) && (
        <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur">
          <div className="flex items-center justify-end gap-2 px-page py-3">
            <span className="mr-auto text-sm text-muted-foreground">
              {review
                ? "Autofill not saved"
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
        </div>
      )}
    </WorkspaceShell>
  );
}
