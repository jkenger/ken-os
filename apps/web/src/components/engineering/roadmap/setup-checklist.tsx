"use client";

import { IconCheck } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_MESSAGE } from "@/features/engineering-lab/ask-claude";
import { setupChecklist, type SetupFacts, type SetupItemId } from "@/features/engineering-lab/claude-setup";
import { AskClaude } from "../ask-claude";
import { panel } from "../kit";

// The first-visit path (docs/architecture/engineering-progressive-flow.md, section 1): four rows, in order, each with
// its state and one action. It replaces the "No roadmap" box and hides once setup is done.

const rows: Record<SetupItemId, { title: string; helper: string; action: string }> = {
  connect: { title: "Connect Ken OS", helper: "Add Ken OS as a connector in Claude", action: "Connect" },
  instructions: {
    title: "Project instructions",
    helper: "Paste them into your Claude Project",
    action: "Get instructions",
  },
  project: { title: "Project link", helper: "The Project Ask Claude opens", action: "Add link" },
  plan: { title: "Plan roadmap", helper: "Showing every topic until then", action: "Plan with Claude" },
};

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
  return (
    <section aria-labelledby="setup-title" className={panel}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 id="setup-title" className="font-semibold">
          Set up
        </h2>
        <Badge variant="outline">
          {done} of {items.length}
        </Badge>
      </div>
      <ol>
        {items.map((item, index) => {
          const row = rows[item.id];
          const out = item.id === "instructions" && facts.instructions === "out_of_date";
          const variant = item.id === next ? "default" : "outline";
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
                <p className="text-xs text-muted-foreground">{out ? "Out of date · copy them again" : row.helper}</p>
              </div>
              <div className="col-start-2 sm:col-start-3">
                {item.done ? (
                  <Badge variant="secondary">Done</Badge>
                ) : item.id !== "plan" ? (
                  <Button type="button" size="sm" variant={variant} onClick={onOpenSetup}>
                    {row.action}
                  </Button>
                ) : projectUrl ? (
                  <AskClaude message={PLAN_MESSAGE} label={row.action} projectUrl={projectUrl} variant={variant} />
                ) : (
                  <Badge variant="outline">Needs the Project link</Badge>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
