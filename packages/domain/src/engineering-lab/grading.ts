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

export interface DiffRow {
  text: string;
  /** match: printed where you said. missing: printed, not in yours here. extra: in yours here, not printed here. */
  kind: "match" | "missing" | "extra";
  /** The line printed, just somewhere else than you put it. */
  moved: boolean;
}

/**
 * Lines the code printed against lines you predicted, matched by longest common subsequence so one missing line
 * doesn't shift everything after it. A line that is both missing and extra was printed, just elsewhere: moved.
 */
export function diffLines(actual: string[], predicted: string[]): DiffRow[] {
  const a = normalizeLines(actual);
  const b = normalizeLines(predicted);
  const table = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const rows: Omit<DiffRow, "moved">[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { rows.push({ text: a[i], kind: "match" }); i++; j++; }
    else if (j < b.length && (i >= a.length || table[i][j + 1] >= table[i + 1][j])) { rows.push({ text: b[j], kind: "extra" }); j++; }
    else { rows.push({ text: a[i], kind: "missing" }); i++; }
  }
  const missing = new Set(rows.filter((row) => row.kind === "missing").map((row) => row.text));
  const extra = new Set(rows.filter((row) => row.kind === "extra").map((row) => row.text));
  return rows.map((row) => ({ ...row, moved: row.kind === "missing" ? extra.has(row.text) : row.kind === "extra" ? missing.has(row.text) : false }));
}

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
  if (same(got, want)) return { by: "code", label: "solid", misconceptions: [], feedback: `Exactly right, every line in order: ${want.join(", ")}.` };
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
  if (run.failed === 0) return { by: "code", label: "solid", misconceptions: [], feedback: `All ${total} tests passed.`, run };
  return {
    by: "code",
    label: run.passed === 0 ? "gap" : "partial",
    misconceptions: [],
    feedback: `${run.passed} of ${total} tests passed.`,
    run,
  };
}
