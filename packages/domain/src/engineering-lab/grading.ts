import type { CodeRun, Grade } from "./types";

export function normalizeLines(lines: string[]) {
  return lines.map((line) => line.trim().replace(/\s+/g, " ")).filter(Boolean);
}

/** Splits a typed prediction into lines. Accepts one value per line or values separated by commas or spaces on one line. */
export function parsePredictedLines(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\n")) return normalizeLines(trimmed.split(/\r?\n/));
  if (trimmed.includes(",")) return normalizeLines(trimmed.split(","));
  return normalizeLines(trimmed.split(/\s+/));
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((line, index) => line === b[index]);

/**
 * Grades a prediction against what the code actually printed. If the Assessor's expected output disagrees with
 * the real run, the question was wrong and the attempt is voided rather than graded.
 */
export function gradePrediction(predicted: string[], actual: string[], expected: string[] | null): Grade {
  const want = normalizeLines(actual);
  const got = normalizeLines(predicted);
  if (expected && !same(normalizeLines(expected), want)) {
    return {
      by: "code",
      label: "gap",
      misconceptions: [],
      feedback: `This question was thrown out: its expected answer (${normalizeLines(expected).join(", ")}) didn't match what the code actually printed (${want.join(", ")}). It doesn't count either way.`,
      voided: true,
    };
  }
  if (same(got, want))
    return {
      by: "code",
      label: "solid",
      misconceptions: [],
      feedback: `Exactly right, every line in order: ${want.join(", ")}.`,
    };
  const sameItems = got.length === want.length && [...got].sort().join("\n") === [...want].sort().join("\n");
  return {
    by: "code",
    label: sameItems ? "misconception" : "partial",
    misconceptions: sameItems ? ["Execution order: right lines, wrong order"] : [],
    feedback: `The code printed ${want.join(", ")}. You predicted ${got.join(", ") || "nothing"}.${sameItems ? " You had the right lines in the wrong order, which points at the ordering rules rather than the values." : ""}`,
  };
}

/** A lab passes only when every test passes. */
export function gradeLabRun(run: CodeRun): Grade {
  const total = run.passed + run.failed;
  if (total === 0) return { by: "code", label: "gap", misconceptions: [], feedback: "No tests ran.", run };
  if (run.failed === 0)
    return { by: "code", label: "solid", misconceptions: [], feedback: `All ${total} tests passed.`, run };
  return {
    by: "code",
    label: run.passed === 0 ? "gap" : "partial",
    misconceptions: [],
    feedback: `${run.passed} of ${total} tests passed.`,
    run,
  };
}
