"use client";

import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExercisePanel } from "@/features/engineering-lab/exercise-store";
import { Exercise, useExerciseCheck } from "../exercise";

// Try it in code (docs/architecture/engineering-claude-first.md, section 1): the topic's exercise in a wide panel over
// the roadmap. Optional; it's the same editor, runner, browser check and autosave as the topic page. A topic Claude
// added has no exercise until Claude writes one, and its first one is checked here before it shows.

interface CodeView {
  exercise: ExercisePanel | null;
  /** The newest version still waiting for its browser check, when there's no usable version yet. */
  pending: ExercisePanel["check"];
  progress: { exercisePassed: boolean; solutionOpened: boolean };
}

function Pending({
  topicId,
  check,
  onChecked,
}: {
  topicId: string;
  check: ExercisePanel["check"];
  onChecked: () => void;
}) {
  const checking = useExerciseCheck(topicId, check, onChecked);
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {checking ? "Checking new exercise from Claude…" : "Checking new exercise from Claude"}
    </p>
  );
}

export function CodeSheet({
  topic,
  open,
  onClose,
  onChanged,
}: {
  topic: { id: string; title: string };
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [view, setView] = useState<CodeView | null>(null);
  const [problem, setProblem] = useState("");

  const load = useCallback(() => {
    setProblem("");
    void fetch(`/api/lab/topics/${encodeURIComponent(topic.id)}/code`)
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as CodeView & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Couldn't load the exercise. Try again");
        setView(body);
      })
      .catch((error: unknown) =>
        setProblem(error instanceof Error ? error.message : "Couldn't load the exercise. Try again"),
      );
  }, [topic.id]);

  useEffect(() => {
    if (!open) return;
    setView(null);
    load();
  }, [open, load]);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && (onClose(), onChanged())}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-5xl">
        <SheetHeader className="border-b">
          <SheetDescription>Try it in code</SheetDescription>
          <SheetTitle className="text-xl">{topic.title}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          {problem && <p className="text-sm text-destructive">{problem}</p>}
          {!view && !problem && <Skeleton className="h-72 w-full" />}
          {view?.exercise && (
            <Exercise
              key={view.exercise.exercise.id}
              topic={topic}
              data={view.exercise}
              progress={view.progress}
              onRefresh={load}
            />
          )}
          {view && !view.exercise && view.pending && (
            <Pending topicId={topic.id} check={view.pending} onChecked={load} />
          )}
          {view && !view.exercise && !view.pending && (
            <div className="text-sm">
              <p className="font-semibold">No exercise yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Ask Claude to write one</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
