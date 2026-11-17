"use client";

import { FileText, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/api-client";
import { EmptyState } from "./empty-state";

// The cover letter page's own states (docs/mockups/cover-letter.md, D1/D2/D3/D7). Slice 1 only: read-only text,
// no Textarea editing, no regenerate/dialog (Slice 2).

type Status = "empty" | "pending" | "ready" | "error";

export function CoverLetterView({ postingId, initialContent }: { postingId: string; initialContent: string | null }) {
  const [status, setStatus] = useState<Status>(initialContent ? "ready" : "empty");
  const [content, setContent] = useState(initialContent ?? "");

  async function onWriteClick() {
    setStatus("pending");
    try {
      const result = await post<{ content: string }>(`/api/jobs/postings/${postingId}/cover-letter`, {});
      setContent(result.content);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  if (status === "ready") {
    return (
      <div className="grid gap-4">
        <pre className="rounded-xl border bg-card p-5 text-sm leading-relaxed whitespace-pre-wrap">{content}</pre>
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        message="Couldn't write a letter for this posting"
        action={
          <Button type="button" onClick={onWriteClick}>
            <FileText />
            Write cover letter
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      message="Write a cover letter for this posting"
      action={
        <Button type="button" onClick={onWriteClick} disabled={status === "pending"}>
          {status === "pending" ? <LoaderCircle className="animate-spin" /> : <FileText />}
          Write cover letter
        </Button>
      }
    />
  );
}
