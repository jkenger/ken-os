"use client";

import { IconArrowRight, IconCheck, IconCode, IconExternalLink } from "@tabler/icons-react";
import { DotSeparator } from "@/components/dot-separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import type { TopicPanelView } from "@/features/engineering-lab/roadmap-store";
import type { BuildView } from "@/features/engineering-lab/status-store";
import { topicTasks, type TaskId, type TaskState } from "@/features/engineering-lab/topic-steps";
import { cn } from "@/lib/utils";
import { formatDate } from "@/features/engineering-lab/words";
import { AskClaude } from "../ask-claude";

// A topic's tasks (docs/architecture/roadmap-ui.md): Read, Build, Explain, the same three for every topic, ticked only
// by what happened (Claude started, an exercise run passed or Claude reported the build, the topic is Learned). The owner can't tick them by hand.
// TopicTaskAction is the main button: the first task left to do, or Next topic once the topic is finished.

const taskState = (panel: TopicPanelView) =>
  topicTasks({ status: panel.status.status, practice: panel.practice, built: Boolean(panel.build) });

const titles: Record<TaskId, string> = { read: "Read", build: "Build", explain: "Explain" };

/** Claude's wording for the topic once it writes it; until then the same line for every topic. */
function taskLine(id: TaskId, panel: TopicPanelView) {
  if (panel.material) return panel.material.tasks[id];
  const { practice } = panel;
  if (id === "read") return "Learn it with Claude";
  if (id === "build")
    return panel.build
      ? "Built with Claude's review"
      : practice === "none"
        ? "No exercise yet"
        : practice === "checking"
          ? "New exercise from Claude"
          : "Pass the exercise";
  return "Explain it in your own words";
}

const stateWords: Record<TaskState, string> = {
  done: "Done",
  todo: "To do",
  none: "Waiting on an exercise",
  skipped: "Skipped",
};

function Box({ state }: { state: TaskState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border",
        state === "done" ? "border-topic-learned bg-topic-learned text-background" : "border-ring",
        (state === "none" || state === "skipped") && "border-dashed",
      )}
    >
      {state === "done" && <IconCheck className="size-3" stroke={3} />}
    </span>
  );
}

const places: Record<BuildView["where"], string> = {
  "real-app": "In your app",
  "loots-exercise": "In a Loots exercise",
};

/** The owner's final code from the build Claude reported, collapsed under Build. */
function BuildCode({ build }: { build: BuildView }) {
  return (
    <details className="group mt-1.5">
      <DisclosureSummary className="text-xs font-semibold">
        Your code
        <DotSeparator />
        {build.evidence.length === 1 ? "1 file" : `${build.evidence.length} files`}
      </DisclosureSummary>
      <div className="mt-2 grid gap-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {places[build.where]}
          <DotSeparator />
          {formatDate(build.at)}
          <DotSeparator />
          {build.note}
        </p>
        {build.evidence.map((file, index) => (
          <figure key={`${file.path}-${index}`} className="grid gap-1">
            <figcaption className="font-mono text-xs text-muted-foreground">{file.path}</figcaption>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
              {file.contents}
            </pre>
          </figure>
        ))}
      </div>
    </details>
  );
}

/** How many tasks are done, as a count and a bar. */
export function TaskProgress({ panel }: { panel: TopicPanelView }) {
  const { done, total } = taskState(panel);
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Tasks</span>
        <span className="font-mono text-xs text-muted-foreground">
          {done} of {total}
        </span>
      </div>
      <Progress value={Math.round((done / total) * 100)} aria-label={`${done} of ${total} tasks done`} />
    </div>
  );
}

export function TopicTasks({ panel }: { panel: TopicPanelView }) {
  const { tasks, done, total } = taskState(panel);
  return (
    <section aria-labelledby="tasks-title" className="grid gap-2.5">
      <div className="flex items-baseline justify-between">
        <h3 id="tasks-title" className="text-sm font-semibold">
          Tasks
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          {done} of {total}
        </span>
      </div>
      <ul className="grid gap-2.5 text-sm">
        {tasks.map((task) => (
          <li key={task.id} className="flex gap-2.5">
            <Box state={task.state} />
            <div className="min-w-0 flex-1">
              <span className={cn((task.state === "none" || task.state === "skipped") && "text-muted-foreground")}>
                <span className="font-semibold">{titles[task.id]}</span>
                <DotSeparator />
                {taskLine(task.id, panel)}
                <span className="sr-only">, {stateWords[task.state]}</span>
              </span>
              {task.id === "build" && panel.build && <BuildCode build={panel.build} />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The main button for the topic: the first task left to do, or Next topic once it's finished. */
export function TopicTaskAction({
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
  const { main } = taskState(panel);

  if (main === "next") {
    if (!showNext) return null;
    return (
      <div className="grid gap-2">
        {panel.chapterDone && (
          <p className="text-sm font-medium">
            Chapter done
            <DotSeparator />
            {panel.chapterDone.title}
            <DotSeparator />
            {panel.chapterDone.learned} of {panel.chapterDone.total}
          </p>
        )}
        {panel.next ? (
          <Button type="button" onClick={() => onSelect(panel.next!.id)}>
            Next topic: {panel.next.title}
            <IconArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Every topic on the roadmap is done</p>
        )}
      </div>
    );
  }

  if (main === "build" && panel.practice !== "none") {
    return (
      <Button type="button" onClick={onPractice}>
        <IconCode aria-hidden="true" />
        Try it in code
      </Button>
    );
  }

  // Read and Explain both happen in the chat with Claude.
  if (panel.chatUrl) {
    return (
      <Button asChild>
        <a href={panel.chatUrl} target="_blank" rel="noopener noreferrer">
          Continue chat
          <IconExternalLink aria-hidden="true" />
        </a>
      </Button>
    );
  }
  if (projectUrl) return <AskClaude topic={panel} projectUrl={projectUrl} variant="default" />;
  return <Badge variant="outline">Needs the Project link</Badge>;
}
