"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState, type FormEvent } from "react";
import { DOCX_MIME, GOOGLE_DOC_MIME, type Artifact } from "@ken-os/domain";
import type { ResumeSelection } from "@/lib/resume";
import { WorkspaceShell } from "@/components/workspace-shell";

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
}

const mimeNames: Record<string, string> = {
  [GOOGLE_DOC_MIME]: "Google Doc",
  "application/pdf": "PDF",
  [DOCX_MIME]: "Word document",
};

export function ResumeWorkspace({ email, selection, file, error, previewUrl, canAsk }: Props) {
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
    <WorkspaceShell email={email} active="resume">
      <Script src="https://apis.google.com/js/api.js" strategy="afterInteractive" />
        <div className="content">
          <div className="page-heading"><div><p className="kicker">YOUR DOCUMENTS</p><h1>Resume hub<span className="heading-dot">.</span></h1><p className="intro">One place for your current resume, always connected to its source.</p></div><div className="heading-number">01 <span>/ MODULE</span></div></div>
          <div className="section-heading"><span>PRIMARY RESUME</span><span>GOOGLE DRIVE SOURCE</span></div>
          <section className="resume-card">
            <div className="resume-details">
              <div className="file-symbol">{file ? "▤" : "+"}</div>
              {file ? <><div className="file-status"><span className="status-dot"/> CONNECTED</div><h2>{file.name}</h2><p className="file-meta">{mimeNames[file.mimeType] ?? "Document"} <span>·</span> Updated {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : "in Drive"}</p><p className="file-description">This file stays in Google Drive. Changes to it appear here when you refresh.</p></> : <><div className="file-status empty">{selection ? "NEEDS ATTENTION" : "NOT SELECTED"}</div><h2>{selection?.name ?? "Choose your resume"}</h2><p className="file-description">{error ?? "Pick the file you want to keep as your current resume."}</p></>}
              <div className="card-actions"><button className="primary-button" type="button" onClick={openPicker} disabled={busy}>{busy ? "Opening…" : file ? "Replace resume" : "Select from Drive"} <span aria-hidden="true">↗</span></button>{file && <>{file.canDownload !== false && <a className="secondary-button" href="/api/resume/content?download=1">Download latest ↓</a>}<button className="icon-button" type="button" title="Refresh" aria-label="Refresh resume" onClick={() => router.refresh()}>↻</button></>}{error && <a className="secondary-button" href="/api/auth/google">Reconnect Google ↗</a>}</div>
              {message && <p className="feedback" role="alert">{message}</p>}
            </div>
            <div className="file-preview-box">{previewUrl ? <iframe title="Resume preview" src={previewUrl} /> : <div className="preview-placeholder"><span>▤</span><p>YOUR RESUME PREVIEW</p><small>Select a file to see it here.</small></div>}</div>
          </section>
          {file && <div className="source-row"><div><span className="source-label">SOURCE FILE</span><strong>{file.name}</strong></div><a href={file.webViewLink ?? `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`} target="_blank" rel="noopener noreferrer">Open in Google Drive ↗</a></div>}
          <div className="lower-grid"><section className="info-card"><p className="kicker">HOW IT WORKS</p><h3>One selected file. Always current.</h3><p>Ken OS remembers the exact Drive file you chose. Edits to that file are available here; choosing a new copy is always your decision.</p><div className="mini-flow"><span>GOOGLE DRIVE</span><span>→</span><span>KEN OS</span><span>→</span><span>YOU</span></div></section><section className="info-card agent-card"><p className="kicker">RESUME ASSISTANT</p><h3>Ask about your resume.</h3>{canAsk ? <form onSubmit={ask}><label htmlFor="question" className="sr-only">Question</label><input id="question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000} placeholder="What should I improve?"/><button type="submit" disabled={asking}>{asking ? "Thinking…" : "Ask ↗"}</button></form> : <p>{file?.mimeType === GOOGLE_DOC_MIME ? "Add an OpenAI API key to enable the assistant." : "The assistant currently works with Google Docs resumes."}</p>}{answer && <><div className="agent-answer" role="status">{answer}</div>{answerSkills.length > 0 && <p className="skill-note">Enabled during this answer: {answerSkills.map((skill) => `${skill.name} v${skill.version}`).join(", ")}</p>}</>}</section></div>
        </div>
    </WorkspaceShell>
  );
}
