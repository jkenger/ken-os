#!/usr/bin/env node
import { execFileSync } from "node:child_process";

// Mutation-tests only the production files changed against a base branch (default: main), so a PR-readiness
// check doesn't re-run the whole project to recheck one slice. Refuses on a dirty tree: `<base>...HEAD` only
// covers committed history, so uncommitted work would silently be excluded from the result.

const base = process.argv[2] ?? "main";

const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
if (status.trim()) {
  console.error(
    `Working tree is not clean. git diff ${base}...HEAD only covers committed history -- staged, unstaged ` +
      "and untracked changes would be silently excluded. Commit or stash first.",
  );
  process.exit(1);
}

const raw = execFileSync("git", ["diff", "--name-only", "-z", "--diff-filter=ACMRTUXB", `${base}...HEAD`], {
  encoding: "utf8",
  cwd: "..",
});
const changed = raw.split("\0").filter(Boolean);

const SOURCE_EXT = /\.(ts|tsx|js|jsx)$/;
const EXCLUDE = /\.(test|spec)\.|\.generated\.|\.d\.ts$/;

const candidates = changed
  .filter((file) => file.startsWith("apps/web/"))
  .map((file) => file.slice("apps/web/".length))
  .filter((file) => SOURCE_EXT.test(file) && !EXCLUDE.test(file));

if (candidates.length === 0) {
  console.log(`No changed apps/web production files against ${base} -- nothing to mutate.`);
  process.exit(0);
}

for (const file of candidates) {
  if (file.includes(",")) {
    console.error(`Refusing: "${file}" contains a comma, which Stryker's --mutate would misparse as two globs.`);
    process.exit(1);
  }
}

console.log(`Mutating ${candidates.length} changed file(s) against ${base}:\n  ${candidates.join("\n  ")}`);
execFileSync("pnpm", ["exec", "stryker", "run", "--mutate", candidates.join(",")], { stdio: "inherit" });
