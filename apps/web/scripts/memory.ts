import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";
import { parseDecisionDraft, parseReceiptDraft, pilotPolicy } from "../src/features/project-memory/contract";

config({ path: ".env.local" });
config({ path: ".env" });

function assertPilotRepository() {
  const root = resolve(process.cwd(), "../..");
  const remote = execFileSync("git", ["-C", root, "remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)jkenger\/ken-os(?:\.git)?$/i.test(remote)) {
    throw new Error("Memory capture is allowlisted only for the Ken OS repository.");
  }
}

function endpoint() {
  const base = new URL(process.env.KEN_OS_MEMORY_URL ?? "https://ken-os-web.vercel.app");
  const production = base.origin === "https://ken-os-web.vercel.app";
  const local = base.origin === "http://localhost:3000" || base.origin === "http://127.0.0.1:3000";
  if (!production && !local) throw new Error("Memory endpoint must be Ken OS production or local port 3000.");
  return new URL("/api/memory/agent", base);
}

async function request(method: "GET" | "POST", body?: unknown) {
  const token = process.env.KEN_OS_MEMORY_TOKEN;
  if (!token)
    throw new Error("Set KEN_OS_MEMORY_TOKEN in your untracked local environment before using memory capture.");
  const response = await fetch(endpoint(), {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const result = (await response.json()) as { error?: string; policyDigest?: string };
  if (!response.ok) throw new Error(result.error ?? `Memory request failed (${response.status}).`);
  return result;
}

async function main() {
  assertPilotRepository();
  const command = process.argv[2];
  if (command !== "context" && command !== "submit")
    throw new Error("Usage: memory:context or memory:submit -- <decision|receipt> <draft.json>");
  const context = await request("GET");
  const localDigest = createHash("sha256").update(JSON.stringify(pilotPolicy)).digest("hex");
  if (context.policyDigest !== localDigest)
    throw new Error("Memory policy digest mismatch. Review the remote policy before submitting content.");
  if (command === "context") {
    console.log(JSON.stringify(context, null, 2));
    return;
  }
  const kind = process.argv[3];
  const file = process.argv[4];
  if ((kind !== "decision" && kind !== "receipt") || !file)
    throw new Error("Usage: memory:submit -- <decision|receipt> <draft.json>");
  const input = JSON.parse(readFileSync(resolve(file), "utf8")) as unknown;
  const draft = kind === "decision" ? parseDecisionDraft(input) : parseReceiptDraft(input);
  const result = await request("POST", { kind, draft });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Memory command failed.");
  process.exitCode = 1;
});
