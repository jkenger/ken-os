"use client";

import { LoaderCircle, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { send } from "@/lib/api-client";

// A manual trigger for the same scrape-then-process pipeline the outside poller runs every minute
// (docs/product/job-finder.md), for checking right now instead of waiting for the next poll, with a console of
// what happened on each run so a run that found nothing is visibly distinct from one that never ran at all.

type StepResult = { step: string; ok: boolean; detail: string };
type RunEntry = { ranAt: string; steps: StepResult[] };

const MAX_LOG_ENTRIES = 10;

export function useRunPipeline() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<RunEntry[]>([]);

  async function run() {
    setBusy(true);
    try {
      const result = await send<RunEntry>("/api/jobs/run-pipeline", "POST", {});
      setLog((current) => [result, ...current].slice(0, MAX_LOG_ENTRIES));
      toast({ tone: "success", title: "Pipeline ran" });
      router.refresh();
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't run. Try again" });
    } finally {
      setBusy(false);
    }
  }

  return { busy, log, run };
}

export function RunPipelineButton({ busy, onRun }: { busy: boolean; onRun: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRun}>
      {busy ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Play className="size-3.5" aria-hidden="true" />
      )}
      Run pipeline
    </Button>
  );
}

export function RunPipelineLog({ log }: { log: RunEntry[] }) {
  if (log.length === 0) return null;
  return (
    <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 font-mono text-xs">
      {log.map((entry) => (
        <div key={entry.ranAt} className="grid gap-1 border-b pb-2 last:border-b-0 last:pb-0">
          <span className="text-muted-foreground">
            {new Date(entry.ranAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </span>
          {entry.steps.map((step) => (
            <span key={step.step} className={step.ok ? undefined : "text-destructive"}>
              {step.step}: {step.detail}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
