import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { users } from "../src/lib/schema";
import { parseSkillBundle } from "../src/lib/skill-bundle";
import { getEnabledSkills, listSkills, saveSkill, setSkillEnabled } from "../src/lib/skills";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("This smoke test only runs against local PostgreSQL.");
  }
  const userId = `skill-test-${randomUUID()}`;
  await db().insert(users).values({ id: userId, email: `${userId}@example.invalid` });
  try {
    const bundle = await parseSkillBundle("SKILL.md", Buffer.from("---\nname: local-test\ndescription: A local test skill.\n---\n\nCheck the resume."));
    const id = await saveSkill(userId, bundle);
    assert.equal(await saveSkill(userId, bundle), id);
    assert.equal((await listSkills(userId)).length, 1);
    await setSkillEnabled(userId, id, true);
    assert.equal((await getEnabledSkills(userId))[0]?.slug, "local-test");
    const revision = await parseSkillBundle("SKILL.md", Buffer.from("---\nname: local-test\ndescription: A local test skill.\n---\n\nCheck the resume carefully."));
    const revisionId = await saveSkill(userId, revision);
    assert.notEqual(revisionId, id);
    assert.equal((await listSkills(userId)).length, 2);
    await setSkillEnabled(userId, revisionId, true);
    assert.equal((await getEnabledSkills(userId))[0]?.version, 2);
    assert.equal((await getEnabledSkills(userId)).length, 1);
    await setSkillEnabled(userId, revisionId, false);
    assert.equal((await getEnabledSkills(userId)).length, 0);
    console.log("Skill database smoke test passed");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
