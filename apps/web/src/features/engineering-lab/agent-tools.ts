import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  CLAUDE_LIMITS,
  CLAUDE_RUNNERS,
  CLAUDE_STATUSES,
  CONTENT_EVENT_KINDS,
  EVIDENCE_MIN_LENGTH,
  topicPoints,
  type CodeRun,
  type Topic,
  type TopicStatusView,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { ownerDayStart } from "@/lib/day";
import { labTopicEvents } from "@/lib/schema";
import { placeOf } from "./curriculum";
import { LabInputError } from "./errors";
import { exerciseChoice, exerciseVersions, getDraft, saveClaudeExercise } from "./exercise-store";
import { alsoInProgress, getRoadmap, toRefresh } from "./roadmap-store";
import {
  addNote,
  claudeNotesToday,
  EVIDENCE_MAX,
  listNotes,
  listReports,
  NOTE_MAX,
  reportProgress,
  SUMMARY_MAX,
  topicStatus,
} from "./status-store";
import { requireTopic } from "./store";
import { closedBook } from "./topic-store";

// The tools Claude uses on the owner's Engineering roadmap. Spec: docs/architecture/engineering-claude-first.md,
// section 5. One module for every caller: the MCP endpoint today, an in-app chat panel later. It never imports route or
// MCP code.
//
// The rules that keep progress honest live here and in status-store.ts, not in the caller:
// - Claude can mark a topic Learned only with the owner's own explanation, word for word, as evidence.
// - Claude never changes a status the owner set, and never edits or deletes the owner's notes.
// - No tool records a test run, opens a solution, or changes the role or the profile.
// - Everything Claude sends is untrusted: each input is checked against its schema and the size caps.
// - An open assessment closes every tool except get_current_state and get_roadmap, until the assessment is retired.
// - Claude may save at most CLAUDE_WRITE_LIMIT times a day.

const topicId = z.string().min(1).max(100).describe("A Ken OS topic id, for example js.call_stack");
const text = (max: number) => z.string().trim().min(1).max(max);
const file = z.string().max(CLAUDE_LIMITS.exerciseFile);

export const toolInputs = {
  get_current_state: z.object({}).strict(),
  get_roadmap: z.object({}).strict(),
  get_topic: z.object({ topicId }).strict(),
  get_my_work: z.object({ topicId }).strict(),
  get_history: z.object({ topicId }).strict(),
  save_exercise: z
    .object({
      topicId,
      exercise: z
        .object({
          runner: z
            .enum(CLAUDE_RUNNERS)
            .describe("browser: JavaScript in a Web Worker. pglite: the same, with a fresh in-page Postgres"),
          task: text(4_000).describe("The first paragraph is the task line; later paragraphs show under Details"),
          starter: file.describe("What the owner starts from. Must fail at least one test"),
          tests: file
            .min(1)
            .describe("Tests using test(name, fn) and assert.equal / assert.deepEqual, like the repo labs"),
          solution: file
            .min(1)
            .describe("Must pass every test. Never shown to the owner unless they open it in Ken OS"),
          hint: text(500).nullable().optional(),
          setup: file.optional().describe("pglite only: SQL run on the fresh database before the code"),
        })
        .strict(),
    })
    .strict(),
  report_progress: z
    .object({
      topicId,
      summary: text(SUMMARY_MAX).describe("One line on what happened, such as 'Explained cleanup; exercise next'"),
      status: z
        .enum(CLAUDE_STATUSES)
        .optional()
        .describe("Only to change the status. The first report on a topic sets in_progress by itself"),
      evidence: z
        .object({
          explanation: text(EVIDENCE_MAX).describe(
            `The owner's own explanation, copied word for word, given without hints. At least ${EVIDENCE_MIN_LENGTH} characters`,
          ),
          note: text(SUMMARY_MAX).describe("How they got there: unaided, or after which hints"),
        })
        .strict()
        .optional()
        .describe("Required for learned, refused otherwise"),
    })
    .strict(),
  save_note: z
    .object({
      topicId,
      body: text(NOTE_MAX).describe("A short note for the owner, such as a sharper way to say the idea"),
    })
    .strict(),
} as const;

export type ToolName = keyof typeof toolInputs;

export interface AgentTool<N extends ToolName = ToolName> {
  name: N;
  title: string;
  description: string;
  kind: "read" | "write";
  /** Answers during an open assessment, so Claude can say why the others are closed. */
  openDuringAssessment?: boolean;
  run(userId: string, input: z.infer<(typeof toolInputs)[N]>): Promise<unknown>;
}

function topicSummary(topic: Topic, status: TopicStatusView) {
  return { topicId: topic.id, title: topic.title, ...placeOf(topic), status: status.status, statusSetBy: status.setBy };
}

function runSummary(results: CodeRun | null) {
  if (!results) return null;
  const failing = results.tests
    ?.filter((test) => !test.passed)
    .map((test) => ({ name: test.name, error: test.error ?? null }));
  return {
    passed: results.passed,
    failed: results.failed,
    // Older runs kept only the printed output.
    failing: failing ?? null,
    output: failing ? null : results.output.slice(0, 4_000),
  };
}

const tools: { [N in ToolName]: AgentTool<N> } = {
  get_current_state: {
    name: "get_current_state",
    title: "Current state",
    description:
      "Where the owner is: their goal, the topic in progress, counts of learned and skipped topics, the next topics, and learned topics old enough to refresh. Call this first.",
    kind: "read",
    openDuringAssessment: true,
    async run(userId) {
      const [roadmap, assessmentOpen] = await Promise.all([getRoadmap(userId), closedBook(userId)]);
      const { current } = roadmap;
      return {
        goal: roadmap.goal,
        assessmentOpen,
        current: current
          ? {
              topicId: current.id,
              title: current.title,
              area: current.area,
              chapter: current.chapter,
              status: current.status,
            }
          : null,
        counts: roadmap.counts,
        alsoInProgress: alsoInProgress(roadmap)
          .slice(0, 3)
          .map((topic) => ({ topicId: topic.id, title: topic.title })),
        nextTopics: roadmap.chapters
          .flatMap((chapter) => chapter.topics)
          .filter((topic) => topic.status === "not_started" && topic.id !== current?.id)
          .slice(0, 3)
          .map((topic) => ({ topicId: topic.id, title: topic.title })),
        toRefresh: toRefresh(roadmap)
          .slice(0, 5)
          .map((topic) => ({ topicId: topic.id, title: topic.title, learnedAt: topic.learnedAt })),
      };
    },
  },

  get_roadmap: {
    name: "get_roadmap",
    title: "Roadmap",
    description:
      "The owner's roadmap: chapters in order with their area and each topic's status (not_started, in_progress, learned, skipped).",
    kind: "read",
    openDuringAssessment: true,
    async run(userId) {
      const roadmap = await getRoadmap(userId);
      return {
        goal: roadmap.goal,
        chapters: roadmap.chapters.map((chapter) => ({
          chapterId: chapter.id,
          title: chapter.title,
          area: chapter.area,
          topics: chapter.topics.map((topic) => ({ topicId: topic.id, title: topic.title, status: topic.status })),
        })),
      };
    },
  },

  get_topic: {
    name: "get_topic",
    title: "Topic",
    description:
      "One topic: its place and status, what the owner should be able to explain (p1, p2, …), the latest reports, the owner's and your notes, and the current exercise's task, starter and tests (never the solution).",
    kind: "read",
    async run(userId, { topicId: id }) {
      const topic = requireTopic(id);
      const [status, choice, reports, notes] = await Promise.all([
        topicStatus(userId, id),
        exerciseChoice(userId, topic),
        listReports(userId, id, 5),
        listNotes(userId, id),
      ]);
      const { current } = choice;
      const lab = current.lab;
      return {
        ...topicSummary(topic, status),
        gap: topic.gap,
        points: topicPoints(topic),
        reports,
        notes,
        exercise: {
          labId: current.id,
          version: current.version,
          source: current.source,
          runner: lab.runner,
          locked: current.source === "repo" || Boolean(current.lockedAt),
          task: lab.readme,
          starter: lab.starter,
          tests: lab.tests,
          setup: lab.setup || null,
          hint: lab.hint,
          // A probe exercise has no code: the owner predicts, then the page checks with real requests. Answers stay hidden.
          probe: lab.probe
            ? lab.probe.questions.map((question) => ({ prompt: question.prompt, options: question.options }))
            : null,
        },
        newerExercise: choice.newer ? { labId: choice.newer.id, version: choice.newer.version } : null,
        uncheckedExercise: choice.unchecked ? { labId: choice.unchecked.id, version: choice.unchecked.version } : null,
        invalidExercise: choice.invalid
          ? { labId: choice.invalid.id, version: choice.invalid.version, problem: choice.invalid.checkProblem }
          : null,
      };
    },
  },

  get_my_work: {
    name: "get_my_work",
    title: "My work",
    description:
      "The owner's latest autosaved code for the current exercise version, and its last test run: passed, failed, and each failing test's error (usually expected and actual).",
    kind: "read",
    async run(userId, { topicId: id }) {
      const topic = requireTopic(id);
      const { current } = await exerciseChoice(userId, topic);
      const [draft, [run]] = await Promise.all([
        getDraft(userId, current.id),
        db()
          .select({
            results: labTopicEvents.results,
            passed: labTopicEvents.passed,
            code: labTopicEvents.code,
            createdAt: labTopicEvents.createdAt,
          })
          .from(labTopicEvents)
          .where(
            and(
              eq(labTopicEvents.userId, userId),
              eq(labTopicEvents.topicId, id),
              eq(labTopicEvents.kind, "exercise_run"),
              eq(labTopicEvents.labId, current.id),
            ),
          )
          .orderBy(desc(labTopicEvents.createdAt))
          .limit(1),
      ]);
      return {
        labId: current.id,
        version: current.version,
        code: draft?.code ?? run?.code ?? null,
        codeSavedAt: draft?.updatedAt ?? run?.createdAt.toISOString() ?? null,
        lastRun: run ? { at: run.createdAt.toISOString(), allPassed: run.passed, ...runSummary(run.results) } : null,
      };
    },
  },

  get_history: {
    name: "get_history",
    title: "History",
    description:
      "A topic's past: every report and status change with its evidence, every note, and exercise runs per version (counts only).",
    kind: "read",
    async run(userId, { topicId: id }) {
      const topic = requireTopic(id);
      const [versions, reports, notes, runs] = await Promise.all([
        exerciseVersions(userId, topic),
        listReports(userId, id),
        listNotes(userId, id),
        db()
          .select({ labId: labTopicEvents.labId, passed: labTopicEvents.passed })
          .from(labTopicEvents)
          .where(
            and(
              eq(labTopicEvents.userId, userId),
              eq(labTopicEvents.topicId, id),
              eq(labTopicEvents.kind, "exercise_run"),
            ),
          ),
      ]);
      const counts = new Map<string, { labId: string; version: number | null; runs: number; passed: number }>();
      for (const run of runs.filter((item) => item.labId)) {
        const entry = counts.get(run.labId!) ?? {
          labId: run.labId!,
          version: versions.find((item) => item.id === run.labId)?.version ?? null,
          runs: 0,
          passed: 0,
        };
        entry.runs += 1;
        if (run.passed) entry.passed += 1;
        counts.set(run.labId!, entry);
      }
      return { reports, notes, exerciseRuns: [...counts.values()] };
    },
  },

  save_exercise: {
    name: "save_exercise",
    title: "Save exercise",
    description:
      "Saves a new exercise version. It starts unchecked: the owner's browser runs the solution (must pass every test) and the starter (must fail one) the next time the topic's exercise opens. Versions the owner already ran never change.",
    kind: "write",
    async run(userId, { topicId: id, exercise }) {
      requireTopic(id);
      if (exercise.runner === "browser" && exercise.setup?.trim())
        throw new LabInputError("Setup SQL is for the pglite runner only");
      const saved = await saveClaudeExercise(userId, id, {
        ...exercise,
        hint: exercise.hint ?? null,
        setup: exercise.setup ?? "",
      });
      return {
        saved: true,
        labId: saved.id,
        version: saved.version,
        checked: saved.checked,
        next: "Open the topic's exercise in Ken OS to check it",
      };
    },
  },

  report_progress: {
    name: "report_progress",
    title: "Report progress",
    description:
      "Records what happened on a topic, shown to the owner in Ken OS. The first report starts the topic. Set status learned only after the owner explains the idea in their own words without hints, and pass that explanation word for word as evidence. Set skipped when the owner says they already know it. You can't change a status the owner set.",
    kind: "write",
    async run(userId, { topicId: id, summary, status, evidence }) {
      requireTopic(id);
      return { saved: true, ...(await reportProgress(userId, id, { summary, status, evidence })) };
    },
  },

  save_note: {
    name: "save_note",
    title: "Save note",
    description:
      "Adds a note to a topic for the owner, such as a sharper way to explain the idea or a term to use. You can add notes but never change or delete them.",
    kind: "write",
    async run(userId, { topicId: id, body }) {
      const note = await addNote(userId, id, "claude", body);
      return { saved: true, noteId: note.id };
    },
  },
};

export const agentTools: AgentTool[] = Object.values(tools) as AgentTool[];

function describeIssues(error: z.ZodError) {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
    .join("; ");
}

/**
 * Runs one tool for the owner. The caller has already checked who the owner is; this checks the input, the open
 * assessment and the topic. Problems come back as LabInputError with a message Claude can act on.
 */
export async function callAgentTool(userId: string, name: string, input: unknown) {
  const tool = (tools as Record<string, AgentTool>)[name];
  if (!tool) throw new LabInputError(`Unknown tool: ${name}`, 404);
  const parsed = toolInputs[tool.name].safeParse(input ?? {});
  if (!parsed.success) throw new LabInputError(`Invalid input. ${describeIssues(parsed.error)}`);
  if (!tool.openDuringAssessment && (await closedBook(userId)))
    throw new LabInputError("An assessment is open in Ken OS. Topics are closed until the owner finishes it", 409);
  if (tool.kind === "write" && (await claudeWritesToday(userId)) >= CLAUDE_WRITE_LIMIT) {
    throw new LabInputError(`Out of writes for today (${CLAUDE_WRITE_LIMIT}). Resets at midnight Manila time`, 429);
  }
  return tool.run(userId, parsed.data as never);
}

/** Saves Claude may make per day, across every write tool. Claude's writes cost Ken OS nothing; this stops a runaway loop. */
export const CLAUDE_WRITE_LIMIT = 40;

/** Claude's saved content and reports are events with source "claude"; its notes are rows in lab_notes. */
export async function claudeWritesToday(userId: string) {
  const [[events], notes] = await Promise.all([
    db()
      .select({ n: sql<number>`count(*)::int` })
      .from(labTopicEvents)
      .where(
        and(
          eq(labTopicEvents.userId, userId),
          eq(labTopicEvents.source, "claude"),
          inArray(labTopicEvents.kind, [...CONTENT_EVENT_KINDS, "report"]),
          gte(labTopicEvents.createdAt, ownerDayStart()),
        ),
      ),
    claudeNotesToday(userId),
  ]);
  return (events?.n ?? 0) + notes;
}
