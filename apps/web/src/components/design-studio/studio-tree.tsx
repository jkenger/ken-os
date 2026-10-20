"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Layers, Search, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { filterTree, treeOrder, type StudioComponent } from "@/features/design-studio/manifest";
import { cn } from "@/lib/utils";
import { ChangedDot } from "./studio-inspector";

/** The studio's component tree (mockup frames B1 to B3, B5 to B7): find and Changed, then one branch per library with
 *  each component as a row, a dot on the ones with a draft, and Loots wrappers nested under the primitive they're built
 *  on. Only This repo exists until step 4, so the Library and Installed filters wait for it. The find query and Changed
 *  are the workspace's, since they filter the canvas too. */
export function StudioTree({
  components,
  picked,
  changed,
  changedOnly,
  onChangedOnly,
  query,
  onQueryChange,
  findRef,
  onPick,
  className,
}: {
  components: StudioComponent[];
  picked: string;
  /** Ids with a draft. */
  changed: Set<string>;
  changedOnly: boolean;
  onChangedOnly: (on: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** The find field, for the canvas toolbar's Find button. */
  findRef?: RefObject<HTMLInputElement | null>;
  onPick?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const switchId = useId();
  const ownFind = useRef<HTMLInputElement>(null);
  const find = findRef ?? ownFind;
  const list = useRef<HTMLDivElement>(null);
  const rows = treeOrder(components);
  const shown = filterTree(rows, query, changedOnly ? changed : undefined);

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

  // Keep the picked row in view, such as after opening /studio?c=ui/tooltip.
  useEffect(() => {
    list.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest" });
  }, [picked]);

  return (
    <nav aria-label="Components" className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <div className="border-b p-3">
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
        <div className="mt-3 flex items-center gap-2">
          <Switch id={`${switchId}-changed`} size="sm" checked={changedOnly} onCheckedChange={onChangedOnly} />
          <Label htmlFor={`${switchId}-changed`} className="font-normal">
            Changed
          </Label>
        </div>
      </div>

      <div ref={list} className="min-h-0 flex-1 overflow-y-auto p-2">
        {shown.length ? (
          <Collapsible open={open || Boolean(query.trim()) || changedOnly} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-1.5 px-2 font-semibold aria-expanded:bg-transparent hover:aria-expanded:bg-muted"
              >
                {open || query.trim() || changedOnly ? (
                  <ChevronDown className="text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronRight className="text-muted-foreground" aria-hidden="true" />
                )}
                This repo
                <span className="ml-auto font-mono text-xs font-normal text-muted-foreground">{rows.length}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-0.5 grid gap-0.5">
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
                        className={cn(
                          "flex h-8 items-center gap-2 rounded-md pr-2 pl-7 text-sm hover:bg-muted",
                          depth === 1 && "pl-12",
                          current && "bg-card ring-1 ring-selected ring-inset hover:bg-card",
                        )}
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
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : changedOnly && !changed.size ? (
          <p className="px-4 py-10 text-center text-sm font-semibold">No changes yet</p>
        ) : (
          <div className="grid justify-items-center gap-3 px-4 py-10 text-center">
            <p className="text-sm font-semibold">No components match</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onQueryChange("");
                onChangedOnly(false);
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
