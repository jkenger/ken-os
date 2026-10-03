"use client";

import { useState } from "react";
import type { GuideMessage, IntakeAnswers } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { post, textarea } from "../topic/client";
import { label } from "../words";

export interface GuideProposals {
  intake: IntakeAnswers | null;
  direction: string | null;
  addChapters: { title: string; area: string; reason: string }[];
}

/**
 * A conversation with the Guide. Its replies can carry proposals (an intake, a direction, a new chapter); the parent
 * shows them as things to confirm. Nothing is decided by the conversation itself.
 */
export function GuideChat({ phase, history, onProposals, opener }: {
  phase: "intake" | "direction";
  history: GuideMessage[];
  onProposals: (proposals: GuideProposals) => void;
  opener: string;
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
      setProblem(error instanceof Error ? error.message : "The Guide could not answer.");
      setMessages((current) => current.filter((message) => message !== mine));
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border p-5" aria-label="Conversation with the Guide">
      <p className={label}>THE GUIDE</p>
      <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto" aria-live="polite">
        <p className="max-w-[560px] rounded-lg bg-muted px-4 py-3 text-sm leading-6">{opener}</p>
        {messages.map((message, index) => (
          <p key={index} className={cn("max-w-[560px] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6", message.role === "owner" ? "ml-auto border border-border" : "bg-muted")}>
            <span className="sr-only">{message.role === "owner" ? "You: " : "Guide: "}</span>{message.text}
          </p>
        ))}
        {busy && <p className="text-sm text-muted-foreground">The Guide is thinking...</p>}
      </div>
      <label className="mt-4 block">
        <span className="sr-only">Your message</span>
        <textarea
          className={cn(textarea, "min-h-[80px]")} value={draft} onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void send(); }}
          placeholder="Write as you would say it."
        />
      </label>
      {problem && <p className="mt-2 rounded-lg bg-muted px-4 py-3 text-sm" role="alert">{problem}</p>}
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Ctrl+Enter sends. Each reply uses one of today&apos;s AI generations.</p>
        <Button type="button" disabled={busy || !draft.trim()} onClick={() => void send()}>{busy ? "Sending..." : "Send"}</Button>
      </div>
    </section>
  );
}
