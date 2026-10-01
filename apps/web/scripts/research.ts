import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { researchTopic } from "@ken-os/agents";
import { isPacketUsable, researchTargetFor } from "@ken-os/domain";
import { findTopic, topicMap } from "../src/features/engineering-lab/curriculum";

config({ path: ".env.local" });
config({ path: ".env" });

// Saves a dated source packet snapshot to the repo. Snapshots are never overwritten, so a lesson keeps the
// sources it was built from. `pnpm lab:import-sources` loads saved packets into the database.
async function main() {
  const topicId = process.argv[2];
  const topic = topicId ? findTopic(topicId) : undefined;
  if (!topic) {
    console.error(`Usage: pnpm --filter @ken-os/web lab:research <topic>\nTopics: ${topicMap.topics.map((item) => item.id).join(", ")}`);
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("Set OPENAI_API_KEY in your untracked local environment.");

  const directory = resolve(process.cwd(), "../../content/engineering-lab/sources", topic.id);
  const file = resolve(directory, `${new Date().toISOString().slice(0, 10)}.json`);
  if (existsSync(file)) throw new Error(`A packet for ${topic.id} already exists today: ${file}`);

  const target = researchTargetFor(topic);
  console.log(`Researching ${topic.id} on ${target.allowedDomains.join(", ")}...`);
  const packet = await researchTopic(target);
  if (!isPacketUsable(packet)) {
    console.error(`No usable sources survived the checks. Rejected:\n- ${packet.rejected.join("\n- ")}`);
    process.exit(1);
  }
  mkdirSync(directory, { recursive: true });
  writeFileSync(file, `${JSON.stringify(packet, null, 2)}\n`);
  console.log(`Saved ${packet.sources.length} sources and ${packet.claims.length} claims to ${file}`);
  if (packet.rejected.length) console.log(`Rejected ${packet.rejected.length} items; see "rejected" in the file.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
