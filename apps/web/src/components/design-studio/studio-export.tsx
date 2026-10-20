"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { describeDraft, draftKey, draftPatch, type Draft } from "@/features/design-studio/drafts";
import type { StudioManifest } from "@/features/design-studio/manifest";
import { cn } from "@/lib/utils";

// Export (docs/architecture/design-studio.md, step 3; mockup frames E1, E2 and E5): the drafts grouped Tokens and
// Components, each with Discard, then the patch to paste into a local checkout. The Claude tab (E3) comes with the
// connector tool in step 5.

function Row({
  name,
  mono,
  loots,
  what,
  onDiscard,
}: {
  name: string;
  /** Token names are code. */
  mono?: boolean;
  loots?: boolean;
  what: string;
  onDiscard: () => void;
}) {
  return (
    <li className="grid min-h-10 grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-muted py-1 pr-1 pl-3 text-sm">
      <span className="flex min-w-0 items-center gap-2 font-medium">
        <span className={cn("truncate", mono && "font-mono text-[13px]")}>{name}</span>
        {loots && <Badge variant="outline">Loots</Badge>}
      </span>
      <span className="text-[13px] text-muted-foreground">{what}</span>
      <Button variant="ghost" size="sm" onClick={onDiscard}>
        Discard
      </Button>
    </li>
  );
}

export function StudioExport({
  open,
  onOpenChange,
  drafts,
  manifest,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: Draft[];
  manifest: StudioManifest;
  onDiscard: (keys: Pick<Draft, "kind" | "target">[] | "all") => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const patch = useMemo(() => draftPatch(drafts, manifest), [drafts, manifest]);
  const tokens = drafts.filter((draft) => draft.kind === "token");
  const components = drafts.filter((draft) => draft.kind === "component");
  const discard = (draft: Draft) => {
    onDiscard([{ kind: draft.kind, target: draft.target }]);
    if (drafts.length === 1) onOpenChange(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(patch.text);
      toast({ tone: "success", title: "Patch copied" });
    } catch {
      toast({ tone: "error", title: "Couldn't copy" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-5 sm:max-w-180">
          <DialogHeader>
            <DialogTitle>Export changes</DialogTitle>
            <DialogDescription className="sr-only">Drafts and their patch</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-56 gap-3.5 overflow-y-auto">
            {[
              { title: "Tokens", items: tokens },
              { title: "Components", items: components },
            ].map(
              (group) =>
                group.items.length > 0 && (
                  <section key={group.title} aria-label={group.title} className="grid gap-1.5">
                    <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>
                    <ul className="grid gap-1.5">
                      {group.items.map((draft) => {
                        const component = manifest.components.find((item) => item.id === draft.target);
                        return (
                          <Row
                            key={draftKey(draft)}
                            name={component?.name ?? draft.target}
                            mono={draft.kind === "token"}
                            loots={component?.kind === "wrapper"}
                            what={describeDraft(draft, manifest.theme)}
                            onDiscard={() => discard(draft)}
                          />
                        );
                      })}
                    </ul>
                  </section>
                ),
            )}
          </div>
          <div className="grid gap-2.5">
            <h3 className="text-sm font-medium">Patch</h3>
            <pre
              aria-label="Patch"
              className="max-h-60 overflow-auto rounded-xl border bg-background py-2.5 font-mono text-xs leading-[18px]"
            >
              {patch.text
                .replace(/\n$/, "")
                .split("\n")
                .map((line, index) => (
                  <span
                    key={index}
                    className={cn(
                      "block px-3.5",
                      /^(---|\+\+\+) /.test(line) && "font-semibold",
                      line.startsWith("@@") && "text-muted-foreground",
                      /^\+(?!\+\+ )/.test(line) && "bg-topic-learned/12",
                      /^-(?!-- )/.test(line) && "bg-destructive/10",
                    )}
                  >
                    {line || " "}
                  </span>
                ))}
            </pre>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {patch.files} {patch.files === 1 ? "file" : "files"}
              </span>
              <Button size="sm" onClick={copy} disabled={!patch.text}>
                <Copy aria-hidden="true" />
                Copy patch
              </Button>
            </div>
          </div>
          <div className="border-t pt-4">
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirm(true)}>
              Discard all
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Discard {drafts.length} {drafts.length === 1 ? "change" : "changes"}?
            </DialogTitle>
            <DialogDescription>Removes every draft</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                onDiscard("all");
                setConfirm(false);
                onOpenChange(false);
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
