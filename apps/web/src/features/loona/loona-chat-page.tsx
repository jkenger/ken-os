"use client";

import { useState } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { panel } from "@/components/surfaces";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { LoonaMessage } from "@/features/loona/store";

export function LoonaChatPage({ email, initialMessages }: { email: string; initialMessages: LoonaMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    setMessages((previous) => [...previous, { role: "user", content: trimmed }]);
    try {
      const response = await fetch("/api/agents/loona/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const payload = (await response.json().catch(() => ({}))) as { messages?: LoonaMessage[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Couldn't reach Loona. Try again");
      setMessages(payload.messages ?? []);
    } catch (error) {
      toast({
        tone: "error",
        title: "Couldn't reach Loona",
        description: error instanceof Error ? error.message : undefined,
      });
      setMessages((previous) => previous.filter((message) => message.content !== trimmed));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <WorkspaceShell email={email} active="agents">
      <div className="mx-auto flex h-[calc(100vh-44px)] w-full max-w-2xl flex-col px-page pt-page pb-section">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                panel,
                "max-w-[85%] px-3 py-2 text-sm",
                message.role === "user" ? "ml-auto bg-accent" : "bg-card",
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="mt-3 flex items-end gap-2"
        >
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Message Loona"
            disabled={sending}
            className="min-h-11 flex-1 resize-none"
            aria-label="Message Loona"
          />
          <Button type="submit" disabled={sending || !text.trim()}>
            Send
          </Button>
        </form>
      </div>
    </WorkspaceShell>
  );
}
