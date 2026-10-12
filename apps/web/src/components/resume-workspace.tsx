"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState, type FormEvent } from "react";
import { DOCX_MIME, GOOGLE_DOC_MIME, type Artifact } from "@ken-os/domain";
import type { DriveAccess } from "@/lib/google";
import type { ResumeSelection } from "@/lib/resume";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AlertCircle, ArrowUpRight, Download, FileText, Plus, RefreshCw } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PickerBuilder {
  addView(view: unknown): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(id: string): PickerBuilder;
  setOrigin(origin: string): PickerBuilder;
  setCallback(callback: (data: { action: string; docs?: { id: string }[] }) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

declare global {
  interface Window {
    gapi?: { load(name: string, callback: () => void): void };
    google?: {
      picker: {
        ViewId: { DOCS: string };
        Action: { PICKED: string };
        DocsView: new (id: string) => { setMimeTypes(types: string): void };
        PickerBuilder: new () => PickerBuilder;
      };
    };
  }
}

interface Props {
  email: string;
  selection: ResumeSelection | null;
  file: Artifact | null;
  error: string | null;
  /** Whether Drive is granted; sign-in no longer includes it (docs/architecture/auth-sign-in.md §4). */
  drive: DriveAccess;
  /** Why the last Drive grant didn't finish, from `?drive_error=`. */
  driveNotice?: string | null;
  previewUrl: string | null;
  canAsk: boolean;
  /** A one-line Engineering Lab summary that links into the lab. Absent when the lab has nothing to say yet. */
  labSummary?: { headline: string; detail: string } | null;
}

const mimeNames: Record<string, string> = {
  [GOOGLE_DOC_MIME]: "Google Doc",
  "application/pdf": "PDF",
  [DOCX_MIME]: "Word document",
};

/** Starts the Drive grant and comes back here. */
const connectDriveHref = "/api/auth/google/drive?next=%2F";

export function ResumeWorkspace({
  email,
  selection,
  file,
  error,
  drive: initialDrive,
  driveNotice = null,
  previewUrl,
  canAsk,
  labSummary = null,
}: Props) {
  const router = useRouter();
  const [drive, setDrive] = useState<DriveAccess>(initialDrive);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function selectFile(fileId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't save your choice. Try again");
      setAnswer(null);
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Couldn't save your choice. Try again");
    } finally {
      setBusy(false);
    }
  }

  async function openPicker() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
    const appId = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER;
    if (!apiKey || !appId) {
      setMessage("Drive picker isn't set up");
      return;
    }
    if (!window.gapi) {
      setMessage("Drive picker is loading. Try again in a moment");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/drive/picker-token", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        if (data.drive === "not_connected" || data.drive === "disconnected") {
          setDrive(data.drive);
          setBusy(false);
          return;
        }
        throw new Error(data.error ?? "Couldn't reach Google Drive. Try again");
      }
      window.gapi.load("picker", () => {
        const picker = window.google?.picker;
        if (!picker) {
          setMessage("Drive picker didn't load. Reload the page");
          setBusy(false);
          return;
        }
        const view = new picker.DocsView(picker.ViewId.DOCS);
        view.setMimeTypes(`${GOOGLE_DOC_MIME},application/pdf,${DOCX_MIME}`);
        new picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(data.accessToken)
          .setDeveloperKey(apiKey)
          .setAppId(appId)
          .setOrigin(window.location.origin)
          .setCallback((result) => {
            setBusy(false);
            if (result.action === picker.Action.PICKED && result.docs?.[0]?.id) {
              void selectFile(result.docs[0].id);
            }
          })
          .build()
          .setVisible(true);
        setBusy(false);
      });
    } catch (cause) {
      setBusy(false);
      setMessage(cause instanceof Error ? cause.message : "Couldn't open the Drive picker. Try again");
    }
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const response = await fetch("/api/resume/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't answer. Try again");
      setAnswer(data.answer);
    } catch (cause) {
      setAnswer(cause instanceof Error ? cause.message : "Couldn't answer. Try again");
    } finally {
      setAsking(false);
    }
  }

  return (
    <WorkspaceShell email={email} active="resume">
      <Script src="https://apis.google.com/js/api.js" strategy="afterInteractive" />
      <div className="mx-auto w-full max-w-330 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-6 flex items-end justify-between gap-6 sm:mb-8">
          <div>
            <h1 className="text-3xl leading-none font-bold tracking-tight md:text-4xl xl:text-4xl xl:leading-none">
              Resume
            </h1>
          </div>
        </div>

        {labSummary && (
          <a
            href="/engineering"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 transition-colors hover:bg-muted/50"
          >
            <span>
              <span className="block text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Engineering
              </span>
              <span className="mt-1 block text-sm font-semibold">{labSummary.headline}</span>
            </span>
            <span className="text-sm text-muted-foreground">{labSummary.detail}</span>
          </a>
        )}

        {driveNotice && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle />
            <AlertTitle>{driveNotice}</AlertTitle>
          </Alert>
        )}

        <section className="grid overflow-hidden rounded-xl border bg-card lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <div className="flex min-h-100 flex-col items-start p-6 sm:p-8">
            <div className="mb-7 grid size-11 place-items-center rounded-xl bg-secondary text-foreground">
              {file ? <FileText size={22} strokeWidth={1.6} /> : <Plus size={22} strokeWidth={1.6} />}
            </div>
            {drive !== "connected" ? (
              <>
                <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  {drive === "disconnected" ? "Needs attention" : "Not connected"}
                </div>
                <h2 className="mt-3 font-heading text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">
                  {drive === "disconnected" ? "Google Drive disconnected" : "Google Drive not connected"}
                </h2>
                <p className="mt-5 max-w-md text-base leading-6 text-muted-foreground">
                  {drive === "disconnected" ? "Reconnect it to see your resume" : "Connect it to choose your resume"}
                </p>
              </>
            ) : file ? (
              <>
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  <span className="size-1.5 rounded-full bg-foreground" />
                  Connected
                </div>
                <h2 className="mt-3 font-heading text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">
                  {file.name}
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {mimeNames[file.mimeType] ?? "Document"} <span className="mx-1">·</span> Updated{" "}
                  {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : "in Drive"}
                </p>
                <p className="mt-5 max-w-md text-base leading-6 text-muted-foreground">
                  Edits in Drive show after Refresh
                </p>
              </>
            ) : (
              <>
                <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  {selection ? "Needs attention" : "Not chosen"}
                </div>
                <h2 className="mt-3 font-heading text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">
                  {selection?.name ?? "No resume yet"}
                </h2>
                <p className="mt-5 max-w-md text-base leading-6 text-muted-foreground">
                  {error ?? "Choose a Google Doc, PDF or Word file from Drive"}
                </p>
              </>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-8">
              {drive !== "connected" ? (
                <Button asChild>
                  <a href={connectDriveHref}>
                    {drive === "disconnected" ? "Reconnect Google Drive" : "Connect Google Drive"}
                    <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                  </a>
                </Button>
              ) : (
                <Button type="button" onClick={openPicker} disabled={busy}>
                  {busy ? "Opening…" : file ? "Choose another" : "Choose resume"}
                  <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              )}
              {drive === "connected" && file && (
                <>
                  {file.canDownload !== false && (
                    <Button asChild variant="outline" className="h-10 px-4">
                      <a href="/api/resume/content?download=1">
                        Download <Download size={15} />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    type="button"
                    title="Refresh"
                    aria-label="Refresh resume"
                    onClick={() => router.refresh()}
                  >
                    <RefreshCw size={16} />
                  </Button>
                </>
              )}
            </div>
            {message && (
              <p className="mt-4 rounded-lg bg-muted p-3 text-sm" role="alert">
                {message}
              </p>
            )}
          </div>
          <div className="min-h-105 border-t border-border bg-muted/60 lg:border-t-0 lg:border-l">
            {previewUrl ? (
              <iframe
                className="h-105 w-full bg-white lg:h-full lg:min-h-100"
                title="Resume preview"
                src={previewUrl}
              />
            ) : (
              <div className="flex h-full min-h-105 flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileText size={28} strokeWidth={1.3} />
                <p className="mt-3 text-xs font-bold tracking-widest uppercase">No preview</p>
                <small className="text-xs">Choose a resume to preview it</small>
              </div>
            )}
          </div>
        </section>

        {file && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border border-t-0 border-border bg-muted/60 px-5 py-3 text-xs">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Source file
              </span>
              <strong className="truncate font-medium">{file.name}</strong>
            </div>
            <a
              className="inline-flex shrink-0 items-center gap-1 font-semibold hover:underline"
              href={file.webViewLink ?? `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Drive <ArrowUpRight size={14} />
            </a>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="scroll-mt-24" id="how-it-works">
            <Card className="h-full [--card-spacing:--spacing(6)]">
              <CardContent>
                <h3 className="font-heading text-lg leading-7 font-semibold tracking-tight">How it works</h3>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  Shows the Drive file you chose. Never switches files on its own
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  <span>Google Drive</span>
                  <span>→</span>
                  <span>Ken OS</span>
                  <span>→</span>
                  <span>You</span>
                </div>
              </CardContent>
            </Card>
          </section>
          <section className="scroll-mt-24" id="resume-assistant">
            <Card className="h-full [--card-spacing:--spacing(6)]">
              <CardContent>
                <h3 className="font-heading text-lg leading-7 font-semibold tracking-tight">Resume assistant</h3>
                {canAsk ? (
                  <form className="mt-5 flex flex-wrap gap-2" onSubmit={ask}>
                    <Label htmlFor="question" className="sr-only">
                      Question
                    </Label>
                    <Input
                      className="min-w-0 flex-1"
                      id="question"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      maxLength={2000}
                      placeholder="What should I improve?"
                    />
                    <Button type="submit" disabled={asking}>
                      {asking ? "Thinking…" : "Ask"}
                      <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  </form>
                ) : (
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    {file?.mimeType === GOOGLE_DOC_MIME ? "Not set up" : "Works with Google Docs only"}
                  </p>
                )}
                {answer && (
                  <div className="mt-5 rounded-lg bg-muted p-4 text-sm leading-6 whitespace-pre-wrap" role="status">
                    {answer}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
