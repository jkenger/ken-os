"use client";

import { useState } from "react";
import { AlertCircle, Lightbulb, Sparkles } from "lucide-react";
import {
  applyRewrite,
  REWRITE_TARGET_ROLE_MAX,
  textAt,
  type ProfileDetails,
  type RewriteSuggestion,
} from "@ken-os/domain";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { send } from "@/lib/api-client";

// The AI rewrite on Details: one pass over the summary and bullets, then accept or undo each line. Accepted lines go
// into the form like typing would; nothing is stored until Save. Spec: docs/product/profile-resume.md, "Step 3 design".

type Status = "open" | "accepted" | "stale";
type Suggestion = RewriteSuggestion & { status: Status };

export function RewritePanel({
  details,
  setDetails,
}: {
  details: ProfileDetails;
  setDetails: (update: (current: ProfileDetails) => ProfileDetails) => void;
}) {
  const [targetRole, setTargetRole] = useState("");
  const [running, setRunning] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const open = suggestions?.filter((item) => item.status === "open") ?? [];

  async function run() {
    setRunning(true);
    setProblem(null);
    try {
      const result = await send<{ suggestions: RewriteSuggestion[] }>("/api/profile/rewrite", "POST", {
        details,
        targetRole,
      });
      setSuggestions(result.suggestions.map((item) => ({ ...item, status: "open" })));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Rewrite failed. Try again");
    } finally {
      setRunning(false);
    }
  }

  function mark(ids: string[], status: Status) {
    setSuggestions((current) => current?.map((item) => (ids.includes(item.id) ? { ...item, status } : item)) ?? null);
  }

  /** Puts suggestions into the form. A line the owner changed since the rewrite is left alone and marked. */
  function accept(items: Suggestion[]) {
    const fresh = items.filter((item) => textAt(details, item.id) === item.before);
    setDetails((current) => fresh.reduce((next, item) => applyRewrite(next, item.id, item.after), current));
    mark(
      fresh.map((item) => item.id),
      "accepted",
    );
    mark(
      items.filter((item) => !fresh.includes(item)).map((item) => item.id),
      "stale",
    );
  }

  function undo(item: Suggestion) {
    if (textAt(details, item.id) === item.after) setDetails((current) => applyRewrite(current, item.id, item.before));
    mark([item.id], "open");
  }

  return (
    <Card id="improve-writing" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
          Improve writing
        </CardTitle>
        <CardDescription>Summary and bullets, from your own details</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-60 flex-1 gap-2">
            <Label htmlFor="target-role">Target role</Label>
            <Input
              id="target-role"
              value={targetRole}
              maxLength={REWRITE_TARGET_ROLE_MAX}
              placeholder={details.contact.headline || "Any role"}
              onChange={(event) => setTargetRole(event.target.value)}
            />
          </div>
          <Button type="button" onClick={run} disabled={running}>
            {running ? "Improving…" : suggestions ? "Run again" : "Improve writing"}
          </Button>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Optional, shapes the wording</p>

        {problem && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{problem}</AlertTitle>
          </Alert>
        )}

        {suggestions && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">
                {suggestions.length ? `${suggestions.length} suggestions` : "No changes suggested"}
              </h3>
              {open.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => accept(open)}>
                  Accept all
                </Button>
              )}
            </div>
            <ol className="flex flex-col gap-4">
              {suggestions.map((item) => (
                <li key={item.id} className="grid gap-1.5 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{item.place}</span>
                    <SuggestionActions item={item} onAccept={() => accept([item])} onUndo={() => undo(item)} />
                  </div>
                  {item.before && <p className="text-sm text-muted-foreground line-through">{item.before}</p>}
                  <p className="text-sm">{item.after}</p>
                  {item.tip && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {item.tip}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionActions({ item, onAccept, onUndo }: { item: Suggestion; onAccept: () => void; onUndo: () => void }) {
  if (item.status === "stale") return <Badge variant="outline">Line changed since</Badge>;
  if (item.status === "accepted") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Accepted</Badge>
        <Button type="button" variant="ghost" size="sm" onClick={onUndo}>
          Undo
        </Button>
      </div>
    );
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={onAccept}>
      Accept
    </Button>
  );
}
