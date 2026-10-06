import Link from "next/link";
import { ArrowRight, Check, CircleDashed } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Panel, Stat, TitleBar } from "@/components/lab/panel";
import { depthWords, formatDate, kindWords, labelWords, levelWords, statusWords, toneFor } from "@/components/lab/words";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Pill } from "@/components/ui/pill";
import type { CapabilityRow, NextRequirement, RequirementRow, RequirementTopic } from "@/features/engineering-lab/capabilities";
import type { EvidenceLink } from "@/features/engineering-lab/evidence";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { LevelRail } from "./level-rail";

// Profile: the evidence behind each area, the chosen direction's target, and the next requirement. Layout from the
// selected "Evidence Workbench" prototype (capability table, milestone column), in Ken OS type and tokens.
// Design: docs/architecture/engineering-redesign.md.

const columns = "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_16px]";

function TopicChip({ topic }: { topic: RequirementTopic }) {
  const words = topic.origin === "proof" ? "Proven" : topic.origin === "placement" ? "Known" : statusWords[topic.status];
  return (
    <li>
      <Link href={engineering.topic(topic.topicId)} className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted", topic.needed ? "border-border" : "border-dashed border-input text-muted-foreground")}>
        {topic.origin ? <Check size={12} aria-hidden="true" className="text-status-solid" /> : <CircleDashed size={12} aria-hidden="true" className="text-muted-foreground" />}
        <span className="font-semibold">{topic.title}</span>
        <span className="text-muted-foreground">· {words}</span>
      </Link>
    </li>
  );
}

function Requirement({ item }: { item: RequirementRow }) {
  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{item.title}</span>
          <span className="text-muted-foreground"> · {depthWords[item.need]} · {levelWords(item.level)}</span>
        </p>
        {item.topics.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${item.title} topics`}>{item.topics.map((topic) => <TopicChip key={topic.topicId} topic={topic} />)}</ul>}
      </div>
      <div className="flex items-start gap-2 sm:justify-end">
        {item.met
          ? <Pill tone="solid" icon={<Check size={12} aria-hidden="true" />}>Met</Pill>
          : <Pill tone={item.have === "none" ? "neutral" : "partial"}>{item.have === "none" ? "Missing" : `${depthWords[item.have]} now`}</Pill>}
        {item.estimate && <Pill tone="quiet">Estimate</Pill>}
      </div>
    </li>
  );
}

function CapabilityTable({ rows, hasDirection }: { rows: CapabilityRow[]; hasDirection: boolean }) {
  return (
    <section aria-labelledby="capabilities-title" className="min-w-0 rounded-lg border border-border">
      <h2 id="capabilities-title" className="sr-only">Areas</h2>
      <div className={cn("hidden gap-4 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid", columns)}>
        <span>Area</span><span>Now</span><span>Target</span><span>Requirements</span><span />
      </div>
      {rows.map((row, index) => (
        <details key={row.area} className="group border-b border-border last:border-b-0" open={index === 0 && row.remaining > 0}>
          <summary className={cn("grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_16px] items-center gap-x-4 gap-y-3 px-4 py-4 hover:bg-muted/40 md:py-5 [&::-webkit-details-marker]:hidden", columns)}>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{row.title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{row.summary}</span>
            </span>
            <span className="col-start-1 md:col-start-auto"><LevelRail current={row.current} target={row.target} estimate={row.estimate} /></span>
            <span className="col-start-1 text-sm md:col-start-auto">
              <span className="text-xs text-muted-foreground md:hidden">Target · </span>
              {row.target ? levelWords(row.target) : <span className="text-muted-foreground">{hasDirection ? "Not needed" : "No direction"}</span>}
            </span>
            <span className="col-start-1 text-sm md:col-start-auto">
              {row.requirements.length === 0 ? <span className="text-muted-foreground">Senior reached</span>
                : row.remaining === 0 ? <span className="font-semibold text-status-solid">All met</span>
                  : <><span className="font-semibold">{row.remaining}</span> of {row.requirements.length} to go<span className="block text-xs text-muted-foreground">For {levelWords(row.scope)}</span></>}
            </span>
            <svg aria-hidden="true" viewBox="0 0 16 16" className="col-start-2 row-start-1 size-4 shrink-0 transition-transform group-open:rotate-90 md:col-start-auto md:row-start-auto"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          </summary>
          <div className="border-t border-border bg-muted/20 px-4">
            {row.requirements.length ? <ul className="divide-y divide-border">{row.requirements.map((item) => <Requirement key={`${item.chapterId}-${item.need}`} item={item} />)}</ul>
              : <p className="py-3 text-sm text-muted-foreground">Every level in this area is met</p>}
            {row.atBaseline !== row.current && row.atBaseline !== undefined && (
              <p className="border-t border-border py-2.5 text-xs text-muted-foreground">At baseline · {levelWords(row.atBaseline)}</p>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}

function Milestone({ next }: { next: NextRequirement | null }) {
  if (!next) return <Panel title="Next milestone"><p className="text-sm">Direction complete</p><Button asChild size="sm" variant="outline" className="mt-3"><Link href={engineering.assessment({ new: true })}>Start checkpoint</Link></Button></Panel>;
  const { requirement } = next;
  const topic = requirement.topics.find((item) => item.topicId === next.topicId);
  return (
    <Panel title="Next milestone" meta={levelWords(requirement.level)}>
      <p className="text-xs text-muted-foreground">{next.areaTitle}</p>
      <p className="mt-0.5 font-display text-lg font-semibold">{requirement.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{depthWords[requirement.need]} · {depthWords[requirement.have]} now · {requirement.missing.length === 1 ? "1 topic left" : `${requirement.missing.length} topics left`}</p>
      {topic && (
        <Button asChild size="sm" className="mt-3">
          <Link href={engineering.topic(topic.topicId)}>{topic.title}<ButtonEndIcon><ArrowRight size={14} /></ButtonEndIcon></Link>
        </Button>
      )}
    </Panel>
  );
}

function History({ view }: { view: ProfileView }) {
  return (
    <Panel title="Assessments" bodyClassName="p-0">
      <ul className="divide-y divide-border text-sm">
        {view.baseline.runId && (
          <li className="flex items-baseline justify-between gap-3 px-4 py-2.5">
            <Link href={view.baseline.completedAt ? engineering.results(view.baseline.runId) : engineering.assessment({ run: view.baseline.runId })} className="font-semibold underline-offset-4 hover:underline">Baseline</Link>
            <span className="text-muted-foreground">{view.baseline.completedAt ? formatDate(view.baseline.completedAt) : "In progress"}</span>
          </li>
        )}
        {view.checkpoint.done.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
            <Link href={engineering.results(item.id)} className="font-semibold underline-offset-4 hover:underline">Checkpoint</Link>
            <span className="text-muted-foreground">{formatDate(item.completedAt)}</span>
          </li>
        ))}
        {view.checkpoint.inProgressRunId && (
          <li className="flex items-baseline justify-between gap-3 px-4 py-2.5">
            <Link href={engineering.assessment({ run: view.checkpoint.inProgressRunId })} className="font-semibold underline-offset-4 hover:underline">Checkpoint</Link>
            <span className="text-muted-foreground">In progress</span>
          </li>
        )}
      </ul>
    </Panel>
  );
}

function Evidence({ items }: { items: EvidenceLink[] }) {
  return (
    <Panel title="Recent evidence" bodyClassName={items.length ? "p-0" : undefined}>
      {items.length ? (
        <ul className="divide-y divide-border text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={engineering.evidence(item.id)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 hover:bg-muted/60">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{item.topicTitle}</span>
                  <span className="text-xs text-muted-foreground">{kindWords[item.kind]} · {formatDate(item.at)}</span>
                </span>
                <Pill tone={toneFor(item.label)}>{labelWords[item.label]}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No graded answers yet</p>}
    </Panel>
  );
}

function NotYet({ view }: { view: ProfileView }) {
  const started = view.baseline.state === "in_progress";
  return (
    <Panel title={started ? "Baseline · In progress" : "Baseline · Not started"} className="mt-4 border-foreground">
      <p className="text-sm">Intro, then closed-book questions by chapter. Pause between chapters</p>
      <details className="group mt-2 max-w-[680px] text-sm">
        <DisclosureSummary className="text-muted-foreground">How this works</DisclosureSummary>
        <ol className="mt-2 space-y-1 pl-6 leading-6">
          <li>1. Intro: what you build, what you use, hours a week. Never graded</li>
          <li>2. Assessment: closed-book, chapter by chapter, no timer</li>
          <li>3. Profile: a level per area from graded answers, then a direction</li>
        </ol>
      </details>
      <Button asChild className="mt-4">
        <Link href={engineering.assessment()}>{started ? "Continue baseline" : view.intake ? "Start baseline" : "Start intro"}<ButtonEndIcon><ArrowRight size={15} /></ButtonEndIcon></Link>
      </Button>
    </Panel>
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
      <div className="w-full px-5 py-6 sm:px-8">
        <TitleBar
          title="Profile"
          stats={done ? <>
            <Stat label="Direction" value={chosen?.title ?? "No direction yet"} />
            {chosen && <Stat label="Level" value={`${levelWords(chosen.overall)}${estimate ? " · Estimate" : ""}`} />}
            {latest && <Stat label="Last assessed" value={formatDate(latest)} />}
          </> : undefined}
          actions={done ? <Button asChild size="sm" variant="outline"><Link href={engineering.direction()}>{chosen ? "Change direction" : "Choose direction"}</Link></Button> : undefined}
        />

        {!done ? <NotYet view={view} /> : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <CapabilityTable rows={rows} hasDirection={Boolean(chosen)} />
              <details className="group mt-3 text-sm">
                <DisclosureSummary className="text-muted-foreground">How levels work</DisclosureSummary>
                <ul className="mt-2 max-w-[680px] space-y-1 pl-6 leading-6">
                  <li>A level needs its chapters known or proven, at the depth that level asks for</li>
                  <li>Known: every answer in a placement check or assessment was solid</li>
                  <li>Proven: every required kind of question solid, at least one checked by running code</li>
                  <li>Estimate means a chapter rests on placement questions only</li>
                  <li>A direction&apos;s level is its weakest area</li>
                  <li><Link href={engineering.direction("definitions")} className="underline underline-offset-4">Definitions</Link></li>
                </ul>
              </details>
            </div>
            <div className="space-y-4">
              <Milestone next={next} />
              <History view={view} />
              <Evidence items={evidence} />
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
