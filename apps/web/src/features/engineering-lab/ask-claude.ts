// Ask Claude on a topic page: copy a starter message and open the owner's Claude Project.
// Spec: docs/architecture/engineering-claude-connector.md, section 6.

/** The message the owner pastes into Claude. It names the topic id so Claude can call get_topic straight away. */
export function askClaudeMessage(topic: { id: string; title: string }) {
  return `Teach me ${topic.title} (Ken OS topic \`${topic.id}\`). Start by checking where I am.`;
}

/**
 * The owner's Claude Project, from KEN_OS_CLAUDE_PROJECT_URL. Only an https link on claude.ai counts; anything else
 * (unset, a typo, another site) hides the button rather than opening it.
 */
export function claudeProjectUrl(value = process.env.KEN_OS_CLAUDE_PROJECT_URL): string | null {
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
