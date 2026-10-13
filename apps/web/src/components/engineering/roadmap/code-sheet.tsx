"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExercisePanel } from "@/features/engineering-lab/exercise-store";
import { Exercise } from "../exercise";

// Try it in code (docs/architecture/engineering-claude-first.md, section 1): the topic's exercise in a wide panel over
// the roadmap. Optional; it's the same editor, runner, browser check and autosave as the topic page.

interface CodeView {
  exercise: ExercisePanel;
  progress: { exercisePassed: boolean; solutionOpened: boolean };
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

  useEffect(() => {
    if (!open) return;
    setView(null);
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
  }, [open, topic.id]);

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
          {view && (
            <Exercise key={view.exercise.exercise.id} topic={topic} data={view.exercise} progress={view.progress} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
