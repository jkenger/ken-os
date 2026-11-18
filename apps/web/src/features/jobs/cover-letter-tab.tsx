"use client";

import { CircleAlert, Copy, FileText, LoaderCircle, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "./empty-state";
import type { CoverLetterStatus } from "./use-cover-letter-flow";

function writtenOn(date: Date): string {
  return `Written ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** The Cover letter tab's content (docs/architecture/cover-letter.md, "UI: a Cover letter tab on Job detail";
 *  docs/mockups/cover-letter-canvas/LetterPage.dc.html, frames D1-D9). Purely presentational -- every piece of
 *  state comes from `useCoverLetterFlow`, held by the parent so it survives this component unmounting while the
 *  tab is hidden. */
export function CoverLetterTab({
  status,
  content,
  onContentChange,
  edited,
  regenerating,
  generatedAt,
  onWriteClick,
  onRegenerateClick,
  onSaveClick,
  onCopyClick,
}: {
  status: CoverLetterStatus;
  content: string;
  onContentChange: (value: string) => void;
  edited: boolean;
  regenerating: boolean;
  generatedAt: Date | null;
  onWriteClick: () => void;
  onRegenerateClick: () => void;
  onSaveClick: () => void;
  onCopyClick: () => void;
}) {
  // Empty and error states fill the tab's full width, content centred (owner, 17 Nov 2026 mockup review) --
  // the only content the tab has when there's no letter, so an error here replaces it rather than toasting over
  // nothing.
  if (status !== "ready") {
    const isError = status === "error";
    return (
      <EmptyState
        className="w-full gap-3 border-dashed py-18"
        icon={
          isError ? (
            <CircleAlert className="size-6 text-destructive" />
          ) : (
            <Mail className="size-6 text-muted-foreground" />
          )
        }
        message={isError ? "Couldn't write a letter for this posting" : "Write a cover letter for this posting"}
        action={
          <Button type="button" onClick={onWriteClick} disabled={status === "generating"}>
            {status === "generating" ? <LoaderCircle className="animate-spin" /> : <FileText />}
            Write cover letter
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-2.5">
      <Label htmlFor="cover-letter" className="sr-only">
        Cover letter
      </Label>
      <Textarea
        id="cover-letter"
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        disabled={regenerating}
        className="min-h-[26rem] resize-y rounded-xl text-[15px] leading-relaxed"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {regenerating ? "Writing a new letter…" : edited ? "Edited" : generatedAt ? writtenOn(generatedAt) : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onCopyClick} disabled={regenerating}>
            <Copy />
            Copy letter
          </Button>
          <Button type="button" variant="outline" onClick={onRegenerateClick} disabled={regenerating}>
            {regenerating ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            Regenerate
          </Button>
          <Button type="button" onClick={onSaveClick} disabled={!edited}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
