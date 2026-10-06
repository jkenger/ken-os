"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconCheck, IconChevronDown, IconChevronRight, IconCircle, IconCircleDashed, IconSearch } from "@tabler/icons-react";
import { isKnown, isUnassessed, type TopicMap, type TopicProgress } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { post } from "@/components/lab/topic/client";
import { statusWords } from "@/components/lab/words";
import { toast } from "@/components/ui/toaster";
import { engineering, type TopicStep } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { PageHeading, panel } from "./kit";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

// Learn, one to one with the selected 2026-10-06 prototype: My path / Gaps / All topics, search, chapters as cards
// that open into topic rows, and the Planner's next topic beside them. Statuses are the existing progress rules.

type Scope = "path" | "gaps" | "all";
const scopes: [Scope, string][] = [["path", "My path"], ["gaps", "Gaps"], ["all", "All topics"]];

/** Known for the outline: proven, placed, or rated solid by the baseline. */
function knownHere(progress: TopicProgress) {
  return isKnown(progress) || progress.baselineLabel === "solid";
}

function statusOf(progress: TopicProgress, locked: boolean) {
  if (progress.status === "VALIDATED") return "Proven";
  if (knownHere(progress) && progress.status === "NOT_STARTED") return "Known";
  if (isUnassessed(progress)) return "Not assessed";
  if (locked) return "Needs prerequisites";
  return statusWords[progress.status];
}

export function EngineeringLearn({ email, map, progress, assessable, path = null, upNext = null, closedBook = false }: {
  email: string; map: TopicMap; progress: TopicProgress[]; assessable: string[];
  /** Chapters the chosen direction needs. Null without a direction. */
  path?: string[] | null;
  upNext?: { topicId: string; title: string; step: TopicStep; reason: string } | null;
  closedBook?: boolean;
}) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>(path ? "path" : "all");
  const [query, setQuery] = useState("");
  const [placing, setPlacing] = useState("");
  const byId = new Map(progress.map((item) => [item.topicId, item]));
  const needle = query.trim().toLowerCase();
  const options = path ? scopes : scopes.filter(([id]) => id !== "path");

  // Chapters in book order (engineering-assessment-v2.md, A6); a chapter outside every book keeps its course order.
  const inBooks = map.books.flatMap((book) => book.chapters);
  const ordered = [...inBooks.map((id) => map.modules.find((module) => module.id === id)!).filter(Boolean), ...map.modules.filter((module) => !inBooks.includes(module.id))];
  const chapters = ordered.map((module, index) => {
    const book = map.books.find((item) => item.chapters.includes(module.id));
    const track = book ? { title: book.title } : map.tracks.find((item) => item.id === module.track);
    const topics = map.topics.filter((topic) => topic.module === module.id).map((topic) => {
      const item = byId.get(topic.id)!;
      const locked = item.status === "NOT_STARTED" && topic.requires.some((id) => !isKnown(byId.get(id)!));
      return { topic, item, locked, status: statusOf(item, locked) };
    });
    return { module, number: index + 1, track: track?.title ?? "", bookId: book?.id ?? null, topics };
  }).filter(({ module, topics, track }) => {
    if (scope === "path" && path && !path.includes(module.id)) return false;
    if (scope === "gaps" && topics.every(({ item }) => knownHere(item)) && module.planned.length === 0) return false;
    if (!needle) return true;
    return [module.title, track, ...topics.map(({ topic }) => topic.title)].join(" ").toLowerCase().includes(needle);
  });

  async function place(topicId: string) {
    setPlacing(topicId);
    try {
      await post(`/api/lab/topics/${topicId}/assessment`, { kind: "placement" });
      router.push(engineering.topic(topicId, "check"));
    } catch (error) {
      toast({ tone: "error", title: "Couldn't write the placement check. Try again", description: error instanceof Error ? error.message : undefined });
      setPlacing("");
    }
  }

  const openChapter = upNext ? map.topics.find((topic) => topic.id === upNext.topicId)?.module : undefined;

  return (
    <WorkspaceShell email={email} active="lab" tab="learn" termLookup={!closedBook}>
      <div className="mx-auto max-w-[1500px] px-3 pb-9 pt-6 md:px-5 md:pt-[30px] min-[1500px]:pt-9">
        <PageHeading title="Learn" />

        <div className="mx-[5px] mb-5 block justify-between gap-5 md:mx-3.5 md:mb-[25px] md:flex">
          <div className="mb-3.5 flex w-fit gap-1 rounded-md bg-secondary p-1 md:mb-0" role="group" aria-label="Topics shown">
            {options.map(([id, name]) => (
              <button key={id} type="button" aria-pressed={scope === id} onClick={() => setScope(id)}
                className={cn("rounded-full px-3.5 py-2 text-[13px]", scope === id ? "bg-card text-foreground shadow-tab" : "text-muted-foreground hover:text-foreground")}>{name}</button>
            ))}
          </div>
          <InputGroup className="h-11 rounded-full md:w-80">
            <InputGroupAddon><IconSearch size={18} aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput aria-label="Search topics" placeholder="Search topics or chapters" value={query} onChange={(event) => setQuery(event.target.value)} />
          </InputGroup>
        </div>

        <div className="mx-[5px] grid grid-cols-1 gap-[18px] md:mx-3.5 md:grid-cols-[2fr_1fr] md:gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(230px,1fr)] lg:gap-8">
          <section className="min-w-0">
            {chapters.map(({ module, number, track, bookId, topics }, position) => {
              const book = bookId && chapters[position - 1]?.bookId !== bookId ? map.books.find((item) => item.id === bookId) : null;
              const done = topics.filter(({ item }) => item.status === "VALIDATED").length;
              const known = topics.filter(({ item }) => knownHere(item)).length;
              const rows = scope === "gaps" ? topics.filter(({ item }) => !knownHere(item)) : topics;
              return (
                <Fragment key={module.id}>
                {book && (
                  <div className={cn("mb-3.5", position > 0 && "mt-8")}>
                    <h2 className="text-lg font-bold tracking-[-0.3px]">{book.title}</h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{book.summary}</p>
                  </div>
                )}
                <details className={cn(panel, "group mb-3")} open={Boolean(needle) || module.id === openChapter}>
                  <summary className="flex cursor-pointer list-none items-center gap-[9px] px-[15px] py-[17px] md:gap-5 md:px-5 md:py-[19px] [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <small className="text-[11px] text-muted-foreground">{track} · Chapter {number}</small>
                      <h3 className="mt-1 text-sm font-semibold md:text-[15px]">{module.title}</h3>
                    </div>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground md:text-xs">{topics.length ? `${done} / ${topics.length} proven${known > done ? ` · ${known - done} known` : ""}` : "Not written yet"}</span>
                    <IconChevronDown size={18} className="shrink-0 text-quiet transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  {rows.map(({ topic, item, status }) => (
                    <div key={topic.id} className="flex w-full items-center gap-2.5 border-t border-border px-[15px] py-[15px] text-left hover:bg-row-hover md:gap-[13px] md:px-[21px] md:py-4">
                      {item.status === "VALIDATED" || knownHere(item) ? <IconCheck size={18} className="shrink-0 text-status-solid" aria-hidden="true" />
                        : isUnassessed(item) ? <IconCircleDashed size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                          : <IconCircle size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
                      <Link href={engineering.topic(topic.id)} className="min-w-0 flex-1 text-xs font-medium hover:text-primary md:text-[13px]">{topic.title}</Link>
                      {isUnassessed(item) && assessable.includes(topic.id) && (
                        <button type="button" disabled={placing !== ""} onClick={() => void place(topic.id)} className="shrink-0 text-[11px] text-primary hover:underline underline-offset-4 disabled:opacity-50">
                          {placing === topic.id ? "Writing questions…" : "Placement check"}
                        </button>
                      )}
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{status}</span>
                      <Link href={engineering.topic(topic.id)} aria-label={`Open ${topic.title}`} className="shrink-0 text-quiet"><IconChevronRight size={18} aria-hidden="true" /></Link>
                    </div>
                  ))}
                  {scope === "gaps" && rows.length === 0 && topics.length > 0 && <p className="border-t border-border px-5 py-4 text-xs text-muted-foreground">No gaps</p>}
                  {module.planned.map((title) => (
                    <div key={title} className="flex items-center gap-[13px] border-t border-border px-[21px] py-4 text-[13px] text-muted-foreground">
                      <IconCircleDashed size={18} aria-hidden="true" /><span className="flex-1">{title}</span><span className="text-[11px]">Not written yet</span>
                    </div>
                  ))}
                </details>
                </Fragment>
              );
            })}
            {chapters.length === 0 && (
              <div className={cn(panel, "p-[35px] text-center")}>
                <h3 className="text-[17px] font-semibold">No topics found</h3>
                <p className="mb-[18px] mt-[7px] text-sm text-muted-foreground">Try a broader word</p>
                <Button variant="outline" type="button" onClick={() => { setQuery(""); setScope("all"); }}>Clear search</Button>
              </div>
            )}
          </section>

          <aside className="py-2.5 text-sm text-muted-foreground md:py-[15px]">
            <h3 className="text-[17px] font-semibold text-foreground">Up next</h3>
            {upNext ? (
              <>
                <p className="mb-[18px] mt-[7px] leading-[1.65]"><strong className="font-semibold text-foreground">{upNext.title}</strong> · {upNext.reason}</p>
                <Button asChild><Link href={engineering.topic(upNext.topicId, upNext.step)}>Continue topic<IconArrowRight size={18} aria-hidden="true" /></Link></Button>
              </>
            ) : <p className="mt-[7px]">Nothing due</p>}
            <hr className="my-[25px] border-border" />
            <strong className="text-foreground">Statuses</strong>
            <ul className="mt-2 list-disc space-y-1 pl-[19px] leading-[1.9]">
              <li>Proven: every required kind of question solid, one checked by code</li>
              <li>Known: placed by an all-solid placement check or assessment</li>
              <li>Opening a lesson never proves a topic</li>
            </ul>
          </aside>
        </div>
      </div>
    </WorkspaceShell>
  );
}
