"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AlertCircle, Download, FileText, Trash2, Upload } from "lucide-react";
import { PDF_MIME } from "@ken-os/domain";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { panel } from "@/components/surfaces";
import type { ResumeFile } from "@/features/profile/resume-files-store";
import { send } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";
import { shortDate } from "./dates";

// Resume files the owner uploaded, newest first. Uploading only keeps the file; nothing in the details changes.
// Spec: docs/product/profile-resume.md, "Step 5 design"; layout: docs/mockups/profile.md, direction A.

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeFiles({
  files,
  setFiles,
}: {
  /** Newest first; Profile holds them so the section column can count them. */
  files: ResumeFile[];
  setFiles: Dispatch<SetStateAction<ResumeFile[]>>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  /** The file the Delete dialog asks about. */
  const [deleting, setDeleting] = useState<ResumeFile | null>(null);

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
    setBusy(file.id);
    setProblem(null);
    try {
      await send(`/api/profile/resumes/${encodeURIComponent(file.id)}`, "DELETE");
      setFiles((current) => current.filter((item) => item.id !== file.id));
      toast({ tone: "success", title: `${file.fileName} deleted` });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't delete. Try again");
    } finally {
      setBusy(null);
      setDeleting(null);
    }
  }

  return (
    <section id="resumes" aria-labelledby="resumes-title" className="scroll-mt-24">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 id="resumes-title" className="font-heading text-base font-semibold">
          Resumes
        </h2>
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
          {busy === "upload" ? "Uploading…" : "Upload resume"}
        </Button>
      </div>
      {problem && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle />
          <AlertTitle>{problem}</AlertTitle>
        </Alert>
      )}
      {files.length === 0 ? (
        <div className={cn(panel, "px-3.5 py-3 text-sm")}>
          <p className="font-semibold">No resumes uploaded</p>
          <p className="text-muted-foreground">PDF or Word, up to 4 MB. Uploading doesn&apos;t change your details.</p>
        </div>
      ) : (
        <ul className={cn(panel, "divide-y")}>
          {files.map((file) => {
            const href = `/api/profile/resumes/${encodeURIComponent(file.id)}`;
            return (
              <li
                key={file.id}
                className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 pr-2 pl-3.5 md:h-13 md:grid-cols-[18px_minmax(0,1fr)_120px_132px_auto] md:py-0"
              >
                <FileText className="size-4.5 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <a
                    href={href}
                    target={file.contentType === PDF_MIME ? "_blank" : undefined}
                    download={file.contentType === PDF_MIME ? undefined : file.fileName}
                    rel="noopener noreferrer"
                    className="block truncate font-semibold underline-offset-4 hover:underline"
                  >
                    {file.fileName}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {file.contentType === PDF_MIME ? "PDF" : "DOCX"} · {fileSize(file.size)}
                  </p>
                </div>
                <span className="col-start-2 text-xs text-muted-foreground md:col-start-auto">
                  Uploaded {shortDate(file.uploadedAt)}
                </span>
                {/* Autofill isn't built yet, so no file has filled the details. */}
                <span className="col-start-2 text-sm text-muted-foreground md:col-start-auto">Not used</span>
                <div className="col-start-3 row-span-3 row-start-1 flex gap-2 md:col-start-auto md:row-span-1 md:row-start-auto">
                  <Button asChild variant="ghost" size="icon" aria-label={`Download ${file.fileName}`} title="Download">
                    <a href={`${href}?download=1`} download={file.fileName}>
                      <Download />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${file.fileName}`}
                    title="Delete"
                    onClick={() => setDeleting(file)}
                    disabled={busy !== null}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.fileName ?? "resume"}?`}
        description="Can't be undone · your details stay"
        action="Delete resume"
        busy={busy !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
      />
    </section>
  );
}
