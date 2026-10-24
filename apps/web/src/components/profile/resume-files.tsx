"use client";

import { useRef, useState } from "react";
import { AlertCircle, Download, FileText, Trash2, Upload } from "lucide-react";
import { PDF_MIME } from "@ken-os/domain";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import type { ResumeFile } from "@/features/profile/resume-files-store";
import { send } from "@/lib/api-client";
import { shortDate } from "./dates";

// Resume files the owner uploaded, newest first. Uploading only keeps the file; nothing in the details changes.
// Spec: docs/product/profile-resume.md, "Step 5 design".

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeFiles({ initial }: { initial: ResumeFile[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy("upload");
    setProblem(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/profile/resumes", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as ResumeFile & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Couldn't upload. Try again");
      setFiles((current) => [result, ...current]);
      toast({ tone: "success", title: `${result.fileName} uploaded` });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't upload. Try again");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(file: ResumeFile) {
    if (!window.confirm(`Delete ${file.fileName}? This can't be undone.`)) return;
    setBusy(file.id);
    setProblem(null);
    try {
      await send(`/api/profile/resumes/${encodeURIComponent(file.id)}`, "DELETE");
      setFiles((current) => current.filter((item) => item.id !== file.id));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't delete. Try again");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card id="resumes" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Resumes</CardTitle>
        <CardDescription>PDF or Word, up to 4 MB</CardDescription>
        <CardAction>
          <Input
            ref={input}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy !== null}>
            <Upload data-icon="inline-start" aria-hidden="true" />
            {busy === "upload" ? "Uploading…" : "Upload"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {problem && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{problem}</AlertTitle>
          </Alert>
        )}
        {files.length === 0 ? (
          <div className="text-sm">
            <p>No resumes uploaded</p>
            <p className="text-muted-foreground">Uploading keeps the file and doesn&apos;t change your details.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {files.map((file) => {
              const href = `/api/profile/resumes/${encodeURIComponent(file.id)}`;
              return (
                <li key={file.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={href}
                      target={file.contentType === PDF_MIME ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {file.fileName}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {file.contentType === PDF_MIME ? "PDF" : "Word"} · {fileSize(file.size)} · Uploaded{" "}
                      {shortDate(file.uploadedAt)}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="icon" aria-label={`Download ${file.fileName}`} title="Download">
                    <a href={`${href}?download=1`}>
                      <Download />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${file.fileName}`}
                    title="Delete"
                    onClick={() => void remove(file)}
                    disabled={busy !== null}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
