"use client";

import { useState, type ReactNode } from "react";
import type { GuideMessage, IntakeAnswers } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { post, textarea } from "../topic/client";

export interface GuideProposals {
  intake: IntakeAnswers | null;
  direction: string | null;
  addChapters: { title: string; area: string; reason: string }[];
}

/**
 * A conversation with the Guide. Its replies can carry proposals (an intake, a direction, a new chapter); the parent
 * shows them as things to confirm. Nothing is decided by the conversation itself.
 */
export function GuideChat({ phase, history, onProposals, opener, subtitle = "The Guide suggests; you confirm every change", footer, className }: {
  phase: "intake" | "direction";
  history: GuideMessage[];
  onProposals: (proposals: GuideProposals) => void;
  opener: string;
  subtitle?: string;
  /** Suggestions to confirm, shown above the message box. */
  footer?: ReactNode;
  className?: string;
}) {
  const [messages, setMessages] = useState<GuideMessage[]>(history.slice(-12));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true); setProblem("");
    const mine: GuideMessage = { role: "owner", text, at: new Date().toISOString() };
    setMessages((current) => [...current, mine]);
    setDraft("");
    try {
      const result = await post<{ reply: string } & GuideProposals>("/api/lab/profile/guide", { phase, text });
      setMessages((current) => [...current, { role: "guide", text: result.reply, at: new Date().toISOString() }]);
      onProposals({ intake: result.intake, direction: result.direction, addChapters: result.addChapters });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Guide couldn't answer. Try again");
      setMessages((current) => current.filter((message) => message !== mine));
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }

  // A pane: header, messages that scroll, then suggestions and the message box pinned at the bottom.
  return (
    <section className={cn("flex min-h-[420px] flex-col rounded-lg border border-border", className)} aria-labelledby="guide-title">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold" id="guide-title">Guide</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4" aria-live="polite">
        <p className="max-w-[92%] rounded-md bg-muted px-3 py-2 text-sm leading-5">{opener}</p>
        {messages.map((message, index) => (
          <p key={index} className={cn("max-w-[92%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-5", message.role === "owner" ? "ml-auto border border-border" : "bg-muted")}>
            <span className="sr-only">{message.role === "owner" ? "You: " : "Guide: "}</span>{message.text}
          </p>
        ))}
        {busy && <p className="text-sm text-muted-foreground">Thinking…</p>}
      </div>
      {footer && <div className="space-y-2 border-t border-border p-3">{footer}</div>}
      <div className="border-t border-border p-3">
        <label className="block">
          <span className="sr-only">Message</span>
          <textarea
            className={cn(textarea, "min-h-[64px]")} value={draft} onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void send(); }}
            placeholder="Message the Guide"
          />
        </label>
        {problem && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm" role="alert">{problem}</p>}
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Ctrl+Enter to send · 1 AI use per reply</p>
          <Button type="button" size="sm" disabled={busy || !draft.trim()} onClick={() => void send()}>{busy ? "Sending…" : "Send"}</Button>
        </div>
      </div>
    </section>
  );
}
