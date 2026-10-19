"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, PanelLeft, Sun } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { filterTree, treeOrder, type StudioComponent, type StudioManifest } from "@/features/design-studio/manifest";
import { cn } from "@/lib/utils";
import { Preview, StudioGraph, type Theme } from "./studio-graph";
import { StudioTree } from "./studio-tree";

/** True from 1024px, where the tree sits beside the canvas and the canvas is the graph. Below it the canvas shows the
 *  picked component alone (G3). */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

/** Light and Dark for the preview only, from the canvas toolbar (A2, G3). */
function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={theme}
      onValueChange={(value) => value && onChange(value as Theme)}
      aria-label="Preview theme"
    >
      <ToggleGroupItem value="light" aria-label="Light">
        <Sun aria-hidden="true" />
        <span className="hidden sm:inline">Light</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark">
        <Moon aria-hidden="true" />
        <span className="hidden sm:inline">Dark</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** On a phone, the picked component as one node (G3): its name, Loots on a wrapper, and the live component inside. */
function Node({ component, theme }: { component: StudioComponent; theme: Theme }) {
  return (
    <figure
      className="flex w-full max-w-xl flex-col rounded-[14px] border border-selected/55 bg-card ring-3 ring-selected/15"
      aria-label={`${component.name} preview`}
    >
      <figcaption className="flex h-9 items-center gap-1.5 px-3 text-sm font-medium">
        {component.name}
        {component.kind === "wrapper" && (
          <Badge variant="outline" className="ml-auto">
            Loots
          </Badge>
        )}
      </figcaption>
      <div
        className={cn(
          "mx-2 mb-2 flex min-h-48 flex-col items-center justify-center gap-4 rounded-[10px] border bg-background p-6 text-foreground",
          theme === "dark" && "dark",
        )}
      >
        <Preview id={component.id} />
      </div>
    </figure>
  );
}

/** The inspector's header and facts (D2). Its Preview, Look and Tokens tabs and their controls come with drafts. */
function Facts({ component, manifest }: { component: StudioComponent; manifest: StudioManifest }) {
  const base = component.wraps && manifest.components.find((c) => c.id === component.wraps);
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
      <dt className="text-muted-foreground">Library</dt>
      <dd className="font-semibold">This repo</dd>
      {base && (
        <>
          <dt className="text-muted-foreground">Built on</dt>
          <dd>
            <Link
              href={`/studio?c=${encodeURIComponent(base.id)}`}
              scroll={false}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {base.name}
            </Link>
          </dd>
        </>
      )}
      <dt className="text-muted-foreground">File</dt>
      <dd className="font-mono break-all">apps/web/src/{component.file}</dd>
    </dl>
  );
}

function Details({ component }: { component: StudioComponent }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-sm font-medium">Exports</h3>
        <p className="font-mono text-xs leading-6 break-words text-muted-foreground">{component.exports.join(", ")}</p>
      </section>
      {component.variants.map((group) => (
        <section key={group.name} className="grid gap-2">
          <h3 className="text-sm font-medium">
            <span className="capitalize">{group.name}</span>{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">{group.name}</span>
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {group.options.map((option) => (
              <li key={option}>
                <Badge
                  variant="outline"
                  className={cn("h-7 px-2.5 text-sm", option === group.defaultOption && "border-foreground bg-muted")}
                >
                  {option}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The Design Studio (docs/architecture/design-studio.md): the workspace frame from mockup frames A1 and A2, with
 *  this repo's components in the tree, all of them live in the graph, and the picked one's facts in the inspector. */
export function StudioWorkspace({
  email,
  manifest,
  selected,
}: {
  email: string;
  manifest: StudioManifest;
  selected: string;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [treeOpen, setTreeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const find = useRef<HTMLInputElement>(null);
  const wide = useWide();
  const router = useRouter();
  const rows = useMemo(() => treeOrder(manifest.components), [manifest.components]);
  const shown = useMemo(() => new Set(filterTree(rows, query).map((row) => row.component.id)), [rows, query]);
  const pick = useCallback(
    (id: string) => router.push(`/studio?c=${encodeURIComponent(id)}`, { scroll: false }),
    [router],
  );
  // Open on the top row of This repo, as decided after the mockups.
  const current = manifest.components.find((component) => component.id === selected) ?? rows[0]?.component;

  return (
    <WorkspaceShell email={email} active="studio">
      <div className="flex flex-col xl:h-[calc(100svh-75px)]">
        <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 lg:h-16 lg:py-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Design Studio</h1>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-4 lg:hidden">
          <Sheet open={treeOpen} onOpenChange={setTreeOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <PanelLeft aria-hidden="true" />
                Components
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-75 gap-0 p-0">
              <SheetHeader className="h-14 justify-center px-4">
                <SheetTitle>Components</SheetTitle>
              </SheetHeader>
              <StudioTree
                components={manifest.components}
                picked={current?.id ?? ""}
                query={query}
                onQueryChange={setQuery}
                onPick={() => setTreeOpen(false)}
                className="flex-1"
              />
            </SheetContent>
          </Sheet>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>

        {current && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:pl-4 xl:flex xl:flex-row xl:items-stretch">
            <StudioTree
              components={manifest.components}
              picked={current.id}
              query={query}
              onQueryChange={setQuery}
              findRef={find}
              className="mb-4 hidden w-70 shrink-0 rounded-xl border bg-card lg:sticky lg:top-2 lg:row-span-2 lg:flex lg:h-[calc(100svh-160px)] xl:static xl:h-auto"
            />

            <section
              aria-label="Canvas"
              className="flex min-w-0 flex-1 flex-col gap-2 px-4 lg:h-[calc(100svh-160px)] lg:pr-4 lg:pl-0 xl:mb-4 xl:h-auto xl:pr-0"
            >
              {wide ? (
                <StudioGraph
                  components={manifest.components}
                  shown={shown}
                  picked={current.id}
                  theme={theme}
                  onPick={pick}
                  onClear={() => setQuery("")}
                  onFind={() => find.current?.focus()}
                  themeToggle={<ThemeToggle theme={theme} onChange={setTheme} />}
                />
              ) : (
                <div className="grid min-h-72 flex-1 place-items-center overflow-auto rounded-xl border bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] p-4 sm:p-8">
                  <Node component={current} theme={theme} />
                </div>
              )}
            </section>

            <aside
              aria-labelledby="studio-picked"
              className="grid content-start gap-5 overflow-y-auto px-4 pt-2 pb-8 lg:pr-4 lg:pl-0 xl:w-96 xl:shrink-0 xl:rounded-tl-xl xl:border-t xl:border-l xl:p-0"
            >
              <div className="grid gap-2 xl:px-4 xl:pt-6 xl:pb-5">
                <h2 id="studio-picked" className="font-heading text-xl font-semibold tracking-tight">
                  {current.name}
                </h2>
                <Facts component={current} manifest={manifest} />
              </div>
              <Separator className="hidden xl:block" />
              <div className="xl:px-4 xl:pb-6">
                <Details component={current} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
