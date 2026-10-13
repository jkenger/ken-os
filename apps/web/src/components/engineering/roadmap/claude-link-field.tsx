"use client";

import { useId, useState } from "react";
import { post } from "@/components/lab/topic/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";

// A pasted Claude link with Save and Clear: the Project in Settings, and a topic's chat in the topic panel
// (docs/architecture/engineering-claude-first.md, section 9e). The server checks it's an https claude.ai link.

export function ClaudeLinkField({
  label,
  value,
  endpoint,
  placeholder,
  helper,
  savedTitle,
  onSaved,
}: {
  label: string;
  value: string | null;
  /** POST { url }; an empty url clears it. */
  endpoint: string;
  placeholder: string;
  helper: string;
  savedTitle: string;
  onSaved: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function save(url: string) {
    setBusy(true);
    setProblem("");
    try {
      await post(endpoint, { url });
      setText(url);
      toast({ tone: "success", title: url ? savedTitle : `${label} cleared` });
      onSaved();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="url"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        aria-invalid={Boolean(problem)}
        aria-describedby={`${id}-help`}
      />
      <p id={`${id}-help`} className={problem ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {problem || helper}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || !text.trim() || text.trim() === value}
          onClick={() => void save(text.trim())}
        >
          Save link
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void save("")}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
