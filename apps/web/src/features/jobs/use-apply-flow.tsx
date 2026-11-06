"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toaster";
import { post } from "@/lib/api-client";

// Apply flow (docs/architecture/job-board.md, "Apply flow"): both the New-list card and the detail page's Apply
// button use this hook so the open-a-tab-then-ask-later behavior lives in exactly one place.

/** How often the tracked tab's `.closed` is polled -- there's no cross-origin "closed" event, so this is the only
 *  way to notice it without the owner ever refocusing this window. */
const POLL_MS = 1000;

/** The post-Apply dialog fires only when a tab Apply opened closes, or this window regains focus after that --
 *  never on an unrelated tab switch, which is why `hasPendingWindow` gates both signals (docs/product/
 *  job-finder.md, "Job Board"). Plain function so this decision is unit-testable without a DOM/browser harness. */
export function shouldShowApplyDialog(params: {
  windowClosed: boolean;
  justRegainedFocus: boolean;
  hasPendingWindow: boolean;
}): boolean {
  return params.hasPendingWindow && (params.windowClosed || params.justRegainedFocus);
}

export function useApplyFlow({ postingId, link }: { postingId: string; link: string | undefined }) {
  const [open, setOpen] = useState(false);
  const pendingWindowRef = useRef<Window | null>(null);

  const maybeShowDialog = useCallback((signal: { windowClosed: boolean; justRegainedFocus: boolean }) => {
    if (shouldShowApplyDialog({ ...signal, hasPendingWindow: pendingWindowRef.current !== null })) setOpen(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingWindowRef.current?.closed) maybeShowDialog({ windowClosed: true, justRegainedFocus: false });
    }, POLL_MS);
    const onFocus = () => maybeShowDialog({ windowClosed: false, justRegainedFocus: true });
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [maybeShowDialog]);

  const onApplyClick = useCallback(() => {
    if (!link) return;
    // Popup blocked: window.open returns null, nothing opened, so there's nothing to track or confirm.
    pendingWindowRef.current = window.open(link, "_blank");
  }, [link]);

  async function onYes() {
    setOpen(false);
    pendingWindowRef.current = null;
    try {
      await post(`/api/jobs/postings/${postingId}/apply`, {});
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't mark it applied" });
    }
  }

  function onNotYet() {
    setOpen(false);
    pendingWindowRef.current = null;
  }

  const dialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Did you apply to this job?</AlertDialogTitle>
          <AlertDialogDescription>This marks the posting Applied on your Job Board.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onNotYet}>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={onYes}>Yes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { onApplyClick, dialog };
}
