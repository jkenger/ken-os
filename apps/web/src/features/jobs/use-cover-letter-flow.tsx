"use client";

import { useState } from "react";
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
import { post, send } from "@/lib/api-client";
import { needsRewriteConfirmation } from "./cover-letter";

// Cover letter tab (docs/architecture/cover-letter.md, "UI: a Cover letter tab on Job detail"): this hook owns the
// tab's state and is instantiated once in `posting-detail.tsx`, not inside the tab's own content component --
// Radix's `TabsContent` unmounts an inactive panel by default (verified against this repo's own
// `components/ui/tabs.tsx`, which doesn't override that), so state kept inside it would be lost switching to
// Description and back. Mirrors `use-apply-flow.tsx`'s shape: a hook returning state, handlers and the dialog JSX.

export type CoverLetterStatus = "empty" | "generating" | "ready" | "error";

type Letter = { content: string; generatedAt: Date; updatedAt: Date };

export function useCoverLetterFlow({ postingId, initial }: { postingId: string; initial: Letter | null }) {
  const [status, setStatus] = useState<CoverLetterStatus>(initial ? "ready" : "empty");
  const [letter, setLetter] = useState(initial);
  const [content, setContent] = useState(initial?.content ?? "");
  const [regenerating, setRegenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // "Edited" and Save's own dirty-check are the same thing: the box no longer matches what loaded, regardless of
  // whether that edit has been saved yet (docs/architecture/cover-letter.md's status line wording).
  const edited = letter !== null && content !== letter.content;

  async function generate(force: boolean) {
    const isRegenerate = letter !== null;
    setRegenerating(isRegenerate);
    if (!isRegenerate) setStatus("generating");
    try {
      const result = await post<{ content: string; generatedAt: string }>(
        `/api/jobs/postings/${postingId}/cover-letter`,
        { force },
      );
      const generatedAt = new Date(result.generatedAt);
      setLetter({ content: result.content, generatedAt, updatedAt: generatedAt });
      setContent(result.content);
      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't write a letter. Try again";
      // A failed regenerate leaves the current textarea content as it is (docs/architecture/cover-letter.md) --
      // only a first-ever generation failure replaces the tab with the full error state.
      if (isRegenerate) toast({ tone: "error", title: message });
      else setStatus("error");
    } finally {
      setRegenerating(false);
    }
  }

  function onWriteClick() {
    void generate(false);
  }

  function onRegenerateClick() {
    if (
      letter &&
      needsRewriteConfirmation({ generatedAt: letter.generatedAt, updatedAt: letter.updatedAt, force: false })
    ) {
      setConfirmOpen(true);
      return;
    }
    void generate(false);
  }

  function onConfirmRewrite() {
    setConfirmOpen(false);
    void generate(true);
  }

  async function onSaveClick() {
    try {
      const result = await send<{ updatedAt: string }>(`/api/jobs/postings/${postingId}/cover-letter`, "PUT", {
        content,
      });
      setLetter((previous) => (previous ? { ...previous, content, updatedAt: new Date(result.updatedAt) } : previous));
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't save. Try again" });
    }
  }

  async function onCopyClick() {
    await navigator.clipboard.writeText(content);
    toast({ title: "Letter copied" });
  }

  const dialog = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rewrite this letter?</AlertDialogTitle>
          <AlertDialogDescription>Your edits are replaced by a new letter</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmRewrite}>Rewrite letter</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    status,
    hasLetter: letter !== null,
    content,
    setContent,
    edited,
    regenerating,
    generatedAt: letter?.generatedAt ?? null,
    onWriteClick,
    onRegenerateClick,
    onSaveClick,
    onCopyClick,
    dialog,
  };
}
