"use client";

import { useCallback, useEffect, useState } from "react";
import { IconArrowRight, IconLink, IconPencil, IconTrash } from "@tabler/icons-react";
import { TOPIC_STATUSES, type TopicStatus } from "@ken-os/domain";
import { post, send } from "@/components/lab/topic/client";
import { formatDate } from "@/components/lab/words";
import { DockedPanel } from "@/components/docked-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TopicPanelView } from "@/features/engineering-lab/roadmap-store";
import type { NoteView, ReportView } from "@/features/engineering-lab/status-store";
import { ClaudeLinkField } from "./claude-link-field";
import { CodeSheet } from "./code-sheet";
import { ReviewTab } from "./review-tab";
import { StatusChip, StatusIcon, StatusLabel, statusWords } from "./status";
import { TaskProgress, TopicTaskAction, TopicTasks } from "./topic-tasks";
import { NotPlanned, TopicFacts, TopicLinks, TopicResources } from "./topic-material";
import { chapterClasses } from "./chapter-mark";
import { cn } from "@/lib/utils";

// The roadmap's topic panel (docs/architecture/engineering-claude-first.md, section 1, and docs/architecture/roadmap-ui.md)
// in two modes. Overview, beside the graph: task progress and the next topic, with the main button and Open in lanes
// under it (which shows Lanes for this visit without saving it as your layout). Detail, beside the
// lanes, in two tabs. Topic: the tasks (Read, Build, Explain), mastery criteria, the status with a menu to change it,
// Link chat, and the sessions timeline from Claude's reports. Review: the review sheet and notes (section 9h). The main
// button is the first task left to do, or Next topic once it's done (engineering-progressive-flow.md, sections 2 and 3).
// The owner can set any status and edit or delete any note. From 1280px the panel docks beside the roadmap; below that
// it is a sheet (DockedPanel).

export type TopicTab = "topic" | "review";

const sectionTitle = "mb-2 text-xs font-semibold text-muted-foreground";
const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

async function load(topicId: string, roadmapId: string | null): Promise<TopicPanelView> {
  const query = roadmapId ? `?roadmap=${encodeURIComponent(roadmapId)}` : "";
  const response = await fetch(`/api/lab/topics/${encodeURIComponent(topicId)}/panel${query}`);
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
          Set by {panel.status.setBy === "owner" ? "you" : panel.status.setBy === "claude" ? "Claude" : "Loots"}
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

/** Claude's reports and the owner's status changes as a timeline, newest first: when, what was covered, where stuck. */
function Sessions({ reports }: { reports: ReportView[] }) {
  if (!reports.length) {
    return <p className="text-xs text-muted-foreground">No sessions · Claude adds one as you learn</p>;
  }
  return (
    <ol className="ml-1 border-l">
      {reports.map((report) => (
        <li key={report.id} className="relative pb-4 pl-4 text-sm last:pb-0">
          <span aria-hidden="true" className="absolute top-1.5 -left-[4.5px] size-2 rounded-full bg-border" />
          <p className="text-xs text-muted-foreground">
            {formatDate(report.at)} · {report.by === "claude" ? "Claude" : "You"}
          </p>
          {report.summary && <p className="mt-0.5">{report.summary}</p>}
          {report.stuck && (
            <p className="mt-1 text-xs">
              <span className="font-semibold">Stuck:</span> {report.stuck}
            </p>
          )}
          {report.built && <p className="mt-1 text-xs font-semibold">Build done · your code is under Build</p>}
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
        </li>
      ))}
    </ol>
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

export type TopicMode = "overview" | "detail";

export function TopicSheet({
  topicId,
  roadmapId,
  roadmapActive,
  projectUrl,
  mode,
  tab,
  onTabChange,
  onOpenDetail,
  onClose,
  onChanged,
  onSelect,
  docked = false,
  chapterIndex = null,
}: {
  topicId: string | null;
  /** Overview beside the graph; Detail beside the lanes, with the tasks, mastery criteria and the Review tab. */
  mode: TopicMode;
  /** Topic or Review, in Detail; the page holds it, so search can open a topic on its review. */
  tab: TopicTab;
  onTabChange: (tab: TopicTab) => void;
  /** Open in lanes: the page switches to Lanes for this visit (not saved as the layout), and the panel to Detail. */
  onOpenDetail: () => void;
  /** The roadmap it's opened on, for Next topic and chapter done. */
  roadmapId: string | null;
  /** False on an archived roadmap: the tasks show, but not Next topic. */
  roadmapActive: boolean;
  projectUrl: string | null;
  onClose: () => void;
  /** Opens another topic, for Next topic. */
  onSelect: (topicId: string) => void;
  /** Called after a change, so the roadmap can show the new status. */
  onChanged: () => void;
  /** Wide screens: a panel beside the roadmap, so the roadmap stays in view. Otherwise a sheet over it. */
  docked?: boolean;
  /** The topic's chapter position on the roadmap, for its accent; null when it isn't on it. */
  chapterIndex?: number | null;
}) {
  const [panel, setPanel] = useState<TopicPanelView | null>(null);
  const [problem, setProblem] = useState("");
  const [coding, setCoding] = useState(false);
  const [linking, setLinking] = useState(false);

  const refresh = useCallback(
    (id: string) =>
      load(id, roadmapId)
        .then((next) => {
          setPanel(next);
          setProblem("");
        })
        .catch((error: unknown) => setProblem(errorText(error, "Couldn't load the topic. Try again"))),
    [roadmapId],
  );

  useEffect(() => {
    setPanel(null);
    setCoding(false);
    setLinking(false);
    if (topicId) void refresh(topicId);
  }, [topicId, refresh]);

  const saved = () => {
    if (topicId) void refresh(topicId);
    onChanged();
  };

  const loading = (
    <>
      {problem && <p className="p-4 text-sm text-destructive">{problem}</p>}
      {!panel && !problem && (
        <div className="grid gap-3 p-4" aria-busy="true" aria-label="Loading topic">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </>
  );

  // The topic's line: Claude's description once written (any-topic.ts applies it), else the topic map's line.
  const descriptionText = panel?.gap ?? null;

  // Overview: where the topic stands and what comes after it. The rest is one click away in Lanes.
  const overview = panel && (
    <div className="grid gap-6 p-4">
      <TaskProgress panel={panel} />
      <TopicLinks plan={panel.plan} onSelect={onSelect} />
      {panel.next && roadmapActive && (
        <section aria-labelledby="next-title" className="grid gap-1.5">
          <h3 id="next-title" className={sectionTitle}>
            Next in path
          </h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSelect(panel.next!.id)}
            className="h-auto min-h-11 justify-start gap-2.5 text-left whitespace-normal"
          >
            <IconArrowRight aria-hidden="true" className="text-muted-foreground" />
            <span className="min-w-0 flex-1">{panel.next.title}</span>
          </Button>
        </section>
      )}
    </div>
  );

  // Detail: what to do and how you'll know you've got it, then your record, with the review sheet and notes in Review.
  const detail = panel && (
    <Tabs value={tab} onValueChange={(next) => onTabChange(next as TopicTab)} className="gap-0">
      <TabsList aria-label="Topic view" className="mx-4 mt-4">
        <TabsTrigger value="topic">Topic</TabsTrigger>
        <TabsTrigger value="review">Review{panel.notes.length > 0 && ` · ${panel.notes.length}`}</TabsTrigger>
      </TabsList>
      <TabsContent value="review" className="p-4">
        <ReviewTab topicId={panel.id} notes={<Notes topicId={panel.id} notes={panel.notes} onSaved={saved} />} />
      </TabsContent>
      <TabsContent value="topic" className="grid gap-6 p-4">
        <NotPlanned panel={panel} projectUrl={projectUrl} />
        <TopicResources material={panel.material} />
        <TopicTasks panel={panel} />
        {panel.points.length > 0 && (
          <section aria-labelledby="mastery-title" className="grid gap-2">
            <h3 id="mastery-title" className="text-sm font-semibold">
              Mastery criteria
            </h3>
            <ul className="grid list-disc gap-1.5 pl-5 text-sm">
              {panel.points.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}
        <section aria-labelledby="status-title">
          <h3 id="status-title" className={sectionTitle}>
            Status
          </h3>
          <StatusMenu panel={panel} onSaved={saved} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 -ml-2"
            aria-expanded={linking}
            onClick={() => setLinking((open) => !open)}
          >
            <IconLink aria-hidden="true" />
            {panel.chatUrl ? "Change chat" : "Link chat"}
          </Button>
          {linking && (
            <ClaudeLinkField
              label="Chat for this topic"
              value={panel.chatUrl}
              endpoint={`/api/lab/topics/${encodeURIComponent(panel.id)}/chat`}
              placeholder="https://claude.ai/chat/…"
              helper="Paste the chat you learned this topic in"
              savedTitle="Chat linked"
              onSaved={() => {
                setLinking(false);
                saved();
              }}
            />
          )}
        </section>
        <section aria-labelledby="sessions-title">
          <h3 id="sessions-title" className={sectionTitle}>
            Sessions{panel.reports.length > 0 && ` · ${panel.reports.length}`}
          </h3>
          <Sessions reports={panel.reports} />
        </section>
      </TabsContent>
    </Tabs>
  );

  const footer = panel && (
    <div className="sticky bottom-0 mt-auto grid gap-2 border-t bg-card p-4">
      <TopicTaskAction
        panel={panel}
        projectUrl={projectUrl}
        onPractice={() => setCoding(true)}
        onSelect={onSelect}
        showNext={roadmapActive}
      />
      {mode === "overview" && (
        <Button type="button" variant="ghost" onClick={onOpenDetail}>
          Open in lanes
          <IconArrowRight aria-hidden="true" />
        </Button>
      )}
    </div>
  );

  const heading = (
    <div className="flex items-center gap-2">
      {panel && <StatusChip status={panel.status.status} />}
      {panel && (
        <Badge
          variant="secondary"
          className={cn("max-w-48 truncate", chapterIndex !== null && chapterClasses(chapterIndex).tile)}
        >
          {panel.chapter}
        </Badge>
      )}
    </div>
  );

  const body = (
    <>
      {loading}
      {mode === "overview" ? overview : detail}
      {footer}
    </>
  );

  const code = panel && <CodeSheet topic={panel} open={coding} onClose={() => setCoding(false)} onChanged={saved} />;

  return (
    <>
      <DockedPanel
        open={Boolean(topicId)}
        docked={docked}
        onClose={onClose}
        closeLabel="Close topic"
        badges={heading}
        title={panel?.title ?? "Loading topic"}
        ready={Boolean(panel)}
        description={descriptionText}
        descriptionFallback={panel?.chapter ?? "Topic"}
        facts={<TopicFacts plan={panel?.plan ?? null} />}
      >
        {body}
      </DockedPanel>
      {code}
    </>
  );
}
