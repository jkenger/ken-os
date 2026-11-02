"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AlertCircle, FileText, MoreHorizontal, Upload } from "lucide-react";
import { IconCheck, IconHistory, IconSparkles } from "@tabler/icons-react";
import { PDF_MIME } from "@ken-os/domain";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { panel } from "@/components/surfaces";
import type { ResumeFile } from "@/features/profile/resume-files-store";
import { send } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";
import { shortDate } from "./dates";

// Resume files the owner uploaded, newest first. Uploading only keeps the file; nothing in the details changes until
// the owner runs Autofill on one and accepts what it found.
// Spec: docs/product/profile-resume.md, "Step 5 design"; layout: docs/mockups/profile.md, direction A.

export function ResumeFiles({
  files,
  setFiles,
  reviewing,
  autofilling,
  pending,
  onAutofill,
}: {
  /** Newest first; Profile holds them so the sidebar can count them. */
  files: ResumeFile[];
  setFiles: Dispatch<SetStateAction<ResumeFile[]>>;
  /** The file whose Autofill is open or accepted but not saved yet. */
  reviewing: string | null;
  /** The file Claude is reading now. */
  autofilling: string | null;
  /** The file whose import or Autofill is in the form but not saved: another Autofill waits for Save or Discard, so
   *  Save never marks one file applied for changes another made. */
  pending: string | null;
  onAutofill: (file: ResumeFile) => void;
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
    <section id="resumes" aria-labelledby="resumes-title" className={cn(panel, "scroll-mt-16 p-5")}>
      <div className="text-center">
        <h2 id="resumes-title" className="font-heading text-base font-semibold">
          Resumes
          {files.length > 0 && <span className="ml-2 font-mono text-xs text-muted-foreground">{files.length}</span>}
        </h2>
        <p className="mx-auto mt-1 max-w-64 text-muted-foreground">
          PDF or Word, up to 4 MB each. Uploading doesn&apos;t change your details
        </p>
      </div>
      <Input
        ref={input}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        // w-px wins over the Input's own w-full, which otherwise stretches this hidden input past the screen's edge.
        className="sr-only w-px"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {problem && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle />
          <AlertTitle>{problem}</AlertTitle>
        </Alert>
      )}
      {files.length > 0 && (
        <ul className="mt-4 divide-y border-y text-left [&>li]:py-3">
          {files.map((file) => {
            const href = `/api/profile/resumes/${encodeURIComponent(file.id)}`;
            return (
              <li key={file.id} className="flex items-start gap-3">
                <FileText className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <a
                    href={href}
                    target={file.contentType === PDF_MIME ? "_blank" : undefined}
                    download={file.contentType === PDF_MIME ? undefined : file.fileName}
                    rel="noopener noreferrer"
                    className="block truncate font-medium underline-offset-4 hover:underline"
                    title={file.fileName}
                  >
                    {file.fileName}
                  </a>
                  <p className="text-xs text-muted-foreground">Uploaded at {shortDate(file.uploadedAt)}</p>
                  <FileState file={file} reviewing={reviewing === file.id} reading={autofilling === file.id} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="-mt-1 -mr-2 shrink-0"
                      aria-label={`Actions for ${file.fileName}`}
                      title="Actions"
                      disabled={busy !== null || autofilling !== null}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={pending !== null}
                      title={pending ? `Save or cancel the changes from ${pending} first` : undefined}
                      onSelect={() => onAutofill(file)}
                    >
                      Autofill
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={`${href}?download=1`} download={file.fileName}>
                        Download
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(file)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex justify-center">
        <Button type="button" onClick={() => input.current?.click()} disabled={busy !== null}>
          <Upload data-icon="inline-start" aria-hidden="true" />
          {busy === "upload" ? "Uploading…" : "Upload resume"}
        </Button>
      </div>
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.fileName ?? "resume"}?`}
        description="Your details stay. Can't be undone"
        action="Delete resume"
        busy={busy !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
      />
    </section>
  );
}

/** Reading while Claude reads it, In review while its Autofill is open, Applied once one was saved, else nothing. */
function FileState({ file, reviewing, reading }: { file: ResumeFile; reviewing: boolean; reading: boolean }) {
  const place = "mt-0.5 flex items-center gap-1.5 text-xs";
  if (reading)
    return (
      <span className={cn(place, "text-muted-foreground")}>
        <IconSparkles size={14} aria-hidden="true" />
        Reading…
      </span>
    );
  if (reviewing)
    return (
      <span className={place}>
        <IconHistory size={14} aria-hidden="true" />
        In review
      </span>
    );
  if (file.appliedAt)
    return (
      <span className={place}>
        <IconCheck size={14} aria-hidden="true" />
        Applied {shortDate(file.appliedAt)}
      </span>
    );
  return null;
}
