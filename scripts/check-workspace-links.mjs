/**
 * Keep the agent workspace honest: every repo path cited inside
 * agent-workspace/ must actually exist, and every `path:line` citation must
 * point inside the file it names.
 *
 *   node scripts/check-workspace-links.mjs
 *
 * A map that drifts from the code is worse than no map — this is the guard.
 * Run it after moving or renaming anything under versions/.
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const WORKSPACE = "agent-workspace";

/** Paths that legitimately do not exist in a fresh clone. */
const ALLOWED_MISSING = [
  "versions/v1-procedural/dev-assets/reference.jpg", // gitignored, supplied locally
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (extname(p) === ".md") out.push(p);
  }
  return out;
}

// `versions/...`, `scripts/...`, `docs/...`, optionally :line or :a-b
const CITE = /`((?:versions|scripts|docs|agent-workspace|\.claude)\/[^`\s]+?)(?::(\d+)(?:-\d+)?)?`/g;

let checked = 0;
const problems = [];

for (const file of walk(WORKSPACE)) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(CITE)) {
    const [, path, line] = m;
    if (ALLOWED_MISSING.includes(path)) continue;
    checked++;
    const abs = join(ROOT, path);
    if (!existsSync(abs)) {
      problems.push(`${file}: cites missing path ${path}`);
      continue;
    }
    if (line && statSync(abs).isFile()) {
      const count = readFileSync(abs, "utf8").split("\n").length;
      if (Number(line) > count) {
        problems.push(`${file}: ${path}:${line} is past end of file (${count} lines)`);
      }
    }
  }
}

console.log(`checked ${checked} citations across ${walk(WORKSPACE).length} files`);
if (problems.length) {
  for (const p of problems) console.error("  " + p);
  console.error(`${problems.length} broken citation(s)`);
  process.exit(1);
}
console.log("all citations resolve");
