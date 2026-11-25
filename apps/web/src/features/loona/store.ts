import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { chatWithLoona, type AgentInputItem } from "@ken-os/agents";
import { db } from "@/lib/db/db";
import { agentConversations } from "@/lib/db/schema";

const AGENT_KEY = "loona";

export class LoonaInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export interface LoonaMessage {
  role: "user" | "assistant";
  content: string;
}

type Respond = (history: AgentInputItem[]) => Promise<{ reply: string; history: AgentInputItem[] }>;

/** Flattens the SDK's own `AgentInputItem[]` thread into what the chat UI renders. Tool calls/results
 *  (none exist yet -- slice 1 has no tools) are skipped rather than shown as a message. */
export function toDisplayMessages(history: AgentInputItem[]): LoonaMessage[] {
  const messages: LoonaMessage[] = [];
  for (const item of history) {
    if (!("role" in item)) continue;
    if (item.role === "user") {
      const text = typeof item.content === "string" ? item.content : extractText(item.content);
      if (text) messages.push({ role: "user", content: text });
    } else if (item.role === "assistant") {
      const text = extractText(item.content);
      if (text) messages.push({ role: "assistant", content: text });
    }
  }
  return messages;
}

function extractText(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (part): part is { type: string; text: string } => typeof part === "object" && part !== null && "text" in part,
    )
    .map((part) => part.text)
    .join("");
}

async function getOrCreateConversation(userId: string): Promise<{ id: string; history: AgentInputItem[] }> {
  const [existing] = await db()
    .select()
    .from(agentConversations)
    .where(and(eq(agentConversations.userId, userId), eq(agentConversations.agentKey, AGENT_KEY)));
  if (existing) return { id: existing.id, history: existing.history as AgentInputItem[] };
  const id = randomUUID();
  await db().insert(agentConversations).values({ id, userId, agentKey: AGENT_KEY, history: [] });
  return { id, history: [] };
}

/** One chat turn: persist the user's message, get Loona's reply, persist the updated thread.
 *  `respond` defaults to the real model call; tests inject a stub so the DB check makes no AI calls. */
export async function sendLoonaMessage(
  userId: string,
  text: string,
  respond: Respond = chatWithLoona,
): Promise<LoonaMessage[]> {
  const trimmed = text.trim();
  if (!trimmed) throw new LoonaInputError("Type a message first");
  const conversation = await getOrCreateConversation(userId);
  const input: AgentInputItem[] = [...conversation.history, { role: "user", content: trimmed }];
  const result = await respond(input);
  await db()
    .update(agentConversations)
    .set({ history: result.history, updatedAt: new Date() })
    .where(eq(agentConversations.id, conversation.id));
  return toDisplayMessages(result.history);
}

export async function getLoonaMessages(userId: string): Promise<LoonaMessage[]> {
  const conversation = await getOrCreateConversation(userId);
  return toDisplayMessages(conversation.history);
}
