"use client";

import { useRouter } from "next/navigation";
import { IconArchive, IconChevronDown, IconPlus, IconTrash } from "@tabler/icons-react";
import { formatDate } from "@/components/lab/words";
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
// that opens a menu of the active roadmaps with their progress, New roadmap, Archive and Delete for the one shown, and the
// archived ones, which open read-only with Restore. Each roadmap has its own address.

export interface RoadmapChoice {
  id: string;
  goal: string;
  learned: number;
  total: number;
}

export interface ArchivedChoice {
  id: string;
  goal: string;
  archivedAt: string | null;
  /** Set on a version Re-plan replaced. */
  replacedBy: string | null;
}

export function RoadmapSwitcher({
  title,
  currentId,
  roadmaps,
  archived,
  projectUrl,
  onNew,
  onArchive,
  onDelete,
}: {
  title: string;
  currentId: string | null;
  roadmaps: RoadmapChoice[];
  archived: ArchivedChoice[];
  projectUrl: string | null;
  onNew: () => void;
  /** Archives the roadmap shown; null when it's already archived. */
  onArchive: (() => void) | null;
  /** Asks to delete the roadmap shown; null for the target role's path. */
  onDelete: (() => void) | null;
}) {
  const router = useRouter();
  return (
    <div className="flex items-start gap-2">
      <h1 className="min-w-0 font-heading text-2xl leading-tight font-semibold tracking-tight md:text-3xl">{title}</h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Switch roadmap"
            className="mt-0.5 shrink-0 md:mt-1"
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
          {onArchive && (
            <DropdownMenuItem onSelect={onArchive}>
              <IconArchive aria-hidden="true" />
              Archive this roadmap
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <IconTrash aria-hidden="true" />
              Delete this roadmap
            </DropdownMenuItem>
          )}
          {archived.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Archived</DropdownMenuLabel>
              {archived.map((roadmap) => (
                <DropdownMenuItem
                  key={roadmap.id}
                  onSelect={() => router.push(engineering.roadmap(null, roadmap.id))}
                  aria-current={roadmap.id === currentId ? "true" : undefined}
                  className="aria-[current=true]:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{roadmap.goal}</span>
                  {roadmap.archivedAt && (
                    <span className="text-xs text-muted-foreground">
                      {roadmap.replacedBy ? "Replaced" : "Archived"} {formatDate(roadmap.archivedAt)}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}
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

/** Delete: confirms before the roadmap and its replaced versions go. Topic progress stays. */
export function DeleteRoadmapDialog({
  goal,
  open,
  busy,
  onOpenChange,
  onConfirm,
}: {
  goal: string;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {goal}?</DialogTitle>
          <DialogDescription>Can't be undone · topic progress and notes stay</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
            Delete roadmap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
