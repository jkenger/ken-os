"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import {
  applyAnalysis,
  applyAutofill,
  autofillChanges,
  emptyProfile,
  PDF_MIME,
  type AnalysisSection,
  type AutofillChange,
  type ProfileAnalysis,
  type ProfileDetails,
} from "@ken-os/domain";
import { DockedPanel } from "@/components/docked-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { panel } from "@/components/surfaces";
import { isLedgerSection, ledgerRows, type LedgerSectionId } from "@/features/profile/ledger";
import type { ResumeFile } from "@/features/profile/resume-files-store";
import { profileScore, reviewProfile } from "@/features/profile/review";
import type { ProfileState } from "@/features/profile/store";
import { send } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AnalysisCard, WritingPanel } from "./analysis-panel";
import { AutofillReview } from "./autofill-review";
import { ConfirmDialog } from "./confirm-dialog";
import { shortDate } from "./dates";
import { DetailsForm } from "./details-form";
import { ProfileHeader, ReviewPanel, SectionIndex } from "./profile-overview";
import { EditActions, MoreSections, OPTIONAL_SECTIONS, SectionPanel, SectionView } from "./profile-sections";
import { ResumeFiles } from "./resume-files";

// Profile in three columns: the section index on the left, the details readable in place in the centre, and the
// resumes on the right. One section is edited at a time, in its own panel, and every edit ends in its Save or Cancel.
// Autofill's review takes over the right column while it's open, and its Accept saves. Spec: docs/product/profile-resume.md.

/** The key of ProfileDetails a section edits. */
const keyOf = (id: LedgerSectionId): keyof ProfileDetails => (id === "local-fields" ? "local" : id);

/** A copy of `base` with one section taken from `from`. */
function withSection(base: ProfileDetails, from: ProfileDetails, id: LedgerSectionId): ProfileDetails {
  const key = keyOf(id);
  return { ...base, [key]: structuredClone(from[key]) };
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

export function ProfileWorkspace({
  email,
  profile,
  resumes,
  analysis: initialAnalysis,
  initialSection = null,
}: {
  email: string;
  /** The section being edited on load, from `?section=`, so a refresh or a shared link keeps it. */
  initialSection?: LedgerSectionId | null;
  profile: ProfileState;
  /** Uploaded resume files, newest first. */
  resumes: ResumeFile[];
  /** The newest analyzer report, or null before the first run. */
  analysis: ProfileAnalysis | null;
}) {
  const [saved, setSaved] = useState(profile.details);
  const [savedAt, setSavedAt] = useState(profile.savedAt);
  /** The saved details with the open section as typed; every other section always equals saved. */
  const [details, setDetails] = useState(profile.details);
  /** Bumped when a form's content is replaced (Cancel, Use it, Autofill), so fields that keep their own typing state
   *  start again from the new values. */
  const [formVersion, setFormVersion] = useState(0);
  /** The Autofill open in the right column, before any of it is saved. */
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
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** The section whose form is open in its panel. */
  const [opened, setOpened] = useState<LedgerSectionId | null>(initialSection);
  /** A section to open once the owner agrees to drop the open one's unsaved changes. */
  const [pending, setPending] = useState<{ id: LedgerSectionId; fill?: ProfileDetails } | null>(null);
  /** The section the Delete dialog asks about. */
  const [deleting, setDeleting] = useState<LedgerSectionId | null>(null);
  const [files, setFiles] = useState(resumes);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [analyzing, setAnalyzing] = useState(false);
  const beside = useBeside();
  const rows = useMemo(() => ledgerRows(details, saved, null, { showEmail: false }), [details, saved]);
  const issues = useMemo(() => reviewProfile(details), [details]);
  const score = useMemo(() => profileScore(details), [details]);
  const issuesIn = (id: LedgerSectionId) => issues.filter((issue) => issue.section === id).length;
  const dirty = opened !== null && JSON.stringify(details[keyOf(opened)]) !== JSON.stringify(saved[keyOf(opened)]);
  const titleOf = (id: LedgerSectionId) => rows.find((row) => row.id === id)?.title ?? "Section";

  // Refs for the address effect, which must not reset a form this page just opened or filled.
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const openedRef = useRef(opened);
  openedRef.current = opened;

  /** Puts `id` in the address: opening adds a history entry, so Back closes the form instead of leaving Profile. */
  const pushSection = useCallback((id: LedgerSectionId) => {
    const url = new URL(window.location.href);
    const wasOpen = url.searchParams.has("section");
    url.searchParams.set("section", id);
    // Our own state object, never a copy of Next's: Next skips syncing its router for a state that carries its markers.
    if (wasOpen) window.history.replaceState({ profileSection: window.history.state?.profileSection }, "", url);
    else window.history.pushState({ profileSection: true }, "", url);
  }, []);

  /** Closes the form: steps back over the entry opening added, or drops the parameter when opened from the address. */
  const popSection = useCallback(() => {
    setOpened(null);
    if (window.history.state?.profileSection) window.history.back();
    else {
      const url = new URL(window.location.href);
      url.searchParams.delete("section");
      window.history.replaceState(null, "", url);
    }
  }, []);

  /** Opens a section's form from the saved details, or from `fill` (a recommendation) when given. */
  function open(id: LedgerSectionId, fill?: ProfileDetails) {
    setDetails(fill ?? savedRef.current);
    setFormVersion((version) => version + 1);
    setOpened(id);
    setAutofill(null);
    setProblem(null);
    pushSection(id);
  }

  /** Opens a section, asking first when another one has unsaved changes. */
  function request(id: LedgerSectionId, fill?: ProfileDetails) {
    if (dirty && opened !== id) setPending({ id, fill });
    else open(id, fill);
  }

  function cancel() {
    setDetails(saved);
    setFormVersion((version) => version + 1);
    setProblem(null);
    popSection();
  }

  // The address decides which form is open when something else changes it: Back, Forward, or a link with ?section=.
  // A section this page opened itself is already in `opened`, so its form (and any filled recommendation) stays.
  const searchParams = useSearchParams();
  const addressSection = searchParams.get("section");
  useEffect(() => {
    const section = addressSection && isLedgerSection(addressSection) ? addressSection : null;
    if (section === openedRef.current) return;
    setDetails(savedRef.current);
    setFormVersion((version) => version + 1);
    setOpened(section);
    if (section) setAutofill(null);
  }, [addressSection]);

  // An opened section scrolls to the top of the screen, so its form is in view wherever it was opened from.
  useEffect(() => {
    if (opened) document.getElementById(opened)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [opened]);

  // Leaving with unsaved changes asks first: a reload or tab close through beforeunload, and a link to another page in
  // the app, which Next follows without unloading, through a click guard.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const to = new URL(link.href, window.location.href);
      // Profile's own links (a section, #resumes) keep the form open.
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
  }, [dirty]);

  function edit(change: (draft: ProfileDetails) => void) {
    setDetails((current) => {
      const next = structuredClone(current);
      change(next);
      return next;
    });
  }

  /** Stores the whole Profile; the caller decides what changed. */
  async function store(next: ProfileDetails, importId: string | null) {
    const result = await send<{ savedAt: string }>("/api/profile", "PUT", { details: next, importId });
    setSaved(next);
    setDetails(next);
    setSavedAt(result.savedAt);
    return result.savedAt;
  }

  /** Saves the open section only: the saved Profile with this section as typed. */
  async function saveSection() {
    if (!opened) return;
    const id = opened;
    setSaving(true);
    setProblem(null);
    try {
      await store(withSection(saved, details, id), null);
      toast({ tone: "success", title: `${titleOf(id)} saved` });
      popSection();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
    } finally {
      setSaving(false);
    }
  }

  /** Clears a section and saves at once; the dialog before it is the Cancel. */
  async function deleteSection(id: LedgerSectionId) {
    setSaving(true);
    setProblem(null);
    try {
      await store(withSection(saved, emptyProfile(), id), null);
      setFormVersion((version) => version + 1);
      toast({ tone: "success", title: `${titleOf(id)} deleted` });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't delete. Try again");
    } finally {
      setSaving(false);
      setDeleting(null);
    }
  }

  /** Claude reads the file; what it found opens in the right column, every change picked. */
  async function startAutofill(file: ResumeFile) {
    if (dirty && opened && !window.confirm(`Drop the unsaved changes to ${titleOf(opened)}?`)) return;
    setAutofilling(file.id);
    setProblem(null);
    try {
      const result = await send<{ importId: string; draft: ProfileDetails; fileName: string }>(
        `/api/profile/resumes/${encodeURIComponent(file.id)}/autofill`,
        "POST",
      );
      if (opened) cancel();
      const { changes, matches } = autofillChanges(savedRef.current, result.draft);
      setAutofill({ file, importId: result.importId, draft: result.draft, changes, matches });
      setPicked(changes.map((change) => change.id));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Autofill failed. Try again");
    } finally {
      setAutofilling(null);
    }
  }

  /** Accept is Autofill's Save: the picked changes go into the saved Profile at once, and the file is marked used. */
  async function acceptAutofill() {
    if (!autofill || !picked.length) return;
    const { draft, file, importId } = autofill;
    setSaving(true);
    setProblem(null);
    try {
      const at = await store(
        picked.reduce((next, id) => applyAutofill(next, draft, id), saved),
        importId,
      );
      setFormVersion((version) => version + 1);
      setFiles((current) => current.map((item) => (item.id === file.id ? { ...item, appliedAt: at } : item)));
      setAutofill(null);
      toast({
        tone: "success",
        title: `${picked.length} ${picked.length === 1 ? "change" : "changes"} saved from ${file.fileName}`,
      });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
    } finally {
      setSaving(false);
    }
  }

  /** One analyzer run over the saved Profile plus the open form; the report replaces the last one and is kept. */
  async function analyze() {
    setAnalyzing(true);
    setProblem(null);
    try {
      setAnalysis(await send<ProfileAnalysis>("/api/profile/analyze", "POST", { details }));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Analyze failed. Try again");
    } finally {
      setAnalyzing(false);
    }
  }

  /** Opens the section's form with the recommendation filled in; its Save keeps it, Cancel drops it. */
  function applyRecommendation(section: AnalysisSection) {
    if (!section.recommendation) return;
    const id = section.section;
    const base = opened === id ? details : saved;
    const fill = applyAnalysis(base, section.id, section.recommendation);
    if (opened === id) {
      setDetails(fill);
      setFormVersion((version) => version + 1);
    } else request(id, fill);
  }

  /** The analyzer's cards for one Profile section: the summary, or each analyzed role or project in it. */
  function cardsFor(id: LedgerSectionId) {
    const sections = analysis?.sections.filter((section) => section.section === id) ?? [];
    if (!analysis || !sections.length) return undefined;
    return sections.map((section) => (
      <AnalysisCard
        key={section.id}
        section={section}
        analyzedAt={analysis.analyzedAt}
        details={details}
        onUse={applyRecommendation}
        showPlace={section.kind === "bullets"}
      />
    ));
  }

  const formFor = (id: LedgerSectionId) => (
    <>
      <DetailsForm key={`${formVersion}-${id}`} details={details} edit={edit} only={id} />
      {problem && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle />
          <AlertTitle>{problem}</AlertTitle>
        </Alert>
      )}
      <EditActions
        title={titleOf(id)}
        dirty={dirty}
        saving={saving}
        onSave={() => void saveSection()}
        onCancel={cancel}
      />
    </>
  );
  // ledgerRows always returns Contact first; the header is that row.
  const [, ...sectionRows] = rows;
  const shownRows = sectionRows.filter(
    (row) => !OPTIONAL_SECTIONS.includes(row.id) || row.count > 0 || opened === row.id,
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
        <Button type="button" variant="ghost" onClick={() => setAutofill(null)} disabled={saving}>
          {autofill.changes.length ? "Cancel" : "Close"}
        </Button>
        {autofill.changes.length > 0 && (
          <Button type="button" onClick={() => void acceptAutofill()} disabled={!picked.length || saving}>
            {saving ? "Saving…" : `Save ${picked.length} ${picked.length === 1 ? "change" : "changes"}`}
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
          reviewing={autofill?.file.id ?? null}
          autofilling={autofilling}
          pending={null}
          onAutofill={(file) => void startAutofill(file)}
        />
      </>
    );
  }

  return (
    <WorkspaceShell email={email} active="profile">
      <div className="px-page pt-page pb-section text-sm">
        {/* At 1440 with the shell folded: 200 index + 16 + centre + 16 + 320 right fills the 1344px canvas. */}
        <div className="mx-auto grid max-w-336 items-start gap-block lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[12.5rem_minmax(0,1fr)_20rem]">
          <aside className="sticky top-page hidden xl:block">
            <SectionIndex rows={rows} issues={issues} />
          </aside>

          <div className="flex min-w-0 flex-col gap-block">
            {/* Errors from Autofill and Analyze; a section's own Save error shows under its form. */}
            {problem && !opened && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{problem}</AlertTitle>
              </Alert>
            )}
            <ProfileHeader
              contact={details.contact}
              issues={issuesIn("contact")}
              savedAt={savedAt}
              editing={opened === "contact"}
              onEdit={() => request("contact")}
              form={formFor("contact")}
            />
            <ReviewPanel issues={issues} score={score} rows={rows} onOpen={(id) => request(id)} />
            <WritingPanel
              sections={analysis?.sections ?? null}
              analyzedAt={analysis?.analyzedAt ?? null}
              analyzing={analyzing}
              onAnalyze={() => void analyze()}
            />
            {shownRows.map((row) => (
              <SectionPanel
                key={row.id}
                row={row}
                issues={issuesIn(row.id)}
                editing={opened === row.id}
                onEdit={() => request(row.id)}
                onDelete={() => setDeleting(row.id)}
                form={formFor(row.id)}
                analysis={cardsFor(row.id)}
              >
                <SectionView id={row.id} details={details} />
              </SectionPanel>
            ))}
            <MoreSections rows={waitingRows} onAdd={(id) => request(id)} />
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
        open={pending !== null}
        title={opened ? `Drop changes to ${titleOf(opened)}?` : "Drop changes?"}
        description="They were never saved"
        action="Drop changes"
        onOpenChange={(value) => !value && setPending(null)}
        onConfirm={() => {
          if (pending) open(pending.id, pending.fill);
          setPending(null);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete ${titleOf(deleting)}?` : "Delete section?"}
        description={
          deleting ? `Clears everything in ${titleOf(deleting)} and saves. Can't be undone` : "Can't be undone"
        }
        action="Delete"
        busy={saving}
        onOpenChange={(value) => !value && setDeleting(null)}
        onConfirm={() => deleting && void deleteSection(deleting)}
      />
    </WorkspaceShell>
  );
}
