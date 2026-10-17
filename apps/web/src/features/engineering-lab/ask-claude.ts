// Ask Claude on a topic page: copy a starter message and open the owner's Claude Project.
// Spec: docs/architecture/engineering-claude-connector.md, section 6.

/** The message the owner pastes into Claude. It names the topic id so Claude can call get_topic straight away. */
export function askClaudeMessage(topic: { id: string; title: string }) {
  return `Teach me ${topic.title} (Loots topic \`${topic.id}\`). Start by checking where I am.`;
}

/** The message that starts planning a roadmap in Claude (docs/architecture/engineering-claude-first.md, section 3). */
export const PLAN_MESSAGE =
  "Plan a new Loots roadmap with me. Ask my goal and what I've worked on, propose chapters and topics from the topic map, and save it with save_roadmap once I agree.";

/** Re-plan one roadmap in place (docs/architecture/engineering-roadmaps.md, section 1): the id tells Claude which. */
export function replanMessage(roadmap: { id: string; goal: string }) {
  return `Re-plan my roadmap ${roadmap.goal} (Loots roadmap \`${roadmap.id}\`). Start by checking where I am.`;
}

/**
 * The owner's Claude Project from KEN_OS_CLAUDE_PROJECT_URL: the fallback until a link is saved in Settings.
 * Anything that isn't a Claude link (unset, a typo, another site) hides the button rather than opening it.
 */
export function claudeProjectUrl(value = process.env.KEN_OS_CLAUDE_PROJECT_URL): string | null {
  return claudeLink(value);
}

/** A link Loots may open for Claude: https on claude.ai, a Project or a chat. Anything else is null. */
export function claudeLink(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname === "claude.ai" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/** Ask Claude to write a topic's material when the panel shows Not planned yet (docs/architecture/roadmap-ui.md). */
export function planTopicMessage(topic: { id: string; title: string }) {
  return `Plan ${topic.title} (Loots topic \`${topic.id}\`): write its description, tasks, resources and mastery criteria with save_topic_material.`;
}
