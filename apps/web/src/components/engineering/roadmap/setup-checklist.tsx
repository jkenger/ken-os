"use client";

import { useState } from "react";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PLAN_MESSAGE } from "@/features/engineering-lab/ask-claude";
import { setupChecklist, type SetupFacts, type SetupItemId } from "@/features/engineering-lab/claude-setup";
import { AskClaude } from "../ask-claude";
import { cn } from "@/lib/utils";
import { panel } from "../kit";

// The first-visit path (docs/architecture/engineering-progressive-flow.md, section 1): four rows, in order, each with
// its state and one action. It replaces the "No roadmap" box and hides once setup is done. Once a roadmap is planned it
// starts folded to one row with the next step's action, so the roadmap sits near the top; the steps are one click away.

const rows: Record<SetupItemId, { title: string; helper: string; action: string }> = {
  connect: { title: "Connect Loots", helper: "Add Loots as a connector in Claude", action: "Connect" },
  instructions: {
    title: "Project instructions",
    helper: "Paste them into your Claude Project",
    action: "Get instructions",
  },
  project: { title: "Project link", helper: "The Project Ask Claude opens", action: "Add link" },
  plan: { title: "Plan roadmap", helper: "Showing every topic until then", action: "Plan with Claude" },
};

function Action({
  id,
  primary,
  projectUrl,
  onOpenSetup,
}: {
  id: SetupItemId;
  primary: boolean;
  projectUrl: string | null;
  onOpenSetup: () => void;
}) {
  const row = rows[id];
  const variant = primary ? "default" : "outline";
  if (id !== "plan") {
    return (
      <Button type="button" size="sm" variant={variant} onClick={onOpenSetup}>
        {row.action}
      </Button>
    );
  }
  if (projectUrl)
    return <AskClaude message={PLAN_MESSAGE} label={row.action} projectUrl={projectUrl} variant={variant} />;
  return <Badge variant="outline">Needs the Project link</Badge>;
}

export function SetupChecklist({
  facts,
  projectUrl,
  onOpenSetup,
}: {
  facts: SetupFacts;
  projectUrl: string | null;
  onOpenSetup: () => void;
}) {
  const { items, done } = setupChecklist(facts);
  const next = items.find((item) => !item.done)?.id;
  const [open, setOpen] = useState(!facts.planned);
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section aria-labelledby="setup-title" className={panel}>
        <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3", open && "border-b")}>
          <h2 id="setup-title" className="font-semibold">
            Set up
          </h2>
          <Badge variant="outline">
            {done} of {items.length}
          </Badge>
          {!open && next && (
            <p className="min-w-0 text-sm text-muted-foreground">
              Next: <span className="font-medium text-foreground">{rows[next].title}</span>
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!open && next && <Action id={next} primary projectUrl={projectUrl} onOpenSetup={onOpenSetup} />}
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <IconChevronDown aria-hidden="true" className={open ? "rotate-180" : undefined} />
                {open ? "Hide steps" : "Show steps"}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent asChild>
          <ol>
            {items.map((item, index) => {
              const row = rows[item.id];
              const out = item.id === "instructions" && facts.instructions === "out_of_date";
              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[1.75rem_1fr] items-center gap-x-3 gap-y-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[1.75rem_1fr_auto]"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-7 items-center justify-center rounded-full border text-xs font-semibold"
                  >
                    {item.done ? <IconCheck className="size-4" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {row.title}
                      <span className="sr-only">{item.done ? ", done" : ", not done"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {out ? "Out of date · copy them again" : row.helper}
                    </p>
                  </div>
                  <div className="col-start-2 sm:col-start-3">
                    {item.done ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">Done</Badge>
                        {/* A finished step can still be wrong (a mistyped Project link), so it keeps a way back in. */}
                        {item.id !== "plan" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Edit ${row.title}`}
                            onClick={onOpenSetup}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Action
                        id={item.id}
                        primary={item.id === next}
                        projectUrl={projectUrl}
                        onOpenSetup={onOpenSetup}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
