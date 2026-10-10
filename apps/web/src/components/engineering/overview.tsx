import type { ReactNode } from "react";
import Link from "next/link";
import { IconArrowRight, IconChevronRight, IconExternalLink } from "@tabler/icons-react";
import type { Area } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { radarTagWords, statusWords } from "@/components/lab/words";
import type { PathView } from "@/features/engineering-lab/path-store";
import type { RadarView } from "@/features/engineering-lab/radar-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { RadarDialog } from "./radar";
import { Badge, eyebrow, levelShort, PageHeading, panel, SectionTitle } from "./kit";
import { Button } from "@/components/ui/button";

// Overview. Spec: docs/architecture/engineering-rebuild.md, section 3 (Overview). "From your projects" is left out
// until Ken OS can really detect concepts in projects.

export interface OverviewAssessment {
  /** Null before the first finished assessment. */
  finished: boolean;
  /** Answers given in the open assessment, or null when none is open. */
  open: { answered: number; total: number } | null;
}

export interface OverviewArea { id: Area; title: string; summary: string }

const card = cn(panel, "p-6 md:p-7");
const row = "flex w-full flex-wrap items-center gap-3 border-t border-border py-4.5 text-left text-xs hover:bg-muted/50 md:flex-nowrap md:gap-5.5 md:text-xs";

function MainCard({ assessment, path }: { assessment: OverviewAssessment; path: PathView }) {
  if (!assessment.finished || assessment.open) {
    const state = assessment.open ? `In progress · ${assessment.open.answered} of ${assessment.open.total}` : "Not started";
    return (
      <section className={card}>
        <div className={eyebrow}>{state}</div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Assessment</h2>
        <p className="my-5 text-xs text-muted-foreground">5 questions · no timer</p>
        <Button asChild><Link href={engineering.assessment}>{assessment.open ? "Resume assessment" : "Start assessment"}<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
      </section>
    );
  }
  const next = path.next;
  return (
    <section className={card}>
      {next ? (
        <>
          <div className={eyebrow}>{next.area} · {next.chapter}</div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{next.title} <Badge className="ml-2">{statusWords[next.state]}</Badge></h2>
          <Button asChild className="mt-6"><Link href={engineering.topic(next.id)}>Continue<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
        </>
      ) : <h2 className="text-2xl font-bold">Every topic proven</h2>}
    </section>
  );
}

export function Overview({ email, assessment, path, areas, radar, practice }: {
  email: string;
  assessment: OverviewAssessment;
  path: PathView;
  areas: OverviewArea[];
  radar: RadarView;
  /** The Practice card, once there is an assessment behind it. */
  practice?: ReactNode;
}) {
  return (
    <WorkspaceShell email={email} active="lab" tab="overview" termLookup={!assessment.open}>
      <div className="mx-auto max-w-7xl px-3 pb-9 pt-6 md:px-5 md:pt-7.5">
        <PageHeading title="Overview" />
        <div className="mx-1.5 grid grid-cols-1 gap-4.5 md:mx-3.5 md:grid-cols-[2fr_1fr] md:gap-5 lg:gap-8">
          <MainCard assessment={assessment} path={path} />
          {practice}
        </div>

        <section className="mx-1.5 mt-9 md:mx-3.5">
          <SectionTitle title="Your path" />
          <div className={cn(panel, "px-5")}>
            {areas.map((area, index) => (
              <Link key={area.id} href={`${engineering.learn}?area=${area.id}`} className={cn(row, index === 0 && "border-t-0")}>
                <div className="min-w-0 flex-1">
                  <strong className="font-semibold">{area.title}</strong>
                  <p className="mt-1 text-xs text-muted-foreground md:text-xs">{area.summary}</p>
                </div>
                {assessment.finished && <span className="shrink-0 text-xs text-muted-foreground">{levelShort(path.areaLevels[area.id])}</span>}
                <IconChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-1.5 mt-9 md:mx-3.5">
          <SectionTitle title="Relevant changes" action={<RadarDialog radar={radar} />} />
          {radar.items.length ? (
            <div className={cn(panel, "px-5")}>
              {radar.items.map((item, index) => (
                <div key={item.id} className={cn(row, index === 0 && "border-t-0")}>
                  <Badge>{radarTagWords[item.tag]}</Badge>
                  <div className="min-w-0 flex-1">
                    <strong className="font-semibold">{item.title}</strong>
                    <p className="mt-1 text-xs text-muted-foreground md:text-xs">{item.reason}</p>
                  </div>
                  {item.topicId ? <Button asChild variant="link"><Link href={engineering.topic(item.topicId)}>Re-check</Link></Button>
                    : item.sourceUrl && <Button asChild variant="link"><a href={item.sourceUrl} target="_blank" rel="noreferrer">Source<IconExternalLink size={14} aria-hidden="true" /></a></Button>}
                </div>
              ))}
            </div>
          ) : (
            <div className={cn(panel, "p-6")}>
              <h3 className="text-sm font-semibold">No changes yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">Checked weekly from official docs</p>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}

/** The Practice card: shown once there is an assessment behind it. */
export function PracticeCard({ ready, done, minutes }: { ready: number; done: boolean; minutes: number }) {
  return (
    <section className={card}>
      <div className={eyebrow}>{done ? "Done" : `${ready} ready`}</div>
      <h2 className="text-xl font-bold tracking-tight">Practice</h2>
      <p className="my-4 text-xs text-muted-foreground">~{minutes} min</p>
      <Button asChild variant="outline">
        <Link href={done ? `${engineering.practice}?summary=1` : engineering.practice}>{done ? "View summary" : "Start practice"}</Link>
      </Button>
    </section>
  );
}
