import Link from "next/link";
import { IconArrowRight, IconChevronDown, IconChevronRight, IconCircle, IconCircleDot } from "@tabler/icons-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { formatDate, statusWords } from "@/components/lab/words";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { Coverage, Fact, levelShort, PageHeading, panel, Rail } from "./kit";
import { Button } from "@/components/ui/button";

// Profile. Spec: docs/architecture/engineering-rebuild.md, section 3 (Profile) and section 5 (rules).
// Evidence levels come only from Proven topics. Before any assessment every area is Developing with 0 coverage.

const columns = "grid-cols-[1.45fr_1fr_18px] gap-3 md:grid-cols-[1.6fr_1.3fr_.55fr_1.15fr_15px] md:gap-2.5 xl:grid-cols-[2fr_1.6fr_.62fr_1.45fr_18px] xl:gap-[13px]";
type Row = ProfileView["rows"][number];

function Remaining({ row }: { row: Row }) {
  return (
    <div className="mx-3 mb-3 mt-1.5 rounded-md bg-tint px-2.5 pb-1.5 pt-3.5 md:px-[13px]">
      {!row.target ? <p className="pb-3 text-xs text-muted-foreground">Not needed for the target role</p>
        : !row.remainingTopics.length ? <p className="pb-3 text-xs text-muted-foreground">Every required topic is proven</p>
          : row.remainingTopics.map((topic) => (
            <Link key={topic.id} href={engineering.topic(topic.id)} className="flex w-full items-center gap-[9px] pb-[9px] pt-[5px] text-left hover:text-primary md:gap-4">
              {topic.state === "NOT_STARTED" ? <IconCircle size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" /> : <IconCircleDot size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
              <span className="min-w-0 flex-1 text-[13px] font-medium">{topic.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{statusWords[topic.state]}</span>
            </Link>
          ))}
    </div>
  );
}

function CapabilityTable({ rows }: { rows: Row[] }) {
  return (
    <section className={cn(panel, "min-w-0 overflow-hidden")} aria-label="Capabilities">
      <div className={cn("grid items-center border-b border-border bg-table-head p-3.5 text-xs font-semibold text-quiet md:px-3.5 md:py-[15px] xl:px-[18px]", columns)}>
        <span>Capability</span><span>Evidence level</span><span className="hidden md:block">Target</span><span className="hidden md:block">Proof coverage</span><span />
      </div>
      {rows.map((row) => (
        <details key={row.area} className="group border-b border-border last:border-b-0">
          <summary className={cn("grid min-h-[100px] cursor-pointer list-none items-center p-3.5 text-left hover:bg-row-hover md:px-3.5 md:py-3 xl:px-[18px] [&::-webkit-details-marker]:hidden group-open:bg-row-hover", columns)}>
            <div className="min-w-0">
              <strong className="text-[13px] font-semibold md:text-sm">{row.title}</strong>
              <p className="mt-1 max-w-[230px] text-[11px] leading-[1.5] text-muted-foreground xl:text-xs">{row.summary}</p>
            </div>
            <div className="min-w-0">
              <strong className="text-[13px] font-semibold md:text-sm">{levelShort(row.level)}</strong>
              <Rail level={row.level} />
            </div>
            <strong className="hidden text-sm font-semibold md:block">{row.target ? levelShort(row.target) : <span className="font-normal text-muted-foreground">Not needed</span>}</strong>
            <div className="hidden md:block"><Coverage met={row.coverage.proven} total={row.coverage.required} /></div>
            <span className="text-quiet"><IconChevronRight size={18} className="group-open:hidden" aria-hidden="true" /><IconChevronDown size={18} className="hidden group-open:block" aria-hidden="true" /></span>
          </summary>
          <Remaining row={row} />
        </details>
      ))}
    </section>
  );
}

function History({ view }: { view: ProfileView }) {
  const row = "grid w-full grid-cols-[1fr_auto] rounded-lg border border-border bg-card text-left text-[11px] md:grid-cols-[1fr_1fr_1fr_auto] md:text-xs";
  const cell = "border-r border-border px-[9px] py-3 text-quiet md:px-[15px]";
  return (
    <div className="mt-[22px] border-t border-border px-1 pt-[15px] md:px-[15px]">
      <strong className="text-xs font-semibold">Assessment history</strong>
      {view.history.length ? (
        <div className="mt-2.5 space-y-2">
          {view.history.map((run) => (
            <Link key={run.id} href={run.completedAt ? engineering.evidence(run.id) : engineering.assessment} className={row}>
              <span className={cell}>{formatDate(run.completedAt ?? run.startedAt)}</span>
              <span className={cn(cell, "hidden md:block")}>Assessment</span>
              <span className={cn(cell, "hidden md:block")}>{run.completedAt ? `${run.answers} answers` : "In progress"}</span>
              <b className="flex items-center gap-[9px] px-[9px] py-3 font-medium text-primary md:px-[15px]">{run.completedAt ? "View evidence" : "Resume"}<IconArrowRight size={15} aria-hidden="true" /></b>
            </Link>
          ))}
        </div>
      ) : <p className="mt-1.5 text-xs text-muted-foreground">No assessments yet</p>}
    </div>
  );
}

function Milestone({ view }: { view: ProfileView }) {
  const assessment = view.openRunId ? "Resume assessment" : "Take assessment";
  return (
    <aside className={cn(panel, "h-fit p-5 lg:p-[18px] xl:p-5")}>
      <small className="text-sm font-semibold text-quiet">Next milestone</small>
      {view.milestone ? (
        <>
          <h2 className="mt-[9px] text-[23px] font-bold tracking-[-0.6px] md:text-[25px]">{view.milestone.areaTitle} · {levelShort(view.milestone.level)}</h2>
          <p className="mb-6 mt-3 text-[13px] text-muted-foreground">{view.milestone.coverage.proven} of {view.milestone.coverage.required} proven · Next: {view.milestone.topicTitle}</p>
          <Button asChild className="w-full"><Link href={engineering.topic(view.milestone.topicId)}>Continue learning<IconArrowRight size={19} aria-hidden="true" /></Link></Button>
        </>
      ) : <h2 className="mt-[9px] text-[23px] font-bold tracking-[-0.6px]">{view.direction ? "Target met" : "No target role"}</h2>}
      <Button asChild variant="text" className="mx-auto mt-4 flex w-fit"><Link href={engineering.assessment}>{assessment}</Link></Button>
    </aside>
  );
}

export function Profile({ email, view }: { email: string; view: ProfileView }) {
  const assessed = Boolean(view.lastAssessed);
  return (
    <WorkspaceShell email={email} active="lab" tab="profile" termLookup={!view.openRunId}>
      <div className="mx-auto max-w-[1500px] px-3 pb-9 pt-6 md:px-5 md:pt-[30px] min-[1500px]:pt-9">
        <PageHeading
          title="Profile"
          facts={<>
            <Fact label="Target role" first>
              <Link href={engineering.direction} className="flex items-center gap-2.5 text-left hover:text-primary">{view.direction?.title ?? "Choose direction"}<IconChevronDown size={16} aria-hidden="true" /></Link>
            </Fact>
            <Fact label="Last assessed">{view.lastAssessed ? formatDate(view.lastAssessed) : "Never"}{view.direction ? ` · ${levelShort(view.overall)}` : ""}</Fact>
          </>}
        />
        <div className="grid grid-cols-1 gap-[9px] lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_306px]">
          <div className="min-w-0">
            <CapabilityTable rows={view.rows} />
            <History view={view} />
          </div>
          {assessed ? <Milestone view={view} /> : (
            <aside className={cn(panel, "h-fit p-5")}>
              <small className="text-sm font-semibold text-quiet">Assessment</small>
              <h2 className="mt-[9px] text-[23px] font-bold tracking-[-0.6px]">{view.openRunId ? "In progress" : "Not started"}</h2>
              <p className="mb-6 mt-2 text-[13px] text-muted-foreground">5 questions · no timer</p>
              <Button asChild className="w-full"><Link href={engineering.assessment}>{view.openRunId ? "Resume assessment" : "Start assessment"}<IconArrowRight size={19} aria-hidden="true" /></Link></Button>
            </aside>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
