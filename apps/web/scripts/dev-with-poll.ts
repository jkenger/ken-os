import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Runs `next dev` plus the same once-a-minute poll of the Jobs pipeline an outside scheduler runs in production
// (docs/product/job-finder.md, "Getting postings in"; plans/jobs-freehire-source.md), so `pnpm dev` alone keeps
// postings fresh locally without a separate scheduled task to remember to set up or tear down.

const POLL_INTERVAL_MS = 60_000;
const FIRST_POLL_DELAY_MS = 8_000;
const BASE_URL = "http://localhost:3000";

/** Null when the Jobs env isn't configured -- `pnpm dev` is used for every feature in this app, not just Jobs,
 *  so a missing secret skips polling with a warning instead of failing the whole dev server. */
function readSecret(): string | null {
  try {
    const envPath = join(import.meta.dirname, "..", ".env");
    const line = readFileSync(envPath, "utf8")
      .split("\n")
      .find((row) => row.startsWith("JOBS_CHECK_SECRET="));
    return line ? line.slice("JOBS_CHECK_SECRET=".length).trim() : null;
  } catch {
    return null;
  }
}

async function hit(secret: string, path: string): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { headers: { "x-jobs-check-secret": secret } });
    return `${path} -> ${response.status}`;
  } catch (error) {
    return `${path} -> ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function poll(secret: string): Promise<void> {
  const scrapeResult = await hit(secret, "/api/jobs/check/freehire");
  const processResult = await hit(secret, "/api/jobs/process");
  console.log(`[jobs-poll ${new Date().toISOString()}]`, [scrapeResult, processResult].join(" | "));
}

const secret = readSecret();
const next = spawn("next", ["dev"], { stdio: "inherit", shell: true });

let timer: NodeJS.Timeout | undefined;
if (secret) {
  timer = setInterval(() => void poll(secret), POLL_INTERVAL_MS);
  setTimeout(() => void poll(secret), FIRST_POLL_DELAY_MS);
} else {
  console.warn("[jobs-poll] JOBS_CHECK_SECRET not set in .env -- skipping the Jobs pipeline poll");
}

function shutdown() {
  if (timer) clearInterval(timer);
  next.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
next.on("exit", (code) => {
  if (timer) clearInterval(timer);
  process.exit(code ?? 0);
});
