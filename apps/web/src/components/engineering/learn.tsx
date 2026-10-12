"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCircle,
  IconCircleDot,
  IconSearch,
} from "@tabler/icons-react";
import type { TopicMap, TopicState } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { statusWords } from "@/components/lab/words";
import type { PathView } from "@/features/engineering-lab/path-store";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { PageHeading, panel } from "./kit";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Learn. Spec: docs/architecture/engineering-rebuild.md, section 3 (Learn).

type Scope = "path" | "all";

function StateIcon({ state }: { state: TopicState }) {
  if (state === "PROVEN") return <IconCheck size={18} className="shrink-0 text-foreground" aria-hidden="true" />;
  if (state === "NOT_STARTED")
    return <IconCircle size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />;
  return <IconCircleDot size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />;
}

export function Learn({
  email,
  map,
  view,
  area,
  closedBook,
}: {
  email: string;
  map: TopicMap;
  view: PathView;
  area: string | null;
  closedBook: boolean;
}) {
  const [scope, setScope] = useState<Scope>(view.path ? "path" : "all");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const order = scope === "path" && view.path ? view.path : map.chapters.map((chapter) => chapter.id);
  const chapters = order
    .map((id) => map.chapters.find((chapter) => chapter.id === id)!)
    .filter((chapter) => !area || chapter.area === area)
    .map((chapter) => {
      const topics = map.topics.filter((topic) => topic.chapter === chapter.id);
      const shown = needle
        ? topics.filter(
            (topic) => topic.title.toLowerCase().includes(needle) || chapter.title.toLowerCase().includes(needle),
          )
        : topics;
      return { chapter, topics, shown, proven: topics.filter((topic) => view.states[topic.id] === "PROVEN").length };
    })
    .filter((item) => item.shown.length);

  return (
    <WorkspaceShell email={email} active="lab" tab="learn" termLookup={!closedBook}>
      <div className="mx-auto max-w-7xl px-3 pt-6 pb-9 md:px-5 md:pt-7.5">
        <PageHeading title="Learn" badge={area ? map.areas.find((item) => item.id === area)?.title : undefined} />
        <div className="mx-1.5 mb-5 block justify-between gap-5 md:mx-3.5 md:mb-6.5 md:flex">
          <ToggleGroup
            type="single"
            spacing={1}
            value={scope}
            onValueChange={(next) => {
              if (next) setScope(next as Scope);
            }}
            aria-label="Topics shown"
            className="mb-3.5 rounded-md bg-secondary p-1 md:mb-0"
          >
            {(
              [
                ["path", "My path"],
                ["all", "All topics"],
              ] as const
            ).map(([id, name]) => (
              <ToggleGroupItem
                key={id}
                value={id}
                disabled={id === "path" && !view.path}
                className="data-[state=on]: h-auto rounded-full px-3.5 py-2 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground"
              >
                {name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <InputGroup className="h-11 rounded-full md:w-80">
            <InputGroupAddon>
              <IconSearch size={18} aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search topics"
              placeholder="Search topics"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>
        </div>

        <div className="mx-1.5 grid grid-cols-1 gap-4.5 md:mx-3.5 md:grid-cols-[2fr_1fr] md:gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(230px,1fr)] lg:gap-8">
          <section className="min-w-0">
            {!chapters.length && (
              <div className={cn(panel, "p-7 text-center")}>
                <h2 className="text-base font-semibold">No topics found</h2>
                <Button type="button" variant="outline" className="mt-4" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </div>
            )}
            {chapters.map(({ chapter, shown, topics, proven }, position) => {
              const newArea = position === 0 || chapters[position - 1].chapter.area !== chapter.area;
              return (
                <Fragment key={chapter.id}>
                  {newArea && (
                    <h2 className={cn("mb-3 text-lg font-bold tracking-tight", position > 0 && "mt-8")}>
                      {map.areas.find((item) => item.id === chapter.area)?.title}
                    </h2>
                  )}
                  <details
                    className={cn(panel, "group mb-3")}
                    open={Boolean(needle) || shown.some((topic) => topic.id === view.next?.id)}
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-4.5 md:gap-5 md:px-5 md:py-5 [&::-webkit-details-marker]:hidden">
                      <h3 className="min-w-0 flex-1 text-sm font-semibold md:text-sm">{chapter.title}</h3>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground md:text-xs">
                        {proven} / {topics.length} proven
                      </span>
                      <IconChevronDown
                        size={18}
                        className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    {shown.map((topic) => {
                      const state = view.states[topic.id] ?? "NOT_STARTED";
                      return (
                        <Link
                          key={topic.id}
                          href={engineering.topic(topic.id)}
                          className="flex w-full items-center gap-2.5 border-t border-border px-4 py-4 text-left hover:bg-muted/50 md:gap-3.5 md:px-5.5 md:py-4"
                        >
                          <StateIcon state={state} />
                          <span className="min-w-0 flex-1 text-xs font-medium md:text-xs">{topic.title}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{statusWords[state]}</span>
                          <IconChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </details>
                </Fragment>
              );
            })}
          </section>
          <aside className={cn(panel, "h-fit p-5")}>
            <small className="text-sm font-semibold text-muted-foreground">Next</small>
            {view.next ? (
              <>
                <h2 className="mt-2.5 text-xl font-bold tracking-tight">{view.next.title}</h2>
                <p className="mt-1.5 mb-5 text-xs text-muted-foreground">
                  {view.next.area} · {view.next.chapter} · {statusWords[view.next.state]}
                </p>
                <Button asChild className="w-full">
                  <Link href={engineering.topic(view.next.id)}>
                    Continue topic
                    <IconArrowRight size={18} aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : (
              <h2 className="mt-2.5 text-xl font-bold">Every topic proven</h2>
            )}
          </aside>
        </div>
      </div>
    </WorkspaceShell>
  );
}
