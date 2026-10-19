"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Fact } from "@/components/engineering/kit";
import { PageHeading } from "@/components/page-heading";
import { panel, selectedRow } from "@/components/surfaces";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { filterTree, treeOrder, type StudioManifest } from "@/features/design-studio/manifest";
import { cn } from "@/lib/utils";
import { previews } from "./previews";

/** Design Studio step 1 (docs/architecture/design-studio.md): this repo's components as a tree, and the picked one
 *  rendered live. The graph and the inspector come in later steps. */
export function StudioWorkspace({
  email,
  manifest,
  selected,
}: {
  email: string;
  manifest: StudioManifest;
  selected: string;
}) {
  const [query, setQuery] = useState("");
  const rows = treeOrder(manifest.components);
  // Open on the top row of This repo, as the spec decides for the first open.
  const current = manifest.components.find((component) => component.id === selected) ?? rows[0]?.component;
  const shown = filterTree(rows, query);
  const Preview = current ? previews[current.id] : undefined;
  const wrappers = manifest.components.filter((component) => component.kind === "wrapper").length;

  return (
    <WorkspaceShell email={email} active="studio">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <PageHeading
          kicker="Design Studio"
          title="Components"
          description="Every component in this repo, rendered live."
          facts={
            <>
              <Fact label="Components" first>
                {manifest.components.length - wrappers}
              </Fact>
              <Fact label="Loots wrappers">{wrappers}</Fact>
              <Fact label="Style">{manifest.style}</Fact>
            </>
          }
        />

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label="Components" className="min-w-0">
            <InputGroup className="mb-3 rounded-full">
              <InputGroupAddon>
                <Search size={16} aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Filter components"
                aria-label="Filter components"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </InputGroup>
            <div className={cn(panel, "overflow-hidden")}>
              <p className="flex items-center justify-between border-b px-4 py-3 text-sm font-semibold">
                This repo
                <span className="text-xs font-normal text-muted-foreground">{rows.length}</span>
              </p>
              <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto lg:max-h-[calc(100vh-280px)]">
                {shown.map(({ component, depth }) => {
                  const picked = component.id === current?.id;
                  return (
                    <li
                      key={component.id}
                      className={cn(picked && selectedRow, "first:rounded-none last:rounded-b-xl")}
                    >
                      <Link
                        href={`/studio?c=${encodeURIComponent(component.id)}`}
                        scroll={false}
                        aria-current={picked ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-muted/60",
                          depth === 1 && "pl-9",
                          picked && "font-semibold",
                        )}
                      >
                        <span className="truncate">{component.name}</span>
                        {component.kind === "wrapper" && (
                          <Badge variant="outline" className="shrink-0">
                            Loots
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
                {!shown.length && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">No matches for &ldquo;{query}&rdquo;</li>
                )}
              </ul>
            </div>
          </nav>

          {current && (
            <section aria-labelledby="studio-picked" className="min-w-0">
              <div className={cn(panel, "p-5 md:p-6")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="studio-picked" className="font-heading text-xl font-semibold tracking-tight">
                    {current.name}
                  </h2>
                  <code className="text-xs text-muted-foreground">{current.file}</code>
                </div>
                <div className="mt-5 flex min-h-56 items-center justify-center rounded-lg border border-dashed p-6">
                  {Preview ? (
                    <div className="flex w-full flex-col items-center gap-4">
                      <Preview />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No preview for {current.name}</p>
                  )}
                </div>
              </div>

              <dl className={cn(panel, "mt-5 grid grid-cols-[1fr_2fr] gap-x-6 gap-y-3 p-5 text-sm md:p-6")}>
                <dt className="text-muted-foreground">Exports</dt>
                <dd className="font-mono text-xs leading-6">{current.exports.join(", ")}</dd>
                {current.wraps && (
                  <>
                    <dt className="text-muted-foreground">Built on</dt>
                    <dd>
                      <Link
                        href={`/studio?c=${encodeURIComponent(current.wraps)}`}
                        scroll={false}
                        className="underline-offset-4 hover:underline"
                      >
                        {manifest.components.find((component) => component.id === current.wraps)?.name ?? current.wraps}
                      </Link>
                    </dd>
                  </>
                )}
                {current.variants.map((group) => (
                  <div key={group.name} className="contents">
                    <dt className="text-muted-foreground capitalize">{group.name}</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {group.options.map((option) => (
                        <Badge key={option} variant={option === group.defaultOption ? "secondary" : "outline"}>
                          {option}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
