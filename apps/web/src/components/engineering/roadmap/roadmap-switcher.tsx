"use client";

import { useRouter } from "next/navigation";
import { IconChevronDown, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PLAN_MESSAGE } from "@/features/engineering-lab/ask-claude";
import { engineering } from "@/features/engineering-lab/routes";
import { canAddRoadmap, ROADMAP_LIMIT } from "@/features/engineering-lab/roadmaps";
import { AskClaude } from "../ask-claude";

// Moving between roadmaps (docs/architecture/engineering-roadmaps.md, section 1): the page title, with a button beside it
// that opens a menu of the active roadmaps with their progress, and New roadmap. Each roadmap has its own address.

export interface RoadmapChoice {
  id: string;
  goal: string;
  learned: number;
  total: number;
}

export function RoadmapSwitcher({
  title,
  currentId,
  roadmaps,
  projectUrl,
  onNew,
}: {
  title: string;
  currentId: string | null;
  roadmaps: RoadmapChoice[];
  projectUrl: string | null;
  onNew: () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex items-start gap-2">
      <h1 className="min-w-0 text-3xl leading-tight font-bold tracking-tight md:text-4xl">{title}</h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Switch roadmap"
            className="mt-1 shrink-0 md:mt-1.5"
          >
            <IconChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel>Roadmaps</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentId ?? ""}
            onValueChange={(id) => {
              if (id !== currentId) router.push(engineering.roadmap(null, id));
            }}
          >
            {roadmaps.map((roadmap) => (
              <DropdownMenuRadioItem key={roadmap.id} value={roadmap.id}>
                <span className="min-w-0 flex-1 truncate">{roadmap.goal}</span>
                <span className="text-xs text-muted-foreground">
                  {roadmap.learned} of {roadmap.total}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!projectUrl} onSelect={onNew}>
            <IconPlus aria-hidden="true" />
            New roadmap
            {!projectUrl && <span className="ml-auto text-xs">Needs the Project link</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** New roadmap: the planning message for Claude, or, with every place taken, why not. */
export function NewRoadmapDialog({
  active,
  projectUrl,
  open,
  onOpenChange,
}: {
  active: number;
  projectUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (projectUrl && canAddRoadmap(active)) {
    return (
      <AskClaude
        message={PLAN_MESSAGE}
        label="New roadmap"
        projectUrl={projectUrl}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New roadmap</DialogTitle>
          <DialogDescription>
            {projectUrl
              ? `${active} of ${ROADMAP_LIMIT} active · archive one first`
              : "Add the Project link in Claude setup first"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
