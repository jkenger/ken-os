import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import type { SourcePacket } from "@ken-os/domain";
import { findTopic } from "../src/features/engineering-lab/curriculum";
import { savePacket } from "../src/features/engineering-lab/store";
import { ownerEmail } from "../src/lib/config";
import { closeDb, db } from "../src/lib/db";
import { users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Loads source packets saved by `lab:research` into the database for the owner. Already-imported packets are skipped.
async function main() {
  const [owner] = await db().select({ id: users.id }).from(users).where(eq(users.email, ownerEmail())).limit(1);
  if (!owner) throw new Error("Sign in once before importing, so the owner account exists.");
  const root = resolve(process.cwd(), "../../content/engineering-lab/sources");
  let imported = 0;
  let skipped = 0;
  for (const folder of readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const file of readdirSync(resolve(root, folder.name)).filter((name) => name.endsWith(".json"))) {
      const raw = JSON.parse(readFileSync(resolve(root, folder.name, file), "utf8")) as SourcePacket & {
        skillId?: string;
      };
      // Packets saved before the rename to "topic" used skillId. The files themselves are never rewritten.
      const packet: SourcePacket = { ...raw, topicId: raw.topicId ?? raw.skillId! };
      delete (packet as { skillId?: string }).skillId;
      if (!findTopic(packet.topicId)) throw new Error(`${folder.name}/${file}: unknown topic ${packet.topicId}`);
      if (await savePacket(owner.id, packet)) imported += 1;
      else skipped += 1;
    }
  }
  console.log(`Imported ${imported} packets, skipped ${skipped} already in the database.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
