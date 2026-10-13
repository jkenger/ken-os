"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCode, IconPencil, IconTrash } from "@tabler/icons-react";
import { TOPIC_STATUSES, type TopicStatus } from "@ken-os/domain";
import { post, send } from "@/components/lab/topic/client";
import { formatDate } from "@/components/lab/words";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TopicPanelView } from "@/features/engineering-lab/roadmap-store";
import type { NoteView, ReportView } from "@/features/engineering-lab/status-store";
import { AskClaude } from "../ask-claude";
import { CodeSheet } from "./code-sheet";
import { StatusIcon, StatusLabel, statusWords } from "./status";

// The roadmap's topic panel (docs/architecture/engineering-claude-first.md, section 1): the status, with a menu to change
// it; Ask Claude; Try it in code; Claude's reports; and notes. The owner can set any status and edit or delete any note.

const sectionTitle = "mb-2 text-xs font-semibold text-muted-foreground";
const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

async function load(topicId: string): Promise<TopicPanelView> {
  const response = await fetch(`/api/lab/topics/${encodeURIComponent(topicId)}/panel`);
  const body = (await response.json().catch(() => ({}))) as TopicPanelView & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Couldn't load the topic. Try again");
  return body;
}

function StatusMenu({ panel, onSaved }: { panel: TopicPanelView; onSaved: () => void }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(status: TopicStatus, why?: string) {
    setBusy(true);
    try {
      await post(`/api/lab/topics/${encodeURIComponent(panel.id)}/status`, { status, reason: why });
      setAsking(false);
      setReason("");
      toast({ tone: "success", title: `${panel.title} · ${statusWords[status]}` });
      onSaved();
    } catch (error) {
      toast({ tone: "error", title: "Couldn't change the status. Try again", description: errorText(error, "") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={asking ? "learned" : panel.status.status}
        onValueChange={(value) => {
          if (!value || busy) return;
          if (value === "learned") return setAsking(true);
          setAsking(false);
          if (value !== panel.status.status) void save(value as TopicStatus);
        }}
        aria-label="Status"
        className="flex-wrap"
      >
        {TOPIC_STATUSES.map((status) => (
          <ToggleGroupItem key={status} value={status} className="gap-1.5 text-xs">
            <StatusIcon status={status} size={14} />
            {statusWords[status]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {panel.status.setBy && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Set by {panel.status.setBy === "owner" ? "you" : panel.status.setBy === "claude" ? "Claude" : "Ken OS"}
          {panel.status.changedAt ? ` · ${formatDate(panel.status.changedAt)}` : ""}
        </p>
      )}
      {asking && (
        <div className="mt-3 grid gap-2">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Built the retry policy at work last month"
            aria-label="Why it's learned"
            className="min-h-16 text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !reason.trim()}
              onClick={() => void save("learned", reason)}
            >
              Mark learned
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Reports({ reports }: { reports: ReportView[] }) {
  if (!reports.length) {
    return <p className="text-xs text-muted-foreground">No reports · Claude adds one as you learn</p>;
  }
  return (
    <ul className="divide-y border-y">
      {reports.map((report) => (
        <li key={report.id} className="py-2.5 text-sm">
          {report.summary && <p>{report.summary}</p>}
          {report.status && (
            <p className="mt-1">
              <StatusLabel status={report.status} />
            </p>
          )}
          {report.evidence && (
            <blockquote className="mt-2 border-l-2 pl-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {report.evidence}
              {report.evidenceNote && <span className="mt-1 block not-italic">Note: {report.evidenceNote}</span>}
            </blockquote>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {report.by === "claude" ? "Claude" : "You"} · {formatDate(report.at)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Note({ topicId, note, onSaved }: { topicId: string; note: NoteView; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.body);
  const [busy, setBusy] = useState(false);

  async function change(method: "PUT" | "DELETE") {
    setBusy(true);
    try {
      await send(`/api/lab/notes/${encodeURIComponent(note.id)}`, method, method === "PUT" ? { body: text } : {});
      setEditing(false);
      if (method === "DELETE") toast({ tone: "success", title: "Note deleted" });
      onSaved();
    } catch (error) {
      toast({ tone: "error", title: "Couldn't save the note. Try again", description: errorText(error, "") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-2.5 text-sm" data-topic={topicId}>
      {editing ? (
        <div className="grid gap-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Note"
            className="min-h-16 text-sm"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy || !text.trim()} onClick={() => void change("PUT")}>
              Save note
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setText(note.body);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap">{note.body}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span className="mr-auto">
              {note.author === "claude" ? "Claude" : "You"} · {formatDate(note.createdAt)}
            </span>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Edit note"
              onClick={() => setEditing(true)}
            >
              <IconPencil aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Delete note"
              disabled={busy}
              onClick={() => void change("DELETE")}
            >
              <IconTrash aria-hidden="true" />
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

function Notes({ topicId, notes, onSaved }: { topicId: string; notes: NoteView[]; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      await post(`/api/lab/topics/${encodeURIComponent(topicId)}/notes`, { body: text });
      setText("");
      onSaved();
    } catch (error) {
      toast({ tone: "error", title: "Couldn't add the note. Try again", description: errorText(error, "") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {notes.length > 0 && (
        <ul className="mb-3 divide-y border-y">
          {notes.map((note) => (
            <Note key={note.id} topicId={topicId} note={note} onSaved={onSaved} />
          ))}
        </ul>
      )}
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Say keeps in sync with, not runs when"
        aria-label="New note"
        className="min-h-16 text-sm"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2"
        disabled={busy || !text.trim()}
        onClick={() => void add()}
      >
        Add note
      </Button>
    </div>
  );
}

export function TopicSheet({
  topicId,
  projectUrl,
  onClose,
  onChanged,
}: {
  topicId: string | null;
  projectUrl: string | null;
  onClose: () => void;
  /** Called after a change, so the roadmap can show the new status. */
  onChanged: () => void;
}) {
  const [panel, setPanel] = useState<TopicPanelView | null>(null);
  const [problem, setProblem] = useState("");
  const [coding, setCoding] = useState(false);

  const refresh = useCallback(
    (id: string) =>
      load(id)
        .then((next) => {
          setPanel(next);
          setProblem("");
        })
        .catch((error: unknown) => setProblem(errorText(error, "Couldn't load the topic. Try again"))),
    [],
  );

  useEffect(() => {
    setPanel(null);
    setCoding(false);
    if (topicId) void refresh(topicId);
  }, [topicId, refresh]);

  const saved = () => {
    if (topicId) void refresh(topicId);
    onChanged();
  };

  return (
    <>
      <Sheet open={Boolean(topicId)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetDescription>{panel ? `${panel.area} · ${panel.chapter}` : "Topic"}</SheetDescription>
            <SheetTitle className="text-xl">{panel?.title ?? " "}</SheetTitle>
          </SheetHeader>
          {problem && <p className="p-4 text-sm text-destructive">{problem}</p>}
          {!panel && !problem && (
            <div className="grid gap-3 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {panel && (
            <div className="grid gap-6 p-4">
              <p className="text-sm text-muted-foreground">{panel.gap}</p>
              <StatusMenu panel={panel} onSaved={saved} />
              <div className="flex flex-wrap gap-2">
                {projectUrl && <AskClaude topic={panel} projectUrl={projectUrl} />}
                <Button type="button" variant="outline" size="sm" onClick={() => setCoding(true)}>
                  <IconCode aria-hidden="true" />
                  Try it in code
                </Button>
              </div>
              <section>
                <h3 className={sectionTitle}>Reports</h3>
                <Reports reports={panel.reports} />
              </section>
              <section>
                <h3 className={sectionTitle}>Notes</h3>
                <Notes topicId={panel.id} notes={panel.notes} onSaved={saved} />
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {panel && <CodeSheet topic={panel} open={coding} onClose={() => setCoding(false)} onChanged={saved} />}
    </>
  );
}
