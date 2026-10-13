import type { CodeRun, TestOutcome, TopicProgress } from "@ken-os/domain";
import { db } from "@/lib/db";
import { LabInputError } from "./errors";
import { lockVersion, usableVersion } from "./exercise-store";
import { recordEvent } from "./store";

// A topic's code exercise runs and its solution. Spec: docs/architecture/engineering-claude-first.md, section 1 (Try it
// in code). Teaching, proofs and reviews moved to Claude; these runs are the evidence Claude reads with get_my_work.

/** Keeps a run's per-test results small enough to store: at most 50 tests, short names and errors. */
function testOutcomes(value: unknown): TestOutcome[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 50).flatMap((item): TestOutcome[] => {
    const test = (item ?? {}) as Record<string, unknown>;
    if (typeof test.name !== "string" || typeof test.passed !== "boolean") return [];
    return [
      {
        name: test.name.slice(0, 300),
        passed: test.passed,
        ...(typeof test.error === "string" && !test.passed ? { error: test.error.slice(0, 1_000) } : {}),
      },
    ];
  });
}

/**
 * Records one run of an exercise version, passed only when every test passed. The first run locks a Claude version.
 * A repo exercise shared by two topics counts for both.
 */
export async function recordExerciseRun(
  userId: string,
  topicId: string,
  input: { labId: string; code: string; passed: number; failed: number; output: string; tests?: unknown },
) {
  const version = await usableVersion(userId, topicId, input.labId);
  if (![input.passed, input.failed].every((count) => Number.isInteger(count) && count >= 0))
    throw new LabInputError("Run the tests again");
  const tests = testOutcomes(input.tests);
  const results: CodeRun = {
    passed: input.passed,
    failed: input.failed,
    output: input.output.slice(0, 20_000),
    ...(tests ? { tests } : {}),
  };
  const passed = input.failed === 0 && input.passed > 0;
  const lab = version.lab;
  let progress: TopicProgress | null = null;
  await db().transaction(async (tx) => {
    await lockVersion(tx, userId, version);
    for (const id of lab.topics) {
      const saved = await recordEvent(
        userId,
        { topicId: id, kind: "exercise_run", labId: lab.id, passed, code: input.code.slice(0, 50_000), results },
        tx,
      );
      if (id === topicId) progress = saved.progress;
    }
  });
  return { passed, progress: progress! };
}

/** Shows the solution. Allowed any time; the exercise must then pass again to stand passed. */
export async function openSolution(userId: string, topicId: string, labId: string) {
  const { lab, solution } = await usableVersion(userId, topicId, labId);
  if (!solution) throw new LabInputError("This exercise has no solution to show", 404);
  await db().transaction(async (tx) => {
    for (const id of lab.topics) await recordEvent(userId, { topicId: id, kind: "solution_opened", labId: lab.id }, tx);
  });
  return { solution };
}
