"use client";

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { PROFILE_LIMITS } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Bullets edited as a list: one row per bullet, Enter starts the next, Backspace on an empty one removes it, and a
// paste of several lines becomes several bullets. Each bullet stays one plain line, as the resume prints it.

const LONG_WORDS = 20;
const words = (line: string) => line.split(/\s+/).filter(Boolean).length;

export function ListEditor({
  id,
  label,
  value,
  onChange,
  noun = "bullet",
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  noun?: string;
}) {
  const lines = value.length ? value : [""];
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  /** The row to focus after the list changes shape (a new or removed bullet). */
  const focusNext = useRef<number | null>(null);

  useEffect(() => {
    if (focusNext.current === null) return;
    const input = inputs.current[focusNext.current];
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
    focusNext.current = null;
  });

  function set(index: number, text: string) {
    onChange(lines.map((line, at) => (at === index ? text : line)));
  }

  function insertAfter(index: number, added: string[]) {
    if (lines.length + added.length > PROFILE_LIMITS.lines) return;
    focusNext.current = index + added.length;
    onChange([...lines.slice(0, index + 1), ...added, ...lines.slice(index + 1)]);
  }

  function remove(index: number) {
    focusNext.current = Math.max(0, index - 1);
    onChange(lines.filter((_, at) => at !== index));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Enter") {
      event.preventDefault();
      insertAfter(index, [""]);
    } else if (event.key === "Backspace" && lines[index] === "" && lines.length > 1) {
      event.preventDefault();
      remove(index);
    }
  }

  /** Several pasted lines become several bullets, with list marks such as "•" or "1." taken off. */
  function onPaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    const pasted = event.clipboardData
      .getData("text")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s*/, "").trim())
      .filter(Boolean);
    if (pasted.length < 2) return;
    event.preventDefault();
    const [first, ...rest] = pasted;
    const current = lines[index];
    const merged = lines.map((line, at) => (at === index ? (current ? `${current} ${first}` : first) : line));
    const room = PROFILE_LIMITS.lines - merged.length;
    focusNext.current = index + Math.min(rest.length, room);
    onChange([...merged.slice(0, index + 1), ...rest.slice(0, room), ...merged.slice(index + 1)]);
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <ul className="grid gap-1.5" aria-label={label}>
        {lines.map((line, index) => {
          const long = words(line) > LONG_WORDS;
          return (
            <li key={index} className="grid gap-1">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="w-3 shrink-0 text-center text-muted-foreground">
                  •
                </span>
                <Input
                  id={index ? `${id}-${index}` : id}
                  ref={(element) => {
                    inputs.current[index] = element;
                  }}
                  value={line}
                  maxLength={PROFILE_LIMITS.line}
                  aria-label={`${label}, ${noun} ${index + 1}`}
                  aria-invalid={long || undefined}
                  className={cn(long && "border-ring")}
                  onChange={(event) => set(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  onPaste={(event) => onPaste(event, index)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${noun} ${index + 1}`}
                  title={`Remove ${noun}`}
                  onClick={() => (lines.length > 1 ? remove(index) : onChange([]))}
                >
                  <X />
                </Button>
              </div>
              {long && <p className="pl-5 text-xs text-muted-foreground">{words(line)} words, aim for 20 or fewer</p>}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-3 pl-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2.5"
          onClick={() => insertAfter(lines.length - 1, [""])}
          disabled={lines.length >= PROFILE_LIMITS.lines}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add {noun}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {lines.filter((line) => line.trim()).length} of {PROFILE_LIMITS.lines}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Enter adds a bullet, pasting several lines splits them</p>
    </div>
  );
}
