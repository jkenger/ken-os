import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { labProfile, labTopicChats } from "@/lib/schema";
import { requireAnyTopic } from "./any-topic";
import { claudeLink, claudeProjectUrl } from "./ask-claude";
import { instructionsVersion } from "./claude-setup";
import { LabInputError } from "./errors";
import { getProfileRow } from "./profile-store";

// The owner's links into Claude, set in the app (docs/architecture/engineering-claude-first.md, section 9e): the Claude
// Project that Ask Claude opens, optionally the chat each topic was learned in, for Continue chat, and the instructions
// version Claude last reported.

const NOT_A_CLAUDE_LINK = "Use an https claude.ai link";

/** The Project Ask Claude opens: the one saved in Settings, else KEN_OS_CLAUDE_PROJECT_URL. Null hides Ask Claude. */
export async function getProjectUrl(userId: string) {
  const profile = await getProfileRow(userId);
  return claudeLink(profile?.claudeProjectUrl) ?? claudeProjectUrl();
}

/** Saves the Project link. An empty value clears it. */
export async function setProjectUrl(userId: string, value: string) {
  const url = value.trim() ? claudeLink(value) : null;
  if (value.trim() && !url) throw new LabInputError(NOT_A_CLAUDE_LINK);
  const updatedAt = new Date();
  await db()
    .insert(labProfile)
    .values({ userId, claudeProjectUrl: url, updatedAt })
    .onConflictDoUpdate({ target: labProfile.userId, set: { claudeProjectUrl: url, updatedAt } });
  return { url };
}

/** The chat this topic was learned in, if the owner linked one. */
export async function getTopicChat(userId: string, topicId: string) {
  const [row] = await db()
    .select({ url: labTopicChats.url })
    .from(labTopicChats)
    .where(and(eq(labTopicChats.userId, userId), eq(labTopicChats.topicId, topicId)))
    .limit(1);
  return row ? claudeLink(row.url) : null;
}

/** Links a topic to a Claude chat. An empty value unlinks it. */
export async function setTopicChat(userId: string, topicId: string, value: string) {
  await requireAnyTopic(userId, topicId);
  if (!value.trim()) {
    await db()
      .delete(labTopicChats)
      .where(and(eq(labTopicChats.userId, userId), eq(labTopicChats.topicId, topicId)));
    return { url: null };
  }
  const url = claudeLink(value);
  if (!url) throw new LabInputError(NOT_A_CLAUDE_LINK);
  const updatedAt = new Date();
  await db()
    .insert(labTopicChats)
    .values({ userId, topicId, url, updatedAt })
    .onConflictDoUpdate({ target: [labTopicChats.userId, labTopicChats.topicId], set: { url, updatedAt } });
  return { url };
}

/** The Project instructions version Claude last reported, and when it first reported it. */
export async function getInstructionsSeen(userId: string) {
  const profile = await getProfileRow(userId);
  return { version: profile?.claudeInstructionsVersion ?? null, seenAt: profile?.claudeInstructionsSeenAt ?? null };
}

/**
 * Keeps the instructions version Claude sent to get_current_state (docs/architecture/engineering-progressive-flow.md,
 * section 1). Anything but a YYYY-MM-DD date is ignored, and an unchanged version isn't written again.
 */
export async function recordInstructionsVersion(userId: string, value: string | undefined) {
  const version = instructionsVersion(value);
  if (!version) return null;
  const seen = await getInstructionsSeen(userId);
  if (seen.version === version) return version;
  const now = new Date();
  const set = { claudeInstructionsVersion: version, claudeInstructionsSeenAt: now, updatedAt: now };
  await db()
    .insert(labProfile)
    .values({ userId, ...set })
    .onConflictDoUpdate({ target: labProfile.userId, set });
  return version;
}
