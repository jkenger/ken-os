"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState, type FormEvent } from "react";
import { DOCX_MIME, GOOGLE_DOC_MIME, type Artifact } from "@ken-os/domain";
import type { ResumeSelection } from "@/lib/resume";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ArrowUpRight, Download, FileText, Plus, RefreshCw } from "lucide-react";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    google?: { picker: {
      ViewId: { DOCS: string };
      Action: { PICKED: string };
      DocsView: new (id: string) => { setMimeTypes(types: string): void };
      PickerBuilder: new () => PickerBuilder;
    } };
  }
}

interface Props {
  email: string;
  selection: ResumeSelection | null;
  file: Artifact | null;
  error: string | null;
  previewUrl: string | null;
  canAsk: boolean;
  preview?: boolean;
  /** A one-line Engineering Lab summary that links into the lab. Absent when the lab has nothing to say yet. */
  labSummary?: { headline: string; detail: string } | null;
}

const mimeNames: Record<string, string> = {
  [GOOGLE_DOC_MIME]: "Google Doc",
  "application/pdf": "PDF",
  [DOCX_MIME]: "Word document",
};

export function ResumeWorkspace({ email, selection, file, error, previewUrl, canAsk, preview = false, labSummary = null }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerSkills, setAnswerSkills] = useState<{ name: string; version: number }[]>([]);
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
      if (!response.ok) throw new Error(data.error ?? "Could not select file.");
      setAnswer(null);
      setAnswerSkills([]);
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not select file.");
    } finally {
      setBusy(false);
    }
  }

  async function openPicker() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
    const appId = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER;
    if (!apiKey || !appId) { setMessage("Google Picker is not configured yet."); return; }
    if (!window.gapi) { setMessage("Google Picker is still loading. Try again shortly."); return; }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/drive/picker-token", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not connect to Google Drive.");
      window.gapi.load("picker", () => {
        const picker = window.google?.picker;
        if (!picker) { setMessage("Google Picker could not load."); setBusy(false); return; }
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
      setMessage(cause instanceof Error ? cause.message : "Could not open Google Picker.");
    }
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    setAnswerSkills([]);
    try {
      const response = await fetch("/api/resume/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not answer.");
      setAnswer(data.answer);
      setAnswerSkills(data.availableSkills ?? []);
    } catch (cause) {
      setAnswer(cause instanceof Error ? cause.message : "Could not answer.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <WorkspaceShell email={email} active="resume" preview={preview}>
      <Script src="https://apis.google.com/js/api.js" strategy="afterInteractive" />
      <div className="mx-auto w-full max-w-[1320px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-8 sm:mb-10">
          <div>
            <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">YOUR DOCUMENTS</p>
            <h1 className="font-display text-4xl font-bold tracking-[-0.06em] sm:text-5xl">Resume hub<span className="text-muted-foreground">.</span></h1>
            <p className="mt-3 text-base leading-6 text-muted-foreground">One place for your current resume, always connected to its source.</p>
          </div>
          <div className="hidden shrink-0 font-display text-3xl font-semibold sm:block">01 <span className="font-sans text-[10px] tracking-[0.14em] text-muted-foreground">/ MODULE</span></div>
        </div>

        {labSummary && (
          <a href="/lab" className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-5 py-4 hover:bg-muted/60">
            <span><span className="block text-[11px] font-bold tracking-[0.14em] text-muted-foreground">ENGINEERING LAB</span><span className="mt-1 block text-[15px] font-semibold">{labSummary.headline}</span></span>
            <span className="text-sm text-muted-foreground">{labSummary.detail}</span>
          </a>
        )}

        <div className="mb-3 flex items-center justify-between text-[11px] font-bold tracking-[0.14em] text-muted-foreground"><span>PRIMARY RESUME</span><span className="hidden sm:inline">GOOGLE DRIVE SOURCE</span></div>
        <section className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <div className="flex min-h-[400px] flex-col items-start p-6 sm:p-8">
            <div className="mb-7 grid size-11 place-items-center rounded-xl bg-secondary text-foreground">{file ? <FileText size={22} strokeWidth={1.6} /> : <Plus size={22} strokeWidth={1.6} />}</div>
            {file ? (
              <>
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-muted-foreground"><span className="size-1.5 rounded-full bg-foreground" />CONNECTED</div>
                <h2 className="mt-3 break-words font-display text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-[28px]">{file.name}</h2>
                <p className="mt-2 text-xs text-muted-foreground">{mimeNames[file.mimeType] ?? "Document"} <span className="mx-1">·</span> Updated {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : "in Drive"}</p>
                <p className="mt-5 max-w-md text-base leading-6 text-muted-foreground">This file stays in Google Drive. Changes to it appear here when you refresh.</p>
              </>
            ) : (
              <>
                <div className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">{selection ? "NEEDS ATTENTION" : "NOT SELECTED"}</div>
                <h2 className="mt-3 break-words font-display text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-[28px]">{selection?.name ?? "Choose your resume"}</h2>
                <p className="mt-5 max-w-md text-base leading-6 text-muted-foreground">{error ?? "Pick the file you want to keep as your current resume."}</p>
              </>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-8">
              <Button type="button" onClick={openPicker} disabled={busy}>{busy ? "Opening…" : file ? "Replace resume" : "Select from Drive"}<ButtonEndIcon><ArrowUpRight size={15} /></ButtonEndIcon></Button>
              {file && <>
                {file.canDownload !== false && <Button asChild variant="outline" className="h-10 px-4"><a href="/api/resume/content?download=1">Download latest <Download size={15} /></a></Button>}
                <Button variant="outline" size="icon" className="size-10" type="button" title="Refresh" aria-label="Refresh resume" onClick={() => router.refresh()}><RefreshCw size={16} /></Button>
              </>}
              {error && <Button asChild variant="outline" className="h-10 px-4"><a href="/api/auth/google">Reconnect Google <ArrowUpRight size={15} /></a></Button>}
            </div>
            {message && <p className="mt-4 rounded-lg bg-muted p-3 text-sm" role="alert">{message}</p>}
          </div>
          <div className="min-h-[420px] border-t border-border bg-muted/60 lg:border-l lg:border-t-0">
            {previewUrl ? <iframe className="h-[420px] w-full bg-white lg:h-full lg:min-h-[400px]" title="Resume preview" src={previewUrl} /> : <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 text-muted-foreground"><FileText size={28} strokeWidth={1.3} /><p className="mt-3 text-[11px] font-bold tracking-[0.14em]">YOUR RESUME PREVIEW</p><small className="text-xs">Select a file to see it here.</small></div>}
          </div>
        </section>

        {file && <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border border-t-0 border-border bg-muted/60 px-5 py-3 text-xs"><div className="flex min-w-0 items-center gap-3"><span className="shrink-0 text-[10px] font-bold tracking-[0.14em] text-muted-foreground">SOURCE FILE</span><strong className="truncate font-medium">{file.name}</strong></div><a className="inline-flex shrink-0 items-center gap-1 font-semibold hover:underline" href={file.webViewLink ?? `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`} target="_blank" rel="noopener noreferrer">Open in Google Drive <ArrowUpRight size={14} /></a></div>}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="scroll-mt-24" id="how-it-works">
            <Card className="h-full [--card-spacing:--spacing(6)]"><CardContent>
            <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">HOW IT WORKS</p>
            <h3 className="font-display text-lg font-semibold leading-7 tracking-[-0.035em]">One selected file. Always current.</h3>
            <p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">Ken OS remembers the exact Drive file you chose. Edits to that file are available here; choosing a new copy is always your decision.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3 text-[10px] font-bold tracking-[0.14em] text-muted-foreground"><span>GOOGLE DRIVE</span><span>→</span><span>KEN OS</span><span>→</span><span>YOU</span></div>
            </CardContent></Card>
          </section>
          <section className="scroll-mt-24" id="resume-assistant">
            <Card className="h-full [--card-spacing:--spacing(6)]"><CardContent>
            <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">RESUME ASSISTANT</p>
            <h3 className="font-display text-lg font-semibold leading-7 tracking-[-0.035em]">Ask about your resume.</h3>
            {canAsk ? <form className="mt-5 flex flex-wrap gap-2" onSubmit={ask}><label htmlFor="question" className="sr-only">Question</label><Input className="min-w-0 flex-1" id="question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000} placeholder="What should I improve?"/><Button type="submit" disabled={asking}>{asking ? "Thinking…" : "Ask"}<ButtonEndIcon><ArrowUpRight size={15} /></ButtonEndIcon></Button></form> : <p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">{file?.mimeType === GOOGLE_DOC_MIME ? "Add an OpenAI API key to enable the assistant." : "The assistant currently works with Google Docs resumes."}</p>}
            {answer && <><div className="mt-5 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-6" role="status">{answer}</div>{answerSkills.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Enabled during this answer: {answerSkills.map((skill) => `${skill.name} v${skill.version}`).join(", ")}</p>}</>}
            </CardContent></Card>
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
