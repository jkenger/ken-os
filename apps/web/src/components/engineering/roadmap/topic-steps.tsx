"use client";

import type { ReactNode } from "react";
import { IconArrowRight, IconCheck, IconCode, IconExternalLink, IconMinus } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TopicPanelView } from "@/features/engineering-lab/roadmap-store";
import { topicSteps, type StepId, type StepState } from "@/features/engineering-lab/topic-steps";
import { AskClaude } from "../ask-claude";

// The path inside a topic (docs/architecture/engineering-progressive-flow.md, sections 2 and 3): Learn → Practice,
// the same one Claude follows in chat, with the next step as the main button. A finished topic shows Next topic,
// and Chapter done when it finished its chapter.

const titles: Record<StepId, string> = { learn: "Learn", practice: "Practice" };

function stateWord(id: StepId, state: StepState, practice: TopicPanelView["practice"]) {
  if (state === "skipped") return "Skipped";
  if (id === "learn") return state === "done" ? "Started" : "Not started";
  if (state === "done") return "Passed";
  if (state === "none") return "No exercise yet";
  return practice === "tried" ? "Tried · optional" : "Optional";
}

function Marker({ state, number }: { state: StepState; number: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
    >
      {state === "done" ? (
        <IconCheck className="size-3.5" />
      ) : state === "skipped" || state === "none" ? (
        <IconMinus className="size-3.5 text-muted-foreground" />
      ) : (
        number
      )}
    </span>
  );
}

export function TopicSteps({
  panel,
  projectUrl,
  onPractice,
  onSelect,
  showNext = true,
}: {
  panel: TopicPanelView;
  projectUrl: string | null;
  onPractice: () => void;
  onSelect: (topicId: string) => void;
  /** False on an archived roadmap. */
  showNext?: boolean;
}) {
  const { steps, main } = topicSteps({ status: panel.status.status, practice: panel.practice });
  const variant = (id: StepId) => (main === id ? "default" : "outline");

  const actions: Record<StepId, ReactNode> = {
    learn: panel.chatUrl ? (
      <Button asChild size="sm" variant={variant("learn")}>
        <a href={panel.chatUrl} target="_blank" rel="noopener noreferrer">
          Continue chat
          <IconExternalLink aria-hidden="true" />
        </a>
      </Button>
    ) : projectUrl ? (
      <AskClaude topic={panel} projectUrl={projectUrl} variant={variant("learn")} />
    ) : null,
    practice:
      panel.practice === "none" ? null : (
        <Button type="button" size="sm" variant={variant("practice")} onClick={onPractice}>
          <IconCode aria-hidden="true" />
          Try it in code
        </Button>
      ),
  };

  return (
    <section aria-label="Steps" className="grid gap-3">
      {main === "next" && showNext && (
        <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
          {panel.chapterDone && (
            <p className="text-sm font-medium">
              Chapter done · {panel.chapterDone.title} · {panel.chapterDone.learned} of {panel.chapterDone.total}
            </p>
          )}
          {panel.next ? (
            <div>
              <Button type="button" size="sm" onClick={() => onSelect(panel.next!.id)}>
                Next topic: {panel.next.title}
                <IconArrowRight aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Every topic on the roadmap is done</p>
          )}
        </div>
      )}
      <ol className="grid gap-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Marker state={step.state} number={index + 1} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{titles[step.id]}</p>
              <p className="text-xs text-muted-foreground">{stateWord(step.id, step.state, panel.practice)}</p>
            </div>
            {actions[step.id] ?? (step.id === "learn" && <Badge variant="outline">Needs the Project link</Badge>)}
          </li>
        ))}
      </ol>
    </section>
  );
}
