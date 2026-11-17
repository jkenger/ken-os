"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";
import { post } from "@/lib/api-client";

// CV tailoring (docs/architecture/cv-tailoring.md, plans/cv-tailoring.md): the button's own idle/pending/ready
// state, mirroring use-apply-flow.tsx's shape. First run and regenerate share this one flow -- the mockup never
// draws a "ready" state without Regenerate, so there's no separate not-yet-regenerate state to model.

export type TailorStatus = "idle" | "pending" | "ready";

export function useTailorFlow({
  postingId,
  initialStatus = "idle",
}: {
  postingId: string;
  initialStatus?: TailorStatus;
}) {
  const [status, setStatus] = useState<TailorStatus>(initialStatus);

  async function onTailorClick() {
    const previousStatus = status;
    setStatus("pending");
    try {
      await post(`/api/jobs/postings/${postingId}/tailor`, {});
      setStatus("ready");
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't generate. Try again" });
      // Returns to whatever it was before the click: "idle" for a first attempt, "ready" for a failed
      // regenerate -- a failed regenerate must never make an existing tailored resume look like it's gone.
      setStatus(previousStatus);
    }
  }

  return { status, onTailorClick };
}
