import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import type { AgentInputItem } from "@ken-os/agents";
import { closeDb, db } from "../src/lib/db/db";
import { users } from "../src/lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Loona (slice 1: chat shell), with no AI calls -- `respond` is stubbed. A throwaway user
// is created and deleted, cascading everything it made. Spec: docs/architecture/loona-agent.md.
// Run with: pnpm --filter @ken-os/web test:db:loona
async function main() {
  const store = await import("../src/features/loona/store");
  const userId = `loona-check-${randomUUID()}`;
  const otherId = `${userId}-other`;
  await db()
    .insert(users)
    .values([
      { id: userId, email: `${userId}@example.invalid`, name: "Loona Check" },
      { id: otherId, email: `${otherId}@example.invalid`, name: "Other" },
    ]);

  const stubRespond = async (history: AgentInputItem[]) => ({
    reply: `stub reply to turn ${history.length}`,
    history: [
      ...history,
      {
        role: "assistant" as const,
        status: "completed" as const,
        content: [{ type: "output_text" as const, text: `stub reply to turn ${history.length}` }],
      },
    ],
  });

  try {
    assert.deepEqual(await store.getLoonaMessages(userId), [], "no messages before any chat turn");
    console.log("ok - a fresh conversation starts empty");

    const first = await store.sendLoonaMessage(userId, "hello", stubRespond);
    assert.deepEqual(first, [
      { role: "user", content: "hello" },
      { role: "assistant", content: "stub reply to turn 1" },
    ]);
    console.log("ok - a chat turn persists the user message and the reply, in order");

    assert.deepEqual(await store.getLoonaMessages(userId), first, "conversation survives a reload");
    console.log("ok - the conversation is still there on a later read");

    const second = await store.sendLoonaMessage(userId, "again", stubRespond);
    assert.equal(second.length, 4, "second turn appends, not overwrites");
    assert.equal(second[3].content, "stub reply to turn 3", "the model saw the prior turns, not just the new message");
    console.log("ok - a second turn carries the prior history forward");

    await assert.rejects(
      store.sendLoonaMessage(userId, "   ", stubRespond),
      (error: Error) => error instanceof store.LoonaInputError,
      "blank input is refused before any model call",
    );
    console.log("ok - a blank message is refused");

    assert.deepEqual(await store.getLoonaMessages(otherId), [], "another user's conversation is untouched");
    console.log("ok - conversations are per-user");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await db().delete(users).where(eq(users.id, otherId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
