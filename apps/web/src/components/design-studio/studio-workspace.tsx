"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Moon, PanelLeft, Sun } from "lucide-react";
import { DockedPanel, useDocked } from "@/components/docked-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { draftStyles, type Draft, type LookChange } from "@/features/design-studio/drafts";
import { filterTree, treeOrder, type StudioComponent, type StudioManifest } from "@/features/design-studio/manifest";
import { cn } from "@/lib/utils";
import { previewProps, type PreviewProps } from "./previews";
import { StudioExport } from "./studio-export";
import { Preview, StudioGraph, type Theme } from "./studio-graph";
import { InspectorBody, InspectorFacts, type InspectorProps } from "./studio-inspector";
import { StudioTree } from "./studio-tree";
import { useDrafts } from "./use-drafts";

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
function Node({ component, theme, props }: { component: StudioComponent; theme: Theme; props: PreviewProps }) {
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
        data-studio-preview={component.id}
        className={cn(
          "mx-2 mb-2 flex min-h-48 flex-col items-center justify-center gap-4 rounded-[10px] border bg-background p-6 text-foreground",
          theme === "dark" && "dark",
        )}
      >
        <Preview id={component.id} props={props} />
      </div>
    </figure>
  );
}

/** Export in the title row (A2, A3): enabled once there is a draft, else "No changes" on hover. */
function ExportButton({ count, onOpen }: { count: number; onOpen: () => void }) {
  const button = (
    <Button variant="outline" size="sm" disabled={!count} onClick={onOpen}>
      <Download aria-hidden="true" />
      Export
    </Button>
  );
  if (count) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>No changes</TooltipContent>
    </Tooltip>
  );
}

/** The Design Studio (docs/architecture/design-studio.md): the workspace frame from mockup frames A1 to A3, with
 *  this repo's components in the tree, all of them live in the graph, and the picked one, or the Theme, in the
 *  inspector. Drafts re-render every preview at once and save a second after the last change. */
export function StudioWorkspace({
  email,
  manifest,
  selected,
  initialDrafts,
}: {
  email: string;
  manifest: StudioManifest;
  selected: string;
  initialDrafts: Draft[];
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [treeOpen, setTreeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [changedOnly, setChangedOnly] = useState(false);
  const [preview, setPreview] = useState<Record<string, PreviewProps>>({});
  const [ringed, setRinged] = useState<Set<string>>(() => new Set());
  const find = useRef<HTMLInputElement>(null);
  const wide = useWide();
  const docked = useDocked();
  const router = useRouter();
  const { drafts, status, change, discard, retry } = useDrafts(initialDrafts);
  const rows = useMemo(() => treeOrder(manifest.components), [manifest.components]);
  const changed = useMemo(
    () => new Set(drafts.filter((draft) => draft.kind === "component").map((draft) => draft.target)),
    [drafts],
  );
  const shown = useMemo(
    () => new Set(filterTree(rows, query, changedOnly ? changed : undefined).map((row) => row.component.id)),
    [rows, query, changedOnly, changed],
  );
  const pick = useCallback(
    (id: string) => router.push(`/studio?c=${encodeURIComponent(id)}`, { scroll: false }),
    [router],
  );
  const unpick = useCallback(() => router.push("/studio", { scroll: false }), [router]);
  // Nothing in the address shows the Theme (A1, D1); the canvas still opens on the top row of This repo.
  const current = manifest.components.find((component) => component.id === selected);

  /** A sample's props: its defaults, the Preview tab's changes, and a wrapper's Look variant (D6). */
  const propsOf = useCallback(
    (id: string): PreviewProps => {
      const look = drafts.find((draft) => draft.kind === "component" && draft.target === id)?.change as
        LookChange | undefined;
      return { ...previewProps[id], ...preview[id], ...(look?.variant ? { variant: look.variant } : {}) };
    },
    [drafts, preview],
  );

  // A token change rings every node that uses it for a second, so its reach shows (F).
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDraft = useCallback(
    (draft: Draft) => {
      change(draft);
      if (draft.kind !== "token") return;
      setRinged(
        new Set(manifest.components.filter((item) => item.tokens.includes(draft.target)).map((item) => item.id)),
      );
      if (ringTimer.current) clearTimeout(ringTimer.current);
      ringTimer.current = setTimeout(() => setRinged(new Set()), 1000);
    },
    [change, manifest.components],
  );
  useEffect(
    () => () => {
      if (ringTimer.current) clearTimeout(ringTimer.current);
    },
    [],
  );

  const inspector: InspectorProps = {
    component: current,
    manifest,
    drafts,
    status,
    preview: current ? { ...previewProps[current.id], ...preview[current.id] } : {},
    onPreview: (values) => {
      if (current) setPreview((all) => ({ ...all, [current.id]: values }));
    },
    onDraft,
    onDiscard: (keys) => void discard(keys),
    onRetry: () => void retry(),
  };
  // Keyed by component, so each opens on Preview with its own fields.
  const body = <InspectorBody key={current?.id ?? "theme"} {...inspector} />;
  const panel = (isDocked: boolean) => (
    <DockedPanel
      open={isDocked || Boolean(current)}
      docked={isDocked}
      onClose={current ? unpick : undefined}
      closeLabel={`Close ${current?.name ?? "inspector"}`}
      badges={current?.kind === "wrapper" && <Badge variant="outline">Loots</Badge>}
      title={current?.name ?? "Theme"}
      descriptionFallback={current ? `${current.name} inspector` : "Theme tokens"}
      facts={<InspectorFacts component={current} manifest={manifest} />}
    >
      {body}
    </DockedPanel>
  );
  const tree = { components: manifest.components, picked: current?.id ?? "", changed, changedOnly, query };

  return (
    <WorkspaceShell email={email} active="studio">
      <style>{draftStyles(drafts, manifest.components)}</style>
      <div className="flex flex-col xl:h-[calc(100svh-75px)]">
        <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 lg:h-16 lg:py-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Design Studio</h1>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && <Badge variant="secondary">Changed {drafts.length}</Badge>}
            <ExportButton count={drafts.length} onOpen={() => setExportOpen(true)} />
          </div>
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
                {...tree}
                onChangedOnly={setChangedOnly}
                onQueryChange={setQuery}
                onPick={() => setTreeOpen(false)}
                className="flex-1"
              />
            </SheetContent>
          </Sheet>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:pl-4 xl:flex xl:flex-row xl:items-stretch">
          <StudioTree
            {...tree}
            onChangedOnly={setChangedOnly}
            onQueryChange={setQuery}
            findRef={find}
            className="mb-4 hidden w-70 shrink-0 rounded-xl border bg-card lg:sticky lg:top-2 lg:row-span-2 lg:flex lg:h-[calc(100svh-160px)] xl:static xl:h-auto"
          />

          {(wide || current) && (
            <section
              aria-label="Canvas"
              className="flex min-w-0 flex-1 flex-col gap-2 px-4 lg:h-[calc(100svh-160px)] lg:pr-4 lg:pl-0 xl:mb-4 xl:h-auto xl:pr-0"
            >
              {wide ? (
                <StudioGraph
                  components={manifest.components}
                  shown={shown}
                  picked={current?.id ?? ""}
                  changed={changed}
                  ringed={ringed}
                  previewProps={propsOf}
                  noChanges={changedOnly && !changed.size}
                  theme={theme}
                  onPick={pick}
                  onClear={() => {
                    setQuery("");
                    setChangedOnly(false);
                  }}
                  onFind={() => find.current?.focus()}
                  themeToggle={<ThemeToggle theme={theme} onChange={setTheme} />}
                />
              ) : (
                current && (
                  <div className="grid min-h-72 flex-1 place-items-center overflow-auto rounded-xl border bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] p-4 sm:p-8">
                    <Node component={current} theme={theme} props={propsOf(current.id)} />
                  </div>
                )
              )}
            </section>
          )}

          {wide && docked && panel(true)}
        </div>

        {/* From 1024 to 1279px the inspector is a Sheet over the page when something is picked (G2). */}
        {wide && !docked && panel(false)}

        {/* On a phone, the inspector's header and tabs stack under the preview (G3). */}
        {!wide && (
          <section aria-labelledby="studio-picked" className="mt-4 flex flex-col border-t">
            <div className="grid gap-2.5 p-4">
              <h2 id="studio-picked" className="font-heading text-xl leading-tight font-bold tracking-tight">
                {current?.name ?? "Theme"}
              </h2>
              <InspectorFacts component={current} manifest={manifest} />
            </div>
            {body}
          </section>
        )}
      </div>

      <StudioExport
        open={exportOpen}
        onOpenChange={setExportOpen}
        drafts={drafts}
        manifest={manifest}
        onDiscard={(keys) => void discard(keys)}
      />
    </WorkspaceShell>
  );
}
