import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { researchSkill } from "@ken-os/agents";
import { isPacketUsable } from "@ken-os/domain";
import { findResearchTarget, RESEARCH_TARGETS } from "../src/features/engineering-lab/research-targets";

config({ path: ".env.local" });
config({ path: ".env" });

// Saves a dated source packet snapshot. Snapshots are never overwritten, so a lesson keeps the sources it was built from.
async function main() {
  const skillId = process.argv[2];
  const target = skillId ? findResearchTarget(skillId) : undefined;
  if (!target) {
    console.error(`Usage: pnpm --filter @ken-os/web lab:research <skill>\nSkills: ${RESEARCH_TARGETS.map((item) => item.skillId).join(", ")}`);
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("Set OPENAI_API_KEY in your untracked local environment.");

  const directory = resolve(process.cwd(), "../../content/engineering-lab/sources", target.skillId);
  const file = resolve(directory, `${new Date().toISOString().slice(0, 10)}.json`);
  if (existsSync(file)) throw new Error(`A packet for ${target.skillId} already exists today: ${file}`);

  console.log(`Researching ${target.skillId} on ${target.allowedDomains.join(", ")}...`);
  const packet = await researchSkill(target);
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
