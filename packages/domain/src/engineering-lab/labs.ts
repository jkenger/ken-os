import { MODES, type Mode } from "./types";

/**
 * browser: learner JavaScript and tests in a Web Worker.
 * pglite: the same, with a fresh in-browser Postgres (PGlite) prepared by the lab's setup SQL.
 * probe: no code to write. The learner predicts browser behavior, then the page runs real requests to check.
 * sandbox: reserved for labs that need real parallel database connections (locks, isolation levels). None yet.
 */
export const RUNNERS = ["browser", "pglite", "probe", "sandbox"] as const;
export type Runner = (typeof RUNNERS)[number];

export interface ProbeQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Shown after the run, never before. */
  why: string;
}

/** Everything the learner's browser may see. Solutions are kept separately and only sent after a pass or a give-up. */
export interface LabDefinition {
  id: string;
  title: string;
  topics: string[];
  modes: Mode[];
  runner: Runner;
  timeoutMs: number;
  readme: string;
  starter: string;
  tests: string;
  /** pglite labs: SQL run on a fresh database before the learner's code. */
  setup: string;
  /** probe labs: which built-in probe produces the real answers, and the questions it answers. */
  probe: { id: string; questions: ProbeQuestion[] } | null;
}

export type LabMeta = Pick<LabDefinition, "id" | "title" | "topics" | "modes" | "runner" | "timeoutMs"> & { probeId: string | null };

export function parseLabMeta(raw: unknown, folder: string): LabMeta {
  const item = (raw ?? {}) as Record<string, unknown>;
  const where = `labs/${folder}/lab.yaml`;
  if (item.id !== folder) throw new Error(`${where}: id must match the folder name`);
  if (typeof item.title !== "string" || !item.title.trim()) throw new Error(`${where}: title is required`);
  const topics = Array.isArray(item.topics) ? item.topics.map(String) : [];
  if (!topics.length) throw new Error(`${where}: list at least one topic`);
  const modes = Array.isArray(item.modes) ? item.modes : [];
  if (!modes.length || !modes.every((mode) => MODES.includes(mode as Mode))) throw new Error(`${where}: modes must be from ${MODES.join(", ")}`);
  if (!RUNNERS.includes(item.runner as Runner)) throw new Error(`${where}: runner must be one of ${RUNNERS.join(", ")}`);
  if (item.runner === "sandbox") throw new Error(`${where}: the sandbox runner is not available yet`);
  const timeoutMs = Number(item.timeoutMs ?? 2000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new Error(`${where}: timeoutMs must be 100 to 30000`);
  const probeId = item.runner === "probe" ? String(item.probe ?? "") : null;
  if (item.runner === "probe" && !probeId) throw new Error(`${where}: probe labs name their probe`);
  return { id: folder, title: item.title.trim(), topics, modes: modes as Mode[], runner: item.runner as Runner, timeoutMs, probeId };
}

export function parseProbeQuestions(raw: unknown, folder: string): ProbeQuestion[] {
  const list = (raw as { questions?: unknown })?.questions;
  if (!Array.isArray(list) || !list.length) throw new Error(`labs/${folder}/questions.yaml: list at least one question`);
  const questions = list.map((value, index) => {
    const item = value as Record<string, unknown>;
    const where = `labs/${folder}/questions.yaml[${index}]`;
    if (typeof item.id !== "string" || !/^[a-z_]+$/.test(item.id)) throw new Error(`${where}: id must be snake_case`);
    if (typeof item.prompt !== "string" || typeof item.why !== "string") throw new Error(`${where}: prompt and why are required`);
    const options = Array.isArray(item.options) ? item.options.map(String) : [];
    if (options.length < 2) throw new Error(`${where}: at least two options`);
    return { id: item.id, prompt: item.prompt.trim(), options, why: item.why.trim() };
  });
  if (new Set(questions.map((item) => item.id)).size !== questions.length) throw new Error(`labs/${folder}/questions.yaml: duplicate id`);
  return questions;
}

/** Scores predictions against what the probe observed. Each question is one test. */
export function scoreProbe(questions: ProbeQuestion[], predicted: Record<string, string>, observed: Record<string, string>) {
  const results = questions.map((question) => {
    const actual = observed[question.id];
    const passed = actual !== undefined && predicted[question.id] === actual;
    return { name: question.prompt, passed, error: passed ? undefined : actual === undefined ? "The probe couldn't observe this." : `Actually: ${actual}. ${question.why}` };
  });
  return { results, passed: results.filter((item) => item.passed).length, failed: results.filter((item) => !item.passed).length };
}
