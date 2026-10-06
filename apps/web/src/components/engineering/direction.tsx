"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconCheck } from "@tabler/icons-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AddedChapterScreen } from "@/components/lab/profile/lab-profile";
import { GuideChat, type GuideProposals } from "@/components/lab/profile/guide-chat";
import { post } from "@/components/lab/topic/client";
import { depthWords } from "@/components/lab/words";
import { toast } from "@/components/ui/toaster";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { Back, Badge, levelShort, Notice, PageHeading, panel, primaryButton, secondaryButton } from "./kit";
import { Dialog, field, fieldLabel, FlowLayout, FlowNotes } from "./flow";

// Direction, as the selected 2026-10-06 prototype lays it out: pick a target role, see what it needs per area, save;
// pace beside it. The Guide conversation, the definitions and added chapters open from here instead of a workbench.
// A direction changes requirements and the path, never past grades.

export function DefinitionsDialog({ view, trigger = "How levels and depths work" }: { view: ProfileView; trigger?: string }) {
  return (
    <Dialog title="Definitions" trigger={trigger}>
      <h3 className="!mt-0">Levels describe ownership</h3>
      {view.careers.levels.map((level) => (
        <p key={level.id} className="mt-2"><b className="text-foreground">{level.title}:</b> {level.summary} <span className="text-xs">Based on {level.sources.map((id) => {
          const source = view.careers.sources.find((item) => item.id === id);
          return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.title}</a> : null;
        })}</span></p>
      ))}
      <h3>Depth describes the evidence</h3>
      <p>{depthWords.aware} → {depthWords.build} → {depthWords.run}. A role sets the depth each chapter needs. A direction&apos;s level is its weakest required area.</p>
      <h3>Developer and engineer</h3>
      <p><b className="text-foreground">Developer:</b> {view.careers.definitions.developer}</p>
      <p className="mt-2"><b className="text-foreground">Engineer:</b> {view.careers.definitions.engineer}</p>
      <p className="mt-4 text-xs">{view.careers.status === "draft" ? "Draft · not approved" : `Approved ${view.careers.approvedOn}`} · {view.careers.note}</p>
    </Dialog>
  );
}

export function EngineeringDirection({ email, view, closedBook = false }: { email: string; view: ProfileView; closedBook?: boolean }) {
  const router = useRouter();
  const done = view.baseline.state === "done";
  const [roleId, setRoleId] = useState(view.direction ?? [...view.roles].sort((a, b) => a.missing.length - b.missing.length)[0]?.roleId ?? "");
  const [hours, setHours] = useState(view.intake?.weeklyHours ?? 5);
  const [busy, setBusy] = useState("");
  const [suggested, setSuggested] = useState<GuideProposals["addChapters"]>([]);
  const role = view.roles.find((item) => item.roleId === roleId);
  const areaTitle = (id: string) => view.areas.find((area) => area.area === id)?.title ?? id;

  async function act(key: string, action: () => Promise<unknown>, success: string, then?: () => void) {
    setBusy(key);
    try { await action(); toast({ tone: "success", title: success }); router.refresh(); then?.(); }
    catch (error) { toast({ tone: "error", title: "Couldn't save. Try again", description: error instanceof Error ? error.message : undefined }); }
    finally { setBusy(""); }
  }
  const saveDirection = () => act("direction", () => post("/api/lab/profile", { action: "direction", roleId }), "Direction saved · evidence unchanged", () => router.push(engineering.profile));
  const savePace = () => act("pace", () => post("/api/lab/profile", { action: "intake", intake: { ...view.intake!, weeklyHours: hours } }), "Pace saved");

  return (
    <WorkspaceShell email={email} active="lab" tab="profile" termLookup={!closedBook}>
      <div className="mx-auto max-w-[1500px] px-3 pb-9 pt-6 md:px-5 md:pt-[30px] min-[1500px]:pt-9">
        <Back href={engineering.profile}>Profile</Back>
        <PageHeading title="Direction" badge={view.direction ? "Saved" : undefined} />
        <FlowLayout>
          <section className={cn(panel, "p-[23px] md:p-[30px]")}>
            {!done && <Notice>Available after the baseline · <Link href={engineering.assessment()} className="font-semibold underline underline-offset-4">{view.baseline.state === "in_progress" ? "Continue baseline" : "Start baseline"}</Link></Notice>}
            <label className={cn(fieldLabel, "mb-[25px]")}>
              Target role
              <select className={field} value={roleId} disabled={!done} onChange={(event) => setRoleId(event.target.value)}>
                {view.roles.map((item) => <option key={item.roleId} value={item.roleId}>{item.title} · {item.missing.length ? `${item.missing.length} chapters away` : "ready"}</option>)}
              </select>
            </label>
            {role && (
              <>
                <h3 className="text-[17px] font-semibold">{role.title}</h3>
                <p className="mb-[18px] mt-[7px] text-sm leading-[1.55] text-muted-foreground">{role.summary}</p>
                <h4 className="mt-[22px] text-sm font-semibold">Required level</h4>
                <div className="mt-2">
                  {role.areas.map((area) => (
                    <div key={area.area} className="flex items-center justify-between gap-3 border-t border-border py-3 text-[13px]">
                      <strong className="font-medium">{areaTitle(area.area)}</strong>
                      <span className="text-muted-foreground">{levelShort(area.target)} · now {levelShort(area.current)}{area.estimate ? " · estimate" : ""}</span>
                    </div>
                  ))}
                </div>
                <p className="mb-[18px] mt-3 text-xs text-muted-foreground">Ken OS&apos;s own framework, not an industry ladder · {role.missing.length ? `${role.missing.length} chapters to go` : "Nothing missing"}</p>
              </>
            )}
            <div className="flex flex-wrap items-center gap-5">
              <button type="button" className={primaryButton} disabled={!done || !roleId || busy !== "" || roleId === view.direction} onClick={() => void saveDirection()}>
                {busy === "direction" ? "Saving…" : roleId === view.direction ? "Saved" : "Save direction"}<IconCheck size={18} aria-hidden="true" />
              </button>
              {done && (
                <Dialog title="Guide" trigger="Talk it through with the Guide">
                  {(close) => (
                    <GuideChat
                      phase="direction" history={view.conversation}
                      opener="Here's where you are after the baseline. Tell me what you want to build over the next year, and I'll walk you through which roles fit and what each would take."
                      onProposals={(next) => {
                        if (next.direction) { setRoleId(next.direction); close(); toast({ tone: "info", title: "Guide's suggestion selected", description: "Save to confirm" }); }
                        if (next.addChapters.length) setSuggested((current) => [...current, ...next.addChapters].slice(-3));
                      }}
                    />
                  )}
                </Dialog>
              )}
            </div>
          </section>

          <FlowNotes title="Pace">
            <label className={cn(fieldLabel, "mt-3 text-foreground")}>
              Weekly hours
              <input type="number" min={1} max={80} className={field} value={hours} disabled={!view.intake} onChange={(event) => setHours(Number(event.target.value))} />
            </label>
            {view.intake && hours !== view.intake.weeklyHours && <button type="button" className={cn(secondaryButton, "mt-3")} disabled={busy !== ""} onClick={() => void savePace()}>{busy === "pace" ? "Saving…" : "Save pace"}</button>}
            <p className="mt-3">{view.pace.source === "history" ? "Paced from your proven topics" : "Paced from weekly hours until three topics are proven"}</p>
            <div className="mt-3"><DefinitionsDialog view={view} /></div>
          </FlowNotes>
        </FlowLayout>

        {(suggested.length > 0 || view.addedChapters.length > 0) && (
          <section className="mx-[5px] my-[30px] md:mx-3.5 md:my-8">
            <h3 className="mb-3.5 text-base font-semibold">Added chapters</h3>
            {suggested.map((chapter) => (
              <div key={chapter.title} className={cn(panel, "mb-3 p-5 text-sm")}>
                <Badge>Guide suggestion</Badge>
                <p className="mt-2 font-semibold">{chapter.title}</p>
                <p className="mt-1 text-muted-foreground">{chapter.reason}</p>
                <div className="mt-3 flex gap-3">
                  <button type="button" className={secondaryButton} disabled={busy !== ""} onClick={() => void act(chapter.title, () => post("/api/lab/profile", { action: "addChapter", chapter }), "Added · Not written yet", () => setSuggested((current) => current.filter((item) => item.title !== chapter.title)))}>Add chapter</button>
                  <button type="button" className="text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setSuggested((current) => current.filter((item) => item.title !== chapter.title))}>Dismiss</button>
                </div>
              </div>
            ))}
            {view.addedChapters.map((chapter) => (
              <div key={chapter.id} className={cn(panel, "mb-3 p-5 text-sm")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{chapter.title}</p>
                  <Badge>{chapter.screened ? `${depthWords[chapter.depth as keyof typeof depthWords]} · estimate` : "Not assessed"}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{chapter.reason}</p>
                {!chapter.started && <button type="button" className={cn(secondaryButton, "mt-3")} disabled={busy !== ""} onClick={() => void act(chapter.id, () => post("/api/lab/screens/added", { chapterId: chapter.id }), "Questions ready")}>{busy === chapter.id ? "Writing questions…" : "Placement check"}</button>}
                {chapter.next && <div className="mt-4"><AddedChapterScreen chapter={chapter} /></div>}
              </div>
            ))}
          </section>
        )}
      </div>
    </WorkspaceShell>
  );
}
