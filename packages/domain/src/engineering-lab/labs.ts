import { MODES, type Mode } from "./types";

export const RUNNERS = ["browser", "pglite", "sandbox"] as const;
export type Runner = (typeof RUNNERS)[number];

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
}

export function parseLabMeta(raw: unknown, folder: string): Omit<LabDefinition, "readme" | "starter" | "tests"> {
  const item = (raw ?? {}) as Record<string, unknown>;
  const where = `labs/${folder}/lab.yaml`;
  if (item.id !== folder) throw new Error(`${where}: id must match the folder name`);
  if (typeof item.title !== "string" || !item.title.trim()) throw new Error(`${where}: title is required`);
  const topics = Array.isArray(item.topics) ? item.topics.map(String) : [];
  if (!topics.length) throw new Error(`${where}: list at least one topic`);
  const modes = Array.isArray(item.modes) ? item.modes : [];
  if (!modes.length || !modes.every((mode) => MODES.includes(mode as Mode))) throw new Error(`${where}: modes must be from ${MODES.join(", ")}`);
  if (!RUNNERS.includes(item.runner as Runner)) throw new Error(`${where}: runner must be one of ${RUNNERS.join(", ")}`);
  const timeoutMs = Number(item.timeoutMs ?? 2000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new Error(`${where}: timeoutMs must be 100 to 30000`);
  return { id: folder, title: item.title.trim(), topics, modes: modes as Mode[], runner: item.runner as Runner, timeoutMs };
}
