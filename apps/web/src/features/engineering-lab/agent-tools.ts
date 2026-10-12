import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  CLAUDE_LIMITS,
  CLAUDE_RUNNERS,
  isReviewDue,
  LESSON_BLOCK_KINDS,
  topicPoints,
  type CodeRun,
  type Label,
  type RubricResult,
  type Topic,
  type TopicProgress,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { labQuestions, labTopicEvents } from "@/lib/schema";
import { careers, placeOf, topicMap } from "./curriculum";
import { LabInputError } from "./errors";
import { exerciseChoice, exerciseVersions, getDraft, saveClaudeExercise } from "./exercise-store";
import { getPathView } from "./path-store";
import { getProfileRow } from "./profile-store";
import { DAILY_GENERATION_LIMIT, generationsToday, getAllProgress, getProgress, requireTopic } from "./store";
import { closedBook, getLesson, saveClaudeLesson, saveClaudeProofQuestion } from "./topic-store";

// The tools Claude uses on the owner's Engineering path. Spec: docs/architecture/engineering-claude-connector.md, section 3.
// One module for every caller: the MCP endpoint today, an in-app chat panel later. It never imports route or MCP code.
//
// The rules that keep progress honest live here, not in the caller:
// - No tool grades, submits a proof, marks a topic Proven, records a run, or changes Practice, the path, the role or the
//   profile. Ken OS's Assessor and the owner's browser do those.
// - Write tools save content only. A proof question's rubric is always the approved points it names.
// - Everything Claude sends is untrusted: each input is checked against its schema and the size caps.
// - An open assessment closes every tool except get_current_state, as it closes lessons.

const topicId = z.string().min(1).max(100).describe("A Ken OS topic id, for example js.call_stack");
const text = (max: number) => z.string().trim().min(1).max(max);
const file = z.string().max(CLAUDE_LIMITS.exerciseFile);

export const toolInputs = {
  get_current_state: z.object({}).strict(),
  get_topic: z.object({ topicId }).strict(),
  get_my_work: z.object({ topicId }).strict(),
  get_history: z.object({ topicId }).strict(),
  list_path: z.object({}).strict(),
  save_lesson: z
    .object({
      topicId,
      lesson: z
        .object({
          heading: text(200),
          body: text(CLAUDE_LIMITS.lesson),
          mentalModel: text(CLAUDE_LIMITS.lesson),
          block: z
            .object({ kind: z.enum(LESSON_BLOCK_KINDS), content: text(CLAUDE_LIMITS.lesson), note: text(2_000) })
            .strict(),
          example: text(CLAUDE_LIMITS.lesson),
          deeper: z
            .object({ title: text(200), body: text(CLAUDE_LIMITS.lesson) })
            .strict()
            .nullable()
            .optional(),
          prove: z
            .array(text(300))
            .length(3)
            .describe("Exactly 3 short lines, drawn from the topic's assessment points"),
          sources: z
            .array(z.object({ title: text(200), url: z.string().url().max(2_000) }).strict())
            .min(1)
            .max(10)
            .describe("https links on the Researcher's trusted sites. Others are dropped and reported back"),
        })
        .strict(),
    })
    .strict(),
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
  save_proof_question: z
    .object({
      topicId,
      prompt: text(CLAUDE_LIMITS.proofPrompt),
      pointIds: z
        .array(z.string().regex(/^p\d+$/))
        .min(1)
        .max(6)
        .describe("The assessment points it tests, as get_topic lists them: p1, p2, …"),
    })
    .strict(),
} as const;

export type ToolName = keyof typeof toolInputs;

export interface AgentTool<N extends ToolName = ToolName> {
  name: N;
  title: string;
  description: string;
  kind: "read" | "write";
  /** Answers during an open assessment. Only get_current_state does, so Claude can say why the others are closed. */
  openDuringAssessment?: boolean;
  run(userId: string, input: z.infer<(typeof toolInputs)[N]>): Promise<unknown>;
}

function stepOf(progress: TopicProgress) {
  if (progress.state === "PROVEN") return "proven";
  if (progress.exercisePassed) return "prove";
  if (progress.state === "PRACTICING") return "exercise";
  return "learn";
}

function topicSummary(topic: Topic, progress: TopicProgress) {
  return { topicId: topic.id, title: topic.title, ...placeOf(topic), state: progress.state, step: stepOf(progress) };
}

async function targetRole(userId: string) {
  const profile = await getProfileRow(userId);
  const role = careers.roles.find((item) => item.id === profile?.direction);
  return role ? { id: role.id, title: role.title } : null;
}

const runVersionLabel = (versions: { id: string; version: number }[], labId: string | null) =>
  versions.find((item) => item.id === labId)?.version ?? null;

/** A graded answer's misses: the rubric lines it didn't fully meet. */
const misses = (rubric: RubricResult[] | null) =>
  (rubric ?? [])
    .filter((line) => line.result !== "covered")
    .map((line) => ({ point: line.point, result: line.result }));

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
      "Where the owner is: target role, the current topic and its step, the next topics on the path, reviews due today, and Ken OS AI uses left. Call this first.",
    kind: "read",
    openDuringAssessment: true,
    async run(userId) {
      const [role, path, progress, used, assessmentOpen] = await Promise.all([
        targetRole(userId),
        getPathView(userId),
        getAllProgress(userId),
        generationsToday(userId),
        closedBook(userId),
      ]);
      const byId = new Map(progress.map((item) => [item.topicId, item]));
      const order = (path.path ?? topicMap.chapters.map((chapter) => chapter.id)).flatMap((chapter) =>
        topicMap.topics.filter((topic) => topic.chapter === chapter),
      );
      const current = path.next ? requireTopic(path.next.id) : null;
      const now = new Date();
      return {
        targetRole: role,
        assessmentOpen,
        current: current ? topicSummary(current, byId.get(current.id)!) : null,
        nextTopics: order
          .filter((topic) => topic.id !== current?.id && byId.get(topic.id)!.state !== "PROVEN")
          .slice(0, 3)
          .map((topic) => ({ topicId: topic.id, title: topic.title, state: byId.get(topic.id)!.state })),
        reviewsDue: progress
          .filter((item) => item.state === "PROVEN" && isReviewDue(item, now))
          .map((item) => ({
            topicId: item.topicId,
            title: requireTopic(item.topicId).title,
            nextReviewAt: item.nextReviewAt,
          })),
        aiUsesLeft: Math.max(0, DAILY_GENERATION_LIMIT - used),
      };
    },
  },

  get_topic: {
    name: "get_topic",
    title: "Topic",
    description:
      "One topic: its place, state, approved assessment points (p1, p2, …), the current lesson, the current exercise's task, starter and tests (never the solution), any newer or failed exercise version, and whether a proof question exists.",
    kind: "read",
    async run(userId, { topicId: id }) {
      const topic = requireTopic(id);
      const [progress, lesson, choice, proof] = await Promise.all([
        getProgress(userId, id),
        getLesson(userId, id),
        exerciseChoice(userId, topic),
        db()
          .select({ id: labQuestions.id, source: labQuestions.source })
          .from(labQuestions)
          .where(and(eq(labQuestions.userId, userId), eq(labQuestions.topicId, id), eq(labQuestions.kind, "proof")))
          .orderBy(desc(labQuestions.createdAt))
          .limit(1),
      ]);
      const { current } = choice;
      const lab = current.lab;
      return {
        ...topicSummary(topic, progress),
        gap: topic.gap,
        exercisePassed: progress.exercisePassed,
        solutionOpened: progress.solutionOpened,
        points: topicPoints(topic),
        lesson: lesson
          ? {
              source: lesson.authored ? "hand-written" : lesson.source,
              heading: lesson.heading,
              body: lesson.body,
              mentalModel: lesson.mentalModel,
              block: lesson.block,
              example: lesson.example,
              deeper: lesson.deeper,
              prove: lesson.prove,
              sources: lesson.sources,
            }
          : null,
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
        proofQuestion: proof[0] ? { exists: true, source: proof[0].source } : { exists: false },
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
      "A topic's past: exercise runs (counts only) per version, proof attempts with grade and feedback, practice reviews, and the points the latest graded answer missed.",
    kind: "read",
    async run(userId, { topicId: id }) {
      const topic = requireTopic(id);
      const [versions, rows] = await Promise.all([
        exerciseVersions(userId, topic),
        db()
          .select()
          .from(labTopicEvents)
          .where(
            and(
              eq(labTopicEvents.userId, userId),
              eq(labTopicEvents.topicId, id),
              inArray(labTopicEvents.kind, ["exercise_run", "proof", "review", "solution_opened"]),
            ),
          )
          .orderBy(desc(labTopicEvents.createdAt))
          .limit(200),
      ]);
      const runs = new Map<string, { labId: string; version: number | null; runs: number; passed: number }>();
      for (const row of rows.filter((item) => item.kind === "exercise_run" && item.labId)) {
        const entry = runs.get(row.labId!) ?? {
          labId: row.labId!,
          version: runVersionLabel(versions, row.labId),
          runs: 0,
          passed: 0,
        };
        entry.runs += 1;
        if (row.passed) entry.passed += 1;
        runs.set(row.labId!, entry);
      }
      const graded = (kind: "proof" | "review") =>
        rows
          .filter((row) => row.kind === kind && row.label)
          .slice(0, 10)
          .map((row) => ({
            at: row.createdAt.toISOString(),
            label: row.label as Label,
            passed: row.passed,
            feedback: row.feedback,
            missed: misses(row.rubric),
          }));
      const latest = rows.find((row) => (row.kind === "proof" || row.kind === "review") && row.label);
      return {
        exerciseRuns: [...runs.values()],
        solutionOpenedTimes: rows.filter((row) => row.kind === "solution_opened").length,
        proofs: graded("proof"),
        reviews: graded("review"),
        openGaps: latest ? misses(latest.rubric) : [],
      };
    },
  },

  list_path: {
    name: "list_path",
    title: "Path",
    description:
      "The owner's path: chapters in path order (weakest area first) with their area and topics' states. Without a target role, every chapter in course order.",
    kind: "read",
    openDuringAssessment: true,
    async run(userId) {
      const [role, path] = await Promise.all([targetRole(userId), getPathView(userId)]);
      const chapters = (path.path ?? topicMap.chapters.map((chapter) => chapter.id)).map((chapterId) => {
        const chapter = topicMap.chapters.find((item) => item.id === chapterId)!;
        return {
          chapterId,
          title: chapter.title,
          area: topicMap.areas.find((item) => item.id === chapter.area)!.title,
          topics: topicMap.topics
            .filter((topic) => topic.chapter === chapterId)
            .map((topic) => ({ topicId: topic.id, title: topic.title, state: path.states[topic.id] })),
        };
      });
      return { targetRole: role, chapters };
    },
  },

  save_lesson: {
    name: "save_lesson",
    title: "Save lesson",
    description:
      "Saves a new lesson version for a topic: heading, body, mental model, one code, formula or rule block with a note, a product example, optional Go deeper, exactly 3 things to prove, and sources on trusted sites. Hand-written lessons can't be replaced.",
    kind: "write",
    async run(userId, { topicId: id, lesson }) {
      const saved = await saveClaudeLesson(userId, id, { ...lesson, deeper: lesson.deeper ?? null });
      return { saved: true, version: saved.version, droppedSources: saved.droppedSources };
    },
  },

  save_exercise: {
    name: "save_exercise",
    title: "Save exercise",
    description:
      "Saves a new exercise version. It starts unchecked: the owner's browser runs the solution (must pass every test) and the starter (must fail one) the next time the topic's Exercise opens. Versions the owner already ran never change.",
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
        next: "Open the topic's Exercise in Ken OS to check it",
      };
    },
  },

  save_proof_question: {
    name: "save_proof_question",
    title: "Save proof question",
    description:
      "Saves a proof question for a topic. It must name which approved assessment points it tests (p1, p2, … from get_topic); Ken OS grades the answer against those points. Claude never grades it.",
    kind: "write",
    async run(userId, { topicId: id, prompt, pointIds }) {
      const saved = await saveClaudeProofQuestion(userId, id, { prompt, pointIds });
      return { saved: true, tests: saved.rubric };
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
  return tool.run(userId, parsed.data as never);
}
