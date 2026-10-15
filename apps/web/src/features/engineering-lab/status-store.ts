import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  claudeMayChange,
  computeTopicStatus,
  EVIDENCE_MIN_LENGTH,
  readStatus,
  type ClaudeStatus,
  type StatusEvent,
  type TopicStatus,
  type TopicStatusView,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { ownerDayStart } from "@/lib/day";
import { labNotes, labTopicEvents } from "@/lib/schema";
import { topicMap } from "./curriculum";
import { LabInputError } from "./errors";
import { requireAnyTopic } from "./any-topic";
import { recordEvent } from "./store";

// Topic statuses, Claude's reports and notes. Spec: docs/architecture/engineering-claude-first.md, sections 2 and 4.
// Statuses are rebuilt from lab_topic_events, the same events the old progress reads, so old work carries over.

/** The longest report summary and note. */
export const SUMMARY_MAX = 500;
export const NOTE_MAX = 2_000;
export const EVIDENCE_MAX = 6_000;

const statusColumns = {
  topicId: labTopicEvents.topicId,
  kind: labTopicEvents.kind,
  passed: labTopicEvents.passed,
  status: labTopicEvents.status,
  source: labTopicEvents.source,
  createdAt: labTopicEvents.createdAt,
};

type StatusRow = { topicId: string } & StatusEvent;

function byTopic(rows: StatusRow[]) {
  const grouped = new Map<string, StatusRow[]>();
  for (const row of rows) grouped.set(row.topicId, [...(grouped.get(row.topicId) ?? []), row]);
  return grouped;
}

/** Every topic's status, keyed by topic id. Topics with no events are Not started. */
export async function topicStatuses(userId: string): Promise<Map<string, TopicStatusView>> {
  const rows = (await db()
    .select(statusColumns)
    .from(labTopicEvents)
    .where(eq(labTopicEvents.userId, userId))) as StatusRow[];
  const grouped = byTopic(rows);
  // Every map topic, plus any topic Claude added that has events.
  const ids = new Set([...topicMap.topics.map((topic) => topic.id), ...grouped.keys()]);
  return new Map([...ids].map((id) => [id, computeTopicStatus(grouped.get(id) ?? [])]));
}

export async function topicStatus(userId: string, topicId: string): Promise<TopicStatusView> {
  await requireAnyTopic(userId, topicId);
  const rows = (await db()
    .select(statusColumns)
    .from(labTopicEvents)
    .where(and(eq(labTopicEvents.userId, userId), eq(labTopicEvents.topicId, topicId)))) as StatusRow[];
  return computeTopicStatus(rows);
}

export interface ReportInput {
  summary: string;
  /** Where the owner got stuck this session, if anywhere. */
  stuck?: string;
  status?: ClaudeStatus;
  /** Required for Learned: the owner's explanation word for word, and Claude's note on how they got there. */
  evidence?: { explanation: string; note: string };
}

/**
 * A report from Claude. It always adds a line to the topic's history; the first one starts the topic. Learned needs the
 * owner's own explanation as evidence, and a status the owner set stays theirs.
 */
export async function reportProgress(userId: string, topicId: string, input: ReportInput) {
  const current = await topicStatus(userId, topicId);
  const summary = input.summary.trim().slice(0, SUMMARY_MAX);
  if (!summary) throw new LabInputError("Write a one-line summary");
  let status: TopicStatus | null = input.status ?? null;
  if (status === "learned") {
    const explanation = input.evidence?.explanation.trim() ?? "";
    if (explanation.length < EVIDENCE_MIN_LENGTH || !input.evidence?.note.trim()) {
      throw new LabInputError(
        `Learned needs evidence: the owner's own explanation, word for word (at least ${EVIDENCE_MIN_LENGTH} characters), and your note on how they got there`,
      );
    }
  } else if (input.evidence) {
    throw new LabInputError("Evidence is only for Learned");
  }
  if (status && !claudeMayChange(current, status)) {
    throw new LabInputError(
      `The owner set this topic to ${current.status.replace("_", " ")}. Only they can change it`,
      409,
    );
  }
  if (status === current.status) status = null;
  const { id } = await recordEvent(userId, {
    topicId,
    kind: "report",
    source: "claude",
    status,
    summary,
    stuck: input.stuck?.trim().slice(0, SUMMARY_MAX) || null,
    evidence: status === "learned" ? input.evidence!.explanation.trim().slice(0, EVIDENCE_MAX) : null,
    evidenceNote: status === "learned" ? input.evidence!.note.trim().slice(0, SUMMARY_MAX) : null,
  });
  return { id, status: (await topicStatus(userId, topicId)).status };
}

/** The owner sets a status from the topic panel. Learned asks for one line on why. */
export async function setStatus(userId: string, topicId: string, status: TopicStatus, reason?: string) {
  await requireAnyTopic(userId, topicId);
  const why = reason?.trim().slice(0, SUMMARY_MAX) ?? "";
  if (status === "learned" && !why) throw new LabInputError("Add one line on why");
  await recordEvent(userId, { topicId, kind: "status_set", source: "ken-os", status, summary: why || null });
  return topicStatus(userId, topicId);
}

export interface ReportView {
  id: string;
  at: string;
  by: "claude" | "owner";
  summary: string | null;
  /** Where the owner got stuck in that session, from Claude's report. */
  stuck: string | null;
  status: TopicStatus | null;
  evidence: string | null;
  evidenceNote: string | null;
}

/** A topic's reports and status changes, newest first. */
export async function listReports(userId: string, topicId: string, limit = 50): Promise<ReportView[]> {
  const rows = await db()
    .select()
    .from(labTopicEvents)
    .where(
      and(
        eq(labTopicEvents.userId, userId),
        eq(labTopicEvents.topicId, topicId),
        inArray(labTopicEvents.kind, ["report", "status_set"]),
      ),
    )
    .orderBy(desc(labTopicEvents.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    at: row.createdAt.toISOString(),
    by: row.kind === "report" ? "claude" : "owner",
    summary: row.summary,
    stuck: row.stuck,
    status: readStatus(row.status),
    evidence: row.evidence,
    evidenceNote: row.evidenceNote,
  }));
}

export interface NoteView {
  id: string;
  author: "owner" | "claude";
  body: string;
  createdAt: string;
  updatedAt: string;
}

const noteView = (row: typeof labNotes.$inferSelect): NoteView => ({
  id: row.id,
  author: row.author,
  body: row.body,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export async function listNotes(userId: string, topicId: string): Promise<NoteView[]> {
  const rows = await db()
    .select()
    .from(labNotes)
    .where(and(eq(labNotes.userId, userId), eq(labNotes.topicId, topicId)))
    .orderBy(desc(labNotes.createdAt));
  return rows.map(noteView);
}

function noteBody(body: string) {
  const text = body.trim();
  if (!text) throw new LabInputError("Write the note");
  if (text.length > NOTE_MAX) throw new LabInputError(`Keep notes under ${NOTE_MAX} characters`);
  return text;
}

/** Adds a note. The owner and Claude both can. */
export async function addNote(userId: string, topicId: string, author: "owner" | "claude", body: string) {
  await requireAnyTopic(userId, topicId);
  const [row] = await db()
    .insert(labNotes)
    .values({ id: randomUUID(), userId, topicId, author, body: noteBody(body) })
    .returning();
  return noteView(row);
}

/** The owner edits any note, theirs or Claude's. Claude never edits. */
export async function editNote(userId: string, noteId: string, body: string) {
  const [row] = await db()
    .update(labNotes)
    .set({ body: noteBody(body), updatedAt: new Date() })
    .where(and(eq(labNotes.id, noteId), eq(labNotes.userId, userId)))
    .returning();
  if (!row) throw new LabInputError("Note not found", 404);
  return noteView(row);
}

/** The owner deletes any note. Claude never deletes. */
export async function deleteNote(userId: string, noteId: string) {
  const deleted = await db()
    .delete(labNotes)
    .where(and(eq(labNotes.id, noteId), eq(labNotes.userId, userId)))
    .returning({ id: labNotes.id });
  if (!deleted.length) throw new LabInputError("Note not found", 404);
  return { deleted: true };
}

/** Notes Claude added today, for the daily write limit. */
export async function claudeNotesToday(userId: string) {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(labNotes)
    .where(and(eq(labNotes.userId, userId), eq(labNotes.author, "claude"), gte(labNotes.createdAt, ownerDayStart())));
  return row?.n ?? 0;
}
