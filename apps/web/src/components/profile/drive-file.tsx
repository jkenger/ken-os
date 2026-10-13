"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { DOCX_MIME, GOOGLE_DOC_MIME, type Artifact } from "@ken-os/domain";
import { AlertCircle, ArrowUpRight, Download, FileText, RefreshCw } from "lucide-react";
import type { DriveAccess } from "@/lib/google";
import type { ResumeSelection } from "@/lib/resume";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { shortDate } from "./dates";

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

export interface DriveFileState {
  /** Whether Drive is granted; sign-in doesn't include it (docs/architecture/auth-sign-in.md §4). */
  access: DriveAccess;
  selection: ResumeSelection | null;
  file: Artifact | null;
  error: string | null;
  /** Why the last Drive grant didn't finish, from `?drive_error=`. */
  notice: string | null;
  previewUrl: string | null;
  canImport: boolean;
}

const mimeNames: Record<string, string> = {
  [GOOGLE_DOC_MIME]: "Google Doc",
  "application/pdf": "PDF",
  [DOCX_MIME]: "Word document",
};

/** Starts the Drive grant and comes back to Profile. */
const connectDriveHref = "/api/auth/google/drive?next=%2Fprofile";

/** The resume file in Google Drive: choose it, preview it, download it, and import it into the Profile. */
export function DriveFile({
  state,
  importing,
  onImport,
}: {
  state: DriveFileState;
  importing: boolean;
  onImport: () => void;
}) {
  const router = useRouter();
  const { file, selection } = state;
  const [access, setAccess] = useState<DriveAccess>(state.access);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
          setAccess(data.drive);
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
            if (result.action === picker.Action.PICKED && result.docs?.[0]?.id) void selectFile(result.docs[0].id);
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

  const connected = access === "connected";
  const title = !connected
    ? access === "disconnected"
      ? "Google Drive disconnected"
      : "Google Drive not connected"
    : (file?.name ?? selection?.name ?? "No resume chosen");
  const detail = !connected
    ? null
    : file
      ? `${mimeNames[file.mimeType] ?? "Document"} · Updated ${file.modifiedTime ? shortDate(file.modifiedTime) : "in Drive"}`
      : (state.error ?? "Google Doc, PDF or Word file");

  return (
    <Card id="drive-file" className="scroll-mt-24">
      <Script src="https://apis.google.com/js/api.js" strategy="afterInteractive" />
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{title}</span>
        </CardTitle>
        {detail && <CardDescription>{detail}</CardDescription>}
        {connected && file && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Refresh"
              title="Refresh"
              onClick={() => router.refresh()}
            >
              <RefreshCw />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.notice && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{state.notice}</AlertTitle>
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!connected ? (
            <Button asChild>
              <a href={connectDriveHref}>
                {access === "disconnected" ? "Reconnect Google Drive" : "Connect Google Drive"}
                <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <>
              {file && state.canImport && (
                <Button type="button" onClick={onImport} disabled={importing}>
                  {importing ? "Importing…" : "Import into Profile"}
                </Button>
              )}
              <Button type="button" variant={file ? "outline" : "default"} onClick={openPicker} disabled={busy}>
                {busy ? "Opening…" : "Choose resume"}
              </Button>
              {file && file.canDownload !== false && (
                <Button asChild variant="outline">
                  <a href="/api/resume/content?download=1">
                    Download
                    <Download data-icon="inline-end" aria-hidden="true" />
                  </a>
                </Button>
              )}
              {file && (
                <Button asChild variant="ghost">
                  <a
                    href={file.webViewLink ?? `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Drive
                    <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </>
          )}
        </div>
        {message && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{message}</AlertTitle>
          </Alert>
        )}
        {state.previewUrl && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="link" className="h-auto px-0">
                Preview
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* White on purpose: a PDF page is drawn on white whatever the theme. */}
              <iframe
                className="mt-2 h-160 w-full rounded-lg border bg-white"
                title="Resume preview"
                src={state.previewUrl}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
