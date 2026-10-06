import Link from "next/link";
import { IconArrowRight, IconCheck, IconChevronDown, IconChevronRight, IconCircle } from "@tabler/icons-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { depthWords, formatDate, kindWords, labelWords } from "@/components/lab/words";
import type { CapabilityRow, NextRequirement, RequirementRow } from "@/features/engineering-lab/capabilities";
import type { EvidenceLink } from "@/features/engineering-lab/evidence";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { Badge, Coverage, Fact, levelShort, PageHeading, panel, Rail } from "./kit";
import { Button } from "@/components/ui/button";

// Profile, one to one with the selected 2026-10-06 prototype: a capability table whose rows open into the remaining
// proof requirements, a next-milestone column, and assessment history. Every value comes from capabilities.ts, the
// same rules as levels and the roadmap. Design: docs/architecture/engineering-redesign.md.

const columns = "grid-cols-[1.45fr_1fr_18px] gap-3 md:grid-cols-[1.6fr_1.3fr_.55fr_1.15fr_15px] md:gap-2.5 xl:grid-cols-[2fr_1.6fr_.62fr_1.45fr_18px] xl:gap-[13px]";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function requirementLine(item: RequirementRow) {
  const topics = item.missing.map((id) => item.topics.find((topic) => topic.topicId === id)?.title ?? id);
  const now = item.met ? "Met" : `${depthWords[item.have]} now`;
  return [depthWords[item.need], now, topics.length ? `Missing: ${topics.join(", ")}` : null, item.estimate ? "Estimate" : null].filter(Boolean).join(" · ");
}

function Requirements({ row }: { row: CapabilityRow }) {
  const remaining = row.requirements.filter((item) => !item.met);
  const shown = remaining.length ? remaining : row.requirements;
  return (
    <div className="mx-3 mb-3 mt-1.5 rounded-md bg-tint px-2.5 pb-1.5 pt-3.5 md:px-[13px]">
      <strong className="text-sm font-semibold">{remaining.length ? `Remaining proof requirements for ${row.title} · ${levelShort(row.scope)}` : `${row.title} · ${levelShort(row.scope)} met`}</strong>
      <p className="mb-[9px] mt-1 text-xs text-muted-foreground">{row.requirements.length - remaining.length} of {plural(row.requirements.length, "requirement")} met</p>
      {shown.length === 0 ? <p className="pb-3 text-xs text-muted-foreground">Every level in this area is met</p> : shown.map((item) => {
        const target = item.missing[0] ?? item.topics[0]?.topicId;
        const body = (
          <>
            {item.met ? <IconCheck size={20} className="mt-0.5 shrink-0 text-status-solid" aria-label="Met" /> : <IconCircle size={20} className="mt-0.5 shrink-0 text-muted-foreground" aria-label="Not met" />}
            <span className="min-w-0">
              <strong className="block text-[13px] font-medium">{item.title} · {levelShort(item.level)}</strong>
              <small className="mt-0.5 block text-[11px] leading-[1.5] text-muted-foreground md:text-xs">{requirementLine(item)}</small>
            </span>
          </>
        );
        return target
          ? <Link key={`${item.chapterId}-${item.need}`} href={engineering.topic(target)} className="flex w-full items-start gap-[9px] pb-[9px] pt-[5px] text-left hover:text-primary md:gap-4">{body}</Link>
          : <div key={`${item.chapterId}-${item.need}`} className="flex w-full items-start gap-[9px] pb-[9px] pt-[5px] md:gap-4">{body}</div>;
      })}
    </div>
  );
}

function CapabilityTable({ rows, hasDirection }: { rows: CapabilityRow[]; hasDirection: boolean }) {
  const open = rows.find((row) => row.target && row.remaining > 0)?.area ?? rows.find((row) => row.remaining > 0)?.area;
  return (
    <section className={cn(panel, "min-w-0 overflow-hidden")} aria-label="Capabilities">
      <div className={cn("grid items-center border-b border-border bg-table-head p-3.5 text-xs font-semibold text-quiet md:px-3.5 md:py-[15px] xl:px-[18px]", columns)}>
        <span>Capability</span><span>Evidence level</span><span className="hidden md:block">Target</span><span className="hidden md:block">Proof coverage</span><span />
      </div>
      {rows.map((row) => (
        <details key={row.area} className="group border-b border-border last:border-b-0" open={row.area === open}>
          <summary className={cn("grid min-h-[110px] cursor-pointer list-none items-center p-3.5 text-left hover:bg-row-hover md:min-h-[105px] md:px-3.5 md:py-3 xl:px-[18px] [&::-webkit-details-marker]:hidden group-open:border-l-2 group-open:border-l-rail-soft group-open:bg-row-hover group-open:pl-3 xl:group-open:pl-4", columns)}>
            <div className="min-w-0">
              <strong className="text-[13px] font-semibold md:text-sm">{row.title}</strong>
              <p className="mt-1 max-w-[210px] text-[11px] leading-[1.5] text-muted-foreground xl:text-xs">{row.summary}</p>
            </div>
            <div className="min-w-0">
              <strong className="text-[13px] font-semibold md:text-sm">{levelShort(row.current)}{row.estimate && row.current ? " · Estimate" : ""}</strong>
              <Rail level={row.current} soft={row.estimate} />
            </div>
            <strong className="hidden text-sm font-semibold md:block">{row.target ? levelShort(row.target) : <span className="font-normal text-muted-foreground">{hasDirection ? "Not needed" : "None"}</span>}</strong>
            <div className="hidden md:block"><Coverage met={row.requirements.length - row.remaining} total={row.requirements.length} /></div>
            <span className="text-quiet"><IconChevronRight size={18} className="group-open:hidden" aria-hidden="true" /><IconChevronDown size={18} className="hidden group-open:block" aria-hidden="true" /></span>
          </summary>
          <Requirements row={row} />
        </details>
      ))}
    </section>
  );
}

function History({ view, evidence }: { view: ProfileView; evidence: EvidenceLink[] }) {
  const runs = [
    ...(view.baseline.runId ? [{ id: view.baseline.runId, name: "Baseline", at: view.baseline.completedAt }] : []),
    ...view.checkpoint.done.map((item) => ({ id: item.id, name: "Checkpoint", at: item.completedAt as string | null })),
    ...(view.checkpoint.inProgressRunId ? [{ id: view.checkpoint.inProgressRunId, name: "Checkpoint", at: null }] : []),
  ];
  const row = "grid w-full grid-cols-[1fr_auto] rounded-lg border border-border bg-card text-left text-[11px] md:grid-cols-[1fr_1.5fr_auto] md:text-xs xl:grid-cols-[1fr_1.5fr_1.5fr_auto]";
  const cell = "border-r border-border px-[9px] py-3 text-quiet md:px-[15px]";
  const link = "flex items-center gap-[9px] px-[9px] py-3 font-medium text-primary md:px-[15px]";
  return (
    <div className="mt-[22px] border-t border-border px-1 pt-[15px] md:px-[15px]">
      <strong className="text-xs font-semibold">Assessment history</strong>
      <p className="mb-2.5 mt-[3px] text-xs text-muted-foreground">{plural(runs.length, "assessment")} · Snapshots never change</p>
      <div className="space-y-2">
        {runs.map((run) => (
          <Link key={run.id} href={run.at ? engineering.results(run.id) : engineering.assessment({ run: run.id })} className={row}>
            <span className={cell}>{run.name}</span>
            <span className={cn(cell, "hidden md:block")}>{run.at ? formatDate(run.at) : "In progress"}</span>
            <span className={cn(cell, "hidden xl:block")}>{run.at ? "Complete" : "Resume any time"}</span>
            <b className={link}>{run.at ? "View evidence" : "Continue"}<IconArrowRight size={15} aria-hidden="true" /></b>
          </Link>
        ))}
      </div>
      {evidence.length > 0 && (
        <>
          <strong className="mt-5 block text-xs font-semibold">Recent evidence</strong>
          <div className="mt-2.5 space-y-2">
            {evidence.map((item) => (
              <Link key={item.id} href={engineering.evidence(item.id)} className={row}>
                <span className={cn(cell, "truncate")}>{item.topicTitle}</span>
                <span className={cn(cell, "hidden md:block")}>{kindWords[item.kind]} · {formatDate(item.at)}</span>
                <span className={cn(cell, "hidden xl:block")}>{labelWords[item.label]}</span>
                <b className={link}>Inspect<IconArrowRight size={15} aria-hidden="true" /></b>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Milestone({ next }: { next: NextRequirement | null }) {
  const topic = next?.requirement.topics.find((item) => item.topicId === next.topicId);
  return (
    <aside className={cn(panel, "h-fit p-5 lg:p-[18px] xl:p-5")}>
      <small className="text-sm font-semibold text-quiet">Next milestone</small>
      {next ? (
        <>
          <h2 className="mt-[9px] text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">{next.areaTitle} · {levelShort(next.requirement.level)}</h2>
          <p className="mb-[26px] mt-[15px] text-[13px] leading-[1.5] text-muted-foreground lg:text-sm xl:text-[15px]">
            {next.requirement.title} · {depthWords[next.requirement.need]} · {plural(next.requirement.missing.length, "topic")} left
          </p>
          <hr className="my-[25px] border-border" />
          {topic && <Button asChild className="w-full"><Link href={engineering.topic(topic.topicId)}>Continue learning<IconArrowRight size={19} aria-hidden="true" /></Link></Button>}
        </>
      ) : <h2 className="mt-[9px] text-[25px] font-bold tracking-[-0.6px]">Direction complete</h2>}
      <Button asChild variant="text" className="mx-auto mt-4 flex w-fit"><Link href={engineering.assessment({ new: true })}>Take assessment</Link></Button>
    </aside>
  );
}

function NotYet({ view }: { view: ProfileView }) {
  const started = view.baseline.state === "in_progress";
  return (
    <section className={cn(panel, "mx-[5px] max-w-[850px] p-[23px] md:mx-3.5 md:p-8")}>
      <Badge>{started ? "Baseline · In progress" : "Baseline · Not started"}</Badge>
      <h2 className="my-4 text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">{started ? "Continue the baseline" : "Take the baseline"}</h2>
      <ul className="mb-6 list-disc space-y-1 pl-5 text-sm leading-[1.9] text-muted-foreground">
        <li>Intro first. Never graded</li>
        <li>Closed-book, chapter by chapter, no timer</li>
        <li>Pause between chapters</li>
        <li>Proven topics are skipped</li>
      </ul>
      <Button asChild><Link href={engineering.assessment()}>{started ? "Continue baseline" : view.intake ? "Start baseline" : "Start intro"}<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
    </section>
  );
}

export function EngineeringProfile({ email, view, rows, next, evidence, closedBook = false }: {
  email: string; view: ProfileView; rows: CapabilityRow[]; next: NextRequirement | null; evidence: EvidenceLink[]; closedBook?: boolean;
}) {
  const done = view.baseline.state === "done";
  const chosen = view.roles.find((role) => role.roleId === view.direction);
  const latest = view.checkpoint.done.at(-1)?.completedAt ?? view.baseline.completedAt;
  const estimate = rows.some((row) => (chosen ? row.target : true) && row.estimate);
  return (
    <WorkspaceShell email={email} active="lab" tab="profile" termLookup={!closedBook}>
      <div className="mx-auto max-w-[1500px] px-3 pb-9 pt-6 md:px-5 md:pt-[30px] min-[1500px]:pt-9">
        <PageHeading
          title="Profile"
          badge={done ? (estimate ? "Includes estimates" : "From graded answers") : undefined}
          facts={done ? <>
            <Fact label="Target role" first>
              <Link href={engineering.direction()} className="flex items-center gap-2.5 text-left hover:text-primary">{chosen?.title ?? "Choose direction"}<IconChevronDown size={16} aria-hidden="true" /></Link>
            </Fact>
            <Fact label="Last assessed">{latest ? formatDate(latest) : "Never"}{chosen ? ` · ${levelShort(chosen.overall)}` : ""}</Fact>
          </> : undefined}
        />
        {!done ? <NotYet view={view} /> : (
          <div className="grid grid-cols-1 gap-[9px] lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_306px]">
            <div className="min-w-0">
              <CapabilityTable rows={rows} hasDirection={Boolean(chosen)} />
              <History view={view} evidence={evidence} />
            </div>
            <Milestone next={next} />
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
