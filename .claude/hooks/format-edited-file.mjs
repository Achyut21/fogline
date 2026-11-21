// PostToolUse hook: format the file Claude just wrote with the repo's Prettier. Prettier's own
// ignore files decide what it skips (docs/, Markdown); unknown file types are left alone. A file
// Prettier can't parse yet (a half-finished edit) is left as it is, without an error.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const raw = readFileSync(0, "utf8");
const input = raw ? JSON.parse(raw) : {};
const file = input.tool_response?.filePath ?? input.tool_input?.file_path;
const root = realpathSync(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const prettier = path.join(root, "node_modules", ".bin", "prettier");
const target = file && existsSync(file) ? realpathSync(file) : null;

if (target && target.startsWith(root + path.sep) && existsSync(prettier)) {
  spawnSync(prettier, ["--write", "--ignore-unknown", "--log-level", "silent", target], {
    cwd: root,
    stdio: "ignore",
  });
}
