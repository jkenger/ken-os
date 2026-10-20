"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, Layers, Search, Square, SquareDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  filterLibrary,
  filterTree,
  treeOrder,
  type StudioComponent,
  type StudioLibrary,
  type TreeFilters,
} from "@/features/design-studio/manifest";
import { cn } from "@/lib/utils";
import { ChangedDot } from "./studio-inspector";

/** One library's branch: its name and count, open or folded. Find and Changed open it, so a match is never hidden. */
function Branch({
  name,
  count,
  open,
  onOpenChange,
  children,
}: {
  name: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1.5 px-2 font-semibold aria-expanded:bg-transparent hover:aria-expanded:bg-muted"
        >
          {open ? (
            <ChevronDown className="text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="text-muted-foreground" aria-hidden="true" />
          )}
          {name}
          <span className="ml-auto font-mono text-xs font-normal text-muted-foreground">{count}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-0.5 grid gap-0.5">{children}</ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

const rowClass = "flex h-8 items-center gap-2 rounded-md pr-2 pl-7 text-sm hover:bg-muted";
const pickedClass = "bg-card ring-1 ring-selected ring-inset hover:bg-card";

/** The studio's component tree (mockup frames B1 to B7): find, the Library, Installed and Changed filters, then one
 *  branch per library. This repo lists each component with a dot on the ones with a draft, and Loots wrappers nested
 *  under the primitive they're built on. Another library lists its items: one installed here reads Installed and picks
 *  This repo's node, since the canvas draws it once (B4). The find query and the filters are the workspace's, since
 *  they filter the canvas too. */
export function StudioTree({
  components,
  libraries,
  picked,
  changed,
  changedOnly,
  onChangedOnly,
  filters,
  onFilters,
  query,
  onQueryChange,
  findRef,
  onPick,
  className,
}: {
  components: StudioComponent[];
  libraries: StudioLibrary[];
  picked: string;
  /** Ids with a draft. */
  changed: Set<string>;
  changedOnly: boolean;
  onChangedOnly: (on: boolean) => void;
  filters: TreeFilters;
  onFilters: (filters: TreeFilters) => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** The find field, for the canvas toolbar's Find button. */
  findRef?: RefObject<HTMLInputElement | null>;
  onPick?: () => void;
  className?: string;
}) {
  // This repo starts open and the other libraries folded (B1); a large one stays folded until it is opened.
  const [open, setOpen] = useState<Record<string, boolean>>({ repo: true });
  const switchId = useId();
  const ownFind = useRef<HTMLInputElement>(null);
  const find = findRef ?? ownFind;
  const list = useRef<HTMLDivElement>(null);
  const rows = treeOrder(components);
  const repoShown = filters.library === "all" || filters.library === "repo";
  const shown = repoShown ? filterTree(rows, query, changedOnly ? changed : undefined) : [];
  const branches = libraries
    .filter((library) => filters.library === "all" || filters.library === library.id)
    .map((library) => ({
      library,
      items: filterLibrary(library.items, query, {
        installedOnly: filters.installedOnly,
        changed: changedOnly ? changed : undefined,
      }),
    }))
    .filter((branch) => branch.items.length);
  const forced = Boolean(query.trim()) || changedOnly;
  const isOpen = (id: string) => forced || filters.library === id || Boolean(open[id]);
  const setBranch = (id: string) => (next: boolean) => setOpen((all) => ({ ...all, [id]: next }));

  // "/" finds a component, unless the owner is already typing somewhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      find.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [find]);

  // Opening /studio?c=shadcn/form opens its branch, and the picked row is kept in view.
  const pickedLibrary = libraries.find((library) => library.items.some((item) => item.id === picked))?.id;
  useEffect(() => {
    if (pickedLibrary) setOpen((all) => (all[pickedLibrary] ? all : { ...all, [pickedLibrary]: true }));
  }, [pickedLibrary]);
  const pickedOpen = pickedLibrary ? Boolean(open[pickedLibrary]) : true;
  useEffect(() => {
    list.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest" });
  }, [picked, pickedOpen]);

  const clear = () => {
    onQueryChange("");
    onChangedOnly(false);
    onFilters({ library: "all", installedOnly: false });
  };

  return (
    <nav aria-label="Components" className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <div className="grid gap-2.5 border-b p-3">
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={find}
            placeholder="Find a component"
            aria-label="Find a component"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <kbd className="rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">/</kbd>
          </InputGroupAddon>
        </InputGroup>
        <div className="grid gap-1.5">
          <Label htmlFor={`${switchId}-library`} className="text-xs font-semibold text-muted-foreground">
            Library
          </Label>
          <NativeSelect
            id={`${switchId}-library`}
            size="sm"
            className="w-full"
            value={filters.library}
            onChange={(event) => onFilters({ ...filters, library: event.target.value })}
          >
            <NativeSelectOption value="all">All libraries</NativeSelectOption>
            <NativeSelectOption value="repo">This repo</NativeSelectOption>
            {libraries.map((library) => (
              <NativeSelectOption key={library.id} value={library.id}>
                {library.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={filters.installedOnly ? "installed" : "all"}
            onValueChange={(value) => value && onFilters({ ...filters, installedOnly: value === "installed" })}
            aria-label="Show"
          >
            <ToggleGroupItem value="installed">Installed</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center gap-2">
            <Switch id={`${switchId}-changed`} size="sm" checked={changedOnly} onCheckedChange={onChangedOnly} />
            <Label htmlFor={`${switchId}-changed`} className="font-normal">
              Changed
            </Label>
          </div>
        </div>
      </div>

      <div ref={list} className="min-h-0 flex-1 overflow-y-auto p-2">
        {shown.length || branches.length ? (
          <>
            {shown.length > 0 && (
              <Branch name="This repo" count={rows.length} open={isOpen("repo")} onOpenChange={setBranch("repo")}>
                {shown.map(({ component, depth }) => {
                  const current = component.id === picked;
                  const Icon = component.kind === "wrapper" ? Layers : Square;
                  return (
                    <li key={component.id}>
                      <Link
                        href={`/studio?c=${encodeURIComponent(component.id)}`}
                        scroll={false}
                        onClick={onPick}
                        aria-current={current ? "page" : undefined}
                        title={component.kind === "wrapper" ? `${component.name}, Loots` : component.name}
                        className={cn(rowClass, depth === 1 && "pl-12", current && pickedClass)}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                        <span className="truncate">{component.name}</span>
                        {changed.has(component.id) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ChangedDot />
                            </TooltipTrigger>
                            <TooltipContent>Changed</TooltipContent>
                          </Tooltip>
                        )}
                        {component.kind === "wrapper" && (
                          <Badge variant="outline" className="ml-auto shrink-0">
                            Loots
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </Branch>
            )}
            {branches.map(({ library, items }) => (
              <Branch
                key={library.id}
                name={library.name}
                count={library.items.length}
                open={isOpen(library.id)}
                onOpenChange={setBranch(library.id)}
              >
                {items.map((item) => {
                  const current = item.id === picked;
                  const Icon = item.installed ? Square : SquareDashed;
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/studio?c=${encodeURIComponent(item.installed ?? item.id)}`}
                        scroll={false}
                        onClick={onPick}
                        aria-current={current ? "page" : undefined}
                        title={item.installed ? `${item.name}, Installed` : `${item.name}, Not installed`}
                        className={cn(rowClass, current && pickedClass)}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                        <span className="truncate">{item.name}</span>
                        {item.installed && (
                          <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Check className="size-3" aria-hidden="true" />
                            Installed
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </Branch>
            ))}
          </>
        ) : changedOnly && !changed.size ? (
          <p className="px-4 py-10 text-center text-sm font-semibold">No changes yet</p>
        ) : (
          <div className="grid justify-items-center gap-3 px-4 py-10 text-center">
            <p className="text-sm font-semibold">No components match</p>
            <Button variant="outline" size="sm" onClick={clear}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
