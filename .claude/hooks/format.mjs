// PostToolUse hook: format the file an agent just wrote or edited with the repo's Prettier setup.
// Files covered by .prettierignore and file types Prettier doesn't know are left alone.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;

const filePath = JSON.parse(input || "{}").tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const prettier = join(root, "node_modules", "prettier", "bin", "prettier.cjs");

if (filePath && existsSync(filePath) && existsSync(prettier)) {
  const result = spawnSync(
    process.execPath,
    [prettier, "--write", "--ignore-unknown", "--log-level", "warn", filePath],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    process.stderr.write(`Prettier could not format ${filePath}\n${result.stderr}`);
    process.exit(2);
  }
}
