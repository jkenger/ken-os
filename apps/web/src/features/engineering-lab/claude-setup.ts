import { CLAUDE_INSTRUCTIONS_UPDATED } from "./claude-instructions";

// The setup checklist's rules (docs/architecture/engineering-progressive-flow.md, section 1). Pure, so the page and the
// tests share them. Ken OS can't read the Claude Project, so the instructions report their own version: Claude passes
// it to get_current_state, and the last one seen is stored on lab_profile.

export type InstructionsState = "pasted" | "out_of_date" | "not_yet";

export interface SetupFacts {
  connected: boolean;
  instructions: InstructionsState;
  projectLinked: boolean;
  planned: boolean;
}

export type SetupItemId = "connect" | "instructions" | "project" | "plan";

const VERSION = /^\d{4}-\d{2}-\d{2}$/;

/** The version Claude sent, if it's a YYYY-MM-DD date; anything else is ignored. */
export function instructionsVersion(value: string | null | undefined) {
  const version = value?.trim() ?? "";
  return VERSION.test(version) ? version : null;
}

/** Whether the Project has the current instructions, from the version Claude last reported. */
export function instructionsState(seen: string | null, current = CLAUDE_INSTRUCTIONS_UPDATED): InstructionsState {
  if (!seen) return "not_yet";
  return seen >= current ? "pasted" : "out_of_date";
}

/**
 * The four items, in order, and whether to show the list. It hides once setup has been done: instructions reported at
 * least once, a Project link and a roadmap. Later problems (a lost connection, newer instructions) show on the Claude
 * setup button instead (setupAlert), so the list doesn't come back.
 */
export function setupChecklist(facts: SetupFacts) {
  const items: { id: SetupItemId; done: boolean }[] = [
    { id: "connect", done: facts.connected },
    { id: "instructions", done: facts.instructions === "pasted" },
    { id: "project", done: facts.projectLinked },
    { id: "plan", done: facts.planned },
  ];
  const setUp = facts.instructions !== "not_yet" && facts.projectLinked && facts.planned;
  return { items, done: items.filter((item) => item.done).length, show: !setUp };
}

/** A word for the Claude setup button once the checklist is gone: a lost connection first, then stale instructions. */
export function setupAlert(facts: SetupFacts) {
  if (setupChecklist(facts).show) return null;
  if (!facts.connected) return "Not connected";
  if (facts.instructions === "out_of_date") return "Update";
  return null;
}
