"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";
import { post } from "@/lib/api-client";

// CV tailoring (docs/architecture/cv-tailoring.md, plans/cv-tailoring.md Slice 1): the button's own pending/ready
// state, mirroring use-apply-flow.tsx's shape. Regenerate and the split button are Slice 2.

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
    setStatus("pending");
    try {
      await post(`/api/jobs/postings/${postingId}/tailor`, {});
      setStatus("ready");
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't generate. Try again" });
      setStatus("idle");
    }
  }

  return { status, onTailorClick };
}
