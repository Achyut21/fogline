// Stop hook: if code changed on this branch (or in the working tree) but docs/PROGRESS.md did not,
// stop Claude once and ask for the PROGRESS update CLAUDE.md requires after every finished item.
// No process.exit: on Node 24.7 an ES module that reads stdin and then exits can segfault.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function git(...args) {
  const result = spawnSync("git", ["-c", "core.quotePath=false", ...args], {
    cwd: root,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.split("\n").filter(Boolean) : [];
}

function reminder() {
  const base = git("merge-base", "HEAD", "origin/main")[0];
  const changed = new Set([
    ...(base ? git("diff", "--name-only", base, "HEAD") : []),
    ...git("diff", "--name-only", "HEAD"),
    ...git("ls-files", "--others", "--exclude-standard"),
  ]);
  const code = [...changed].filter(
    (file) => !file.startsWith("docs/") && !file.startsWith(".claude/"),
  );
  if (code.length === 0 || changed.has("docs/PROGRESS.md")) return null;
  const files = code.slice(0, 5).join(", ") + (code.length > 5 ? ", …" : "");
  return `Code changed on this branch (${files}) but docs/PROGRESS.md did not. Update the Board and add a Log entry, as CLAUDE.md requires after every finished item, or say why this change needs none.`;
}

const input = JSON.parse(readFileSync(0, "utf8"));
const reason = input.stop_hook_active ? null : reminder();
if (reason) process.stdout.write(JSON.stringify({ decision: "block", reason }));
