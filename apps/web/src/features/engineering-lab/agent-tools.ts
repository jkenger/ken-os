import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  CLAUDE_LIMITS,
  CLAUDE_RUNNERS,
  CLAUDE_STATUSES,
  CONTENT_EVENT_KINDS,
  EVIDENCE_MIN_LENGTH,
  hasWorkedExample,
  WORKED_EXAMPLE_FORMAT,
  type CodeRun,
  type TopicStatusView,
} from "@ken-os/domain";
import { db } from "@/lib/db/db";
import { ownerDayStart } from "@/lib/day";
import { labTopicEvents } from "@/lib/db/schema";
import { requireAnyTopic, type AnyTopic } from "./any-topic";
import { buildInput } from "./build-evidence";
import { recordInstructionsVersion } from "./claude-links";
import { LabInputError } from "./errors";
import {
  exerciseChoice,
  exerciseVersions,
  getDraft,
  pendingVersion,
  practiceState,
  saveClaudeExercise,
} from "./exercise-store";
import { alsoInProgress, chapterOnRoadmap, getRoadmap, getRoadmaps, saveRoadmap, toRefresh } from "./roadmap-store";
import { progressOnRoadmaps } from "./roadmaps";
import { PLAN_LIMITS } from "./roadmap-plan";
import { reviewSheetInput } from "./review-sheet";
import { getReviewSheet, reviewsToday, saveReview } from "./review-store";
import { topicMaterialInput, topicPlanInput } from "./topic-material";
import { getMaterial, materialWritesToday, saveTopicMaterial, saveTopicPlans } from "./topic-material-store";
import {
  addNote,
  claudeNotesToday,
  EVIDENCE_MAX,
  latestBuild,
  listNotes,
  listReports,
  NOTE_MAX,
  reportProgress,
  SUMMARY_MAX,
  topicStatus,
} from "./status-store";

// The tools Claude uses on the owner's Engineering roadmap. Spec: docs/architecture/engineering-claude-first.md,
// section 5. One module for every caller: the MCP endpoint today, an in-app chat panel later. It never imports route or
// MCP code.
//
// The rules that keep progress honest live here and in status-store.ts, not in the caller:
// - Claude can mark a topic Learned only with the owner's own explanation, word for word, as evidence.
// - Claude never changes a status the owner set, and never edits or deletes the owner's notes.
// - No tool records a test run, opens a solution, or changes the role or the profile.
// - Everything Claude sends is untrusted: each input is checked against its schema and the size caps.
// - Claude may save at most CLAUDE_WRITE_LIMIT times a day.

const topicId = z.string().min(1).max(100).describe("A Loots topic id, for example js.call_stack");
const text = (max: number) => z.string().trim().min(1).max(max);
const file = z.string().max(CLAUDE_LIMITS.exerciseFile);

export const toolInputs = {
  get_current_state: z
    .object({
      instructionsVersion: z
        .string()
        .max(20)
        .optional()
        .describe("The version line from the Project instructions, as YYYY-MM-DD, so Loots knows they are current"),
    })
    .strict(),
  get_roadmap: z
    .object({
      roadmapId: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe("A roadmap id from get_current_state. Without it, the roadmap the owner opened last"),
    })
    .strict(),
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
          task: text(4_000)
            .refine(hasWorkedExample, `Add an example: ${WORKED_EXAMPLE_FORMAT}`)
            .describe(
              `The first paragraph is the task line; later paragraphs show under Details and must include ${WORKED_EXAMPLE_FORMAT}, using real arguments from the tests`,
            ),
          starter: file.describe("What the owner starts from. Must fail at least one test"),
          tests: file
            .min(1)
            .describe("Tests using test(name, fn) and assert.equal / assert.deepEqual, like the repo labs"),
          solution: file.min(1).describe("Must pass every test. Never shown to the owner unless they open it in Loots"),
          hint: text(500).nullable().optional(),
          setup: file.optional().describe("pglite only: SQL run on the fresh database before the code"),
        })
        .strict(),
    })
    .strict(),
  report_progress: z
    .object({
      topicId,
      summary: text(SUMMARY_MAX).describe("One line on what was covered, such as 'Explained cleanup; exercise next'"),
      stuck: text(SUMMARY_MAX)
        .optional()
        .describe("Where the owner got stuck this session, in one line, such as 'Thought cleanup runs on mount'"),
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
      build: buildInput
        .optional()
        .describe(
          "Ticks the topic's Build task for a build reviewed outside a passing Loots exercise run, such as a fix in the owner's own app. Only once the owner's code works",
        ),
    })
    .strict(),
  save_roadmap: z
    .object({
      roadmapId: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe("Only to re-plan an existing roadmap in place. Without it, the roadmap is added next to the others"),
      goal: text(PLAN_LIMITS.goal).describe("What the owner wants to become or be able to do, in their words"),
      chapters: z
        .array(
          z
            .object({
              chapterId: z.string().max(100).optional().describe("A chapter id from get_roadmap or the topic map"),
              title: text(PLAN_LIMITS.title).optional().describe("Only for a new chapter that isn't in the topic map"),
              topics: z
                .array(
                  z.union([
                    z.string().min(1).max(100).describe("A topic id from get_roadmap"),
                    z
                      .object({
                        title: text(PLAN_LIMITS.title),
                        explain: z
                          .array(text(PLAN_LIMITS.line))
                          .min(3)
                          .max(5)
                          .describe("3 to 5 things the owner should be able to explain"),
                      })
                      .strict()
                      .describe("A new topic, only when the topic map has nothing close"),
                  ]),
                )
                .min(1)
                .max(PLAN_LIMITS.topicsPerChapter),
            })
            .strict(),
        )
        .min(1)
        .max(PLAN_LIMITS.chapters),
    })
    .strict(),
  save_topic_plan: z
    .object({
      roadmapId: z.string().min(1).max(100).describe("The roadmap these topics are on, from get_current_state"),
      topics: z.array(topicPlanInput).min(1).max(100),
    })
    .strict(),
  save_topic_material: topicMaterialInput,
  save_note: z
    .object({
      topicId,
      body: text(NOTE_MAX).describe("A short note for the owner, such as a sharper way to say the idea"),
    })
    .strict(),
  save_review: z
    .object({
      topicId,
      sheet: reviewSheetInput.describe(
        "The whole sheet: every point of the topic (p1, p2, …) once, and the key terms. It replaces the last version",
      ),
    })
    .strict(),
} as const;

export type ToolName = keyof typeof toolInputs;

export interface AgentTool<N extends ToolName = ToolName> {
  name: N;
  title: string;
  description: string;
  kind: "read" | "write";
  run(userId: string, input: z.infer<(typeof toolInputs)[N]>): Promise<unknown>;
}

function topicSummary(topic: AnyTopic, status: TopicStatusView) {
  return {
    topicId: topic.id,
    title: topic.title,
    area: topic.area,
    chapter: topic.chapter,
    addedByClaude: topic.custom,
    status: status.status,
    statusSetBy: status.setBy,
  };
}

/** The topic, with the chapter it sits in on the roadmap when Claude added it. */
async function roadmapTopic(userId: string, topicId: string) {
  return requireAnyTopic(userId, topicId, await chapterOnRoadmap(userId, topicId));
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
      "Where the owner is: their active roadmaps (up to 3) with each one's goal, counts and current topic, most recently opened first; and for the roadmap opened last, the topic in progress, the next topics, and learned topics old enough to refresh. Call this first, with the instructions version.",
    kind: "read",
    async run(userId, { instructionsVersion }) {
      const [roadmaps] = await Promise.all([
        getRoadmaps(userId),
        recordInstructionsVersion(userId, instructionsVersion),
      ]);
      const roadmap = roadmaps[0];
      const { current } = roadmap;
      return {
        // Engineering-roadmaps.md, section 2. The fields after this describe roadmaps[0], the one opened last.
        roadmaps: roadmaps
          .filter((view) => view.planned)
          .map((view) => ({
            roadmapId: view.id,
            goal: view.goal?.title ?? null,
            counts: view.counts,
            current: view.current ? { topicId: view.current.id, title: view.current.title } : null,
          })),
        roadmapId: roadmap.id,
        goal: roadmap.goal,
        // False means the roadmap is the target role's default path: offer to plan one with save_roadmap.
        planned: roadmap.planned,
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
      "One of the owner's roadmaps (the one opened last, unless you pass roadmapId): chapters in order with their area and each topic's status (not_started, in_progress, learned, skipped), and your plan for each topic (prerequisites, related, minutes, difficulty) or null.",
    kind: "read",
    async run(userId, { roadmapId: id }) {
      const roadmap = await getRoadmap(userId, id);
      return {
        roadmapId: roadmap.id,
        active: roadmap.active,
        goal: roadmap.goal,
        planned: roadmap.planned,
        chapters: roadmap.chapters.map((chapter) => ({
          chapterId: chapter.id,
          title: chapter.title,
          area: chapter.area,
          topics: chapter.topics.map((topic) => ({
            topicId: topic.id,
            title: topic.title,
            status: topic.status,
            addedByClaude: topic.custom,
            // Your plan for the topic on this roadmap, from save_topic_plan; null until you save one.
            plan: roadmap.plans[topic.id] ?? null,
          })),
        })),
      };
    },
  },

  get_topic: {
    name: "get_topic",
    title: "Topic",
    description:
      "One topic: its place and status, whether its Build task is done (and the owner's final code when you reported it), what the owner should be able to explain (p1, p2, …), your material for it (description, task wording, resources, mastery criteria) or null, the latest reports, the owner's and your notes, the latest review sheet, and the current exercise's task, starter and tests (never the solution).",
    kind: "read",
    async run(userId, { topicId: id }) {
      const topic = await roadmapTopic(userId, id);
      const [status, choice, reports, notes, review, material, practice, build] = await Promise.all([
        topicStatus(userId, id),
        exerciseChoice(userId, topic),
        listReports(userId, id, 5),
        listNotes(userId, id),
        getReviewSheet(userId, id),
        getMaterial(userId, id),
        practiceState(userId, topic),
        latestBuild(userId, id),
      ]);
      const summary = {
        ...topicSummary(topic, status),
        // Build is done once an exercise run passed or you reported the build; evidence is the latest one you reported.
        build: {
          done: practice === "passed" || Boolean(build),
          exercisePassed: practice === "passed",
          reported: build,
        },
        gap: topic.gap,
        points: topic.points.map((text, index) => ({ id: `p${index + 1}`, text })),
        // Null means "Not planned yet": write it with save_topic_material when the topic starts.
        material,
        reports,
        notes,
        // The latest review sheet, to update with save_review after the fresh check.
        review,
      };
      if (!choice) {
        const pending = await pendingVersion(userId, topic);
        if (pending)
          return {
            ...summary,
            exercise: null,
            uncheckedExercise: { labId: pending.id, version: pending.version },
            next: "Your exercise is saved and waits for the owner's browser check. Ask them to open the topic and click Try it in code",
          };
        return {
          ...summary,
          exercise: null,
          next: "No exercise yet. Write one with save_exercise if the owner wants to practise in code",
        };
      }
      const { current } = choice;
      const lab = current.lab;
      return {
        ...summary,
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
      const choice = await exerciseChoice(userId, await requireAnyTopic(userId, id));
      if (!choice) return { labId: null, code: null, lastRun: null, next: "No exercise yet" };
      const { current } = choice;
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
      const topic = await requireAnyTopic(userId, id);
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
      await requireAnyTopic(userId, id);
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
        next: "Ask the owner to open the topic in Loots and click Try it in code. Their browser checks it there before it shows",
      };
    },
  },

  report_progress: {
    name: "report_progress",
    title: "Report progress",
    description:
      "Records what happened on a topic, shown to the owner in Loots. The first report starts the topic. Set status learned only after the owner explains the idea in their own words without hints, and pass that explanation word for word as evidence. Set skipped when the owner says they already know it. When the owner finishes a build outside a passing Loots exercise run, such as in their own app, pass build with their final code word for word to tick the Build task. You can't change a status the owner set.",
    kind: "write",
    async run(userId, { topicId: id, summary, stuck, status, evidence, build }) {
      const saved = await reportProgress(userId, id, { summary, stuck, status, evidence, build });
      if (status !== "learned" && status !== "skipped") return { saved: true, ...saved };
      // So Claude can mark a finished chapter and offer what's next, on every roadmap with the topic
      // (engineering-progressive-flow.md, section 3, and engineering-roadmaps.md, section 2).
      return { saved: true, ...saved, roadmaps: progressOnRoadmaps(await getRoadmaps(userId), id) };
    },
  },

  save_roadmap: {
    name: "save_roadmap",
    title: "Save roadmap",
    description:
      "Saves a roadmap the owner agreed to: their goal and chapters in order, each with topics. Use chapter and topic ids from get_roadmap where they fit; add a new topic only when nothing in the topic map is close, with 3 to 5 lines the owner should be able to explain. It's added next to the owner's other roadmaps, up to 3 active; pass roadmapId only when the owner asks to re-plan that roadmap, which replaces it in place and archives the old version. Every topic keeps its progress. Ask before saving.",
    kind: "write",
    async run(userId, { roadmapId: id, ...plan }) {
      return { saved: true, ...(await saveRoadmap(userId, plan, id)) };
    },
  },

  save_topic_plan: {
    name: "save_topic_plan",
    title: "Save topic plan",
    description:
      "Saves your plan for topics on one roadmap: prerequisites (topics on the same roadmap to learn first; only real dependencies, no loops), up to 3 related topics on the same roadmap, an estimate in minutes and a difficulty, both for this owner. Call it right after save_roadmap for every topic. To correct one later, send just that topic and the fields to change; the rest keep their value.",
    kind: "write",
    async run(userId, { roadmapId: id, topics }) {
      return { saved: true, ...(await saveTopicPlans(userId, id, topics)) };
    },
  },

  save_topic_material: {
    name: "save_topic_material",
    title: "Save topic material",
    description:
      "Saves the topic's material, shown in Loots: a one-line description, the wording of its three tasks (read with you, build something small, explain it in their own words), learning resources (real pages, official docs first; links that don't load are refused) and 3 to 6 mastery criteria. Write it when the topic starts, if get_topic shows material null. Saving again replaces it whole, which is how you correct it.",
    kind: "write",
    async run(userId, input) {
      return { saved: true, ...(await saveTopicMaterial(userId, input)) };
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

  save_review: {
    name: "save_review",
    title: "Save review sheet",
    description:
      "Writes the topic's review sheet, what the owner reads instead of scrolling back through chat: for each point (p1, p2, …) a question to test themselves, a 2 to 3 line explanation in plain language, one small code example, and the mistake to avoid (the one they made, when they made one, with ownMistake true); then the key terms with one-line meanings. Write it once every point is taught, and update it after the fresh check. Each save is a new version that replaces the sheet; old versions are kept.",
    kind: "write",
    async run(userId, { topicId: id, sheet }) {
      const saved = await saveReview(userId, id, sheet);
      return { saved: true, version: saved.version };
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
 * topic. Problems come back as LabInputError with a message Claude can act on.
 */
export async function callAgentTool(userId: string, name: string, input: unknown) {
  const tool = (tools as Record<string, AgentTool>)[name];
  if (!tool) throw new LabInputError(`Unknown tool: ${name}`, 404);
  const parsed = toolInputs[tool.name].safeParse(input ?? {});
  if (!parsed.success) throw new LabInputError(`Invalid input. ${describeIssues(parsed.error)}`);
  if (tool.kind === "write" && (await claudeWritesToday(userId)) >= CLAUDE_WRITE_LIMIT) {
    throw new LabInputError(`Out of writes for today (${CLAUDE_WRITE_LIMIT}). Resets at midnight Manila time`, 429);
  }
  return tool.run(userId, parsed.data as never);
}

/** Saves Claude may make per day, across every write tool. Claude's writes cost Loots nothing; this stops a runaway loop. */
export const CLAUDE_WRITE_LIMIT = 40;

/**
 * Claude's saved content and reports are events with source "claude"; its notes are rows in lab_notes, its review
 * sheets rows in lab_reviews, and its topic material and plans rows in lab_topic_material and lab_topic_plans (only
 * Claude writes those).
 */
export async function claudeWritesToday(userId: string) {
  const [[events], notes, reviews, material] = await Promise.all([
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
    reviewsToday(userId),
    materialWritesToday(userId),
  ]);
  return (events?.n ?? 0) + notes + reviews + material;
}
