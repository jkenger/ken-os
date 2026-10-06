import { randomUUID } from "node:crypto";
import type { Label, RunChapter } from "@ken-os/domain";
import { db } from "../src/lib/db";
import { labChapterScreens } from "../src/lib/schema";

// For the database checks: answers a two-stage chapter's two chapter questions as the grader would, with no AI call.
// "drill" leaves the chapter needing topic questions; "clear" finishes it without them.
export async function answerStageOne(userId: string, runId: string, chapter: RunChapter, outcome: "drill" | "clear") {
  if (chapter.kind !== "topics" || !chapter.screenFirst) return;
  const labels: Label[] = outcome === "clear" ? ["solid", "solid"] : ["solid", "partial"];
  await db().insert(labChapterScreens).values(labels.map((label, itemIndex) => ({
    id: randomUUID(), userId, setId: runId, runId, chapterId: chapter.chapterId, itemIndex,
    item: { mode: "explain" as const, prompt: `Chapter question ${itemIndex + 1}`, code: null, rubric: ["point"], misconceptionsToWatch: [] },
    promptVersion: "check", model: "none", response: { text: "A check answer." }, selfRating: 3, label, misconceptions: [], feedback: "Check.", rubric: null,
    answeredAt: new Date(Date.now() + itemIndex),
  })));
}
