"use client";

import { useState } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import type { Topic } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { askClaudeMessage } from "@/features/engineering-lab/ask-claude";

// Ask Claude on a topic page (docs/architecture/engineering-claude-connector.md, section 6). claude.ai can't pre-fill
// a message from a link, so opening the dialog copies the starter message and shows it, and Open Claude goes to the
// owner's Project, where they paste it. The confirmation stays on this page instead of on a tab they've left.

type CopyState = "copying" | "copied" | "failed";

const copyWords: Record<CopyState, string> = {
  copying: "Copying…",
  copied: "Copied · paste it in Claude",
  failed: "Couldn't copy · select the message and copy it",
};

export function AskClaude({ topic, projectUrl }: { topic: Pick<Topic, "id" | "title">; projectUrl: string }) {
  const message = askClaudeMessage(topic);
  const [state, setState] = useState<CopyState>("copying");

  async function copy() {
    setState("copying");
    try {
      await navigator.clipboard.writeText(message);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        // Copy inside the click that opened the dialog, while the browser still allows it.
        if (open) void copy();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Ask Claude
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask Claude</DialogTitle>
          <DialogDescription role="status" className={state === "failed" ? "text-destructive" : undefined}>
            {copyWords[state]}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-muted px-4 py-3 font-mono text-sm leading-relaxed break-words select-all">
          {message}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => void copy()}>
            Copy again
          </Button>
          <Button asChild>
            <a href={projectUrl} target="_blank" rel="noopener noreferrer">
              Open Claude
              <IconExternalLink size={15} aria-hidden="true" />
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
