/**
 * Keep the routing honest: every repo path cited in the agent workspace, in the
 * root entry files, or in docs/ must actually exist, and every `path:line`
 * citation must point inside the file it names. Both backtick citations and
 * markdown links are checked.
 *
 *   node scripts/check-workspace-links.mjs
 *
 * A map that drifts from the code is worse than no map — this is the guard.
 * Run it after moving or renaming anything under versions/.
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, extname, dirname, resolve } from "node:path";

const ROOT = process.cwd();

/** Directories walked in full. */
const TREES = ["agent-workspace", "docs"];
/** Individual files that are entry points — a dead link here costs the most. */
const ENTRY_FILES = ["CLAUDE.md", "AGENTS.md", "README.md"];

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

const PREFIX = "(?:versions|scripts|docs|agent-workspace|\\.claude)";
// `versions/...`, `scripts/...`, optionally :line or :a-b
const CITE = new RegExp("`(" + PREFIX + "/[^`\\s]+?)(?::(\\d+)(?:-\\d+)?)?`", "g");
// [text](versions/...) — markdown links, as used by README.md
const LINK = new RegExp("\\]\\((" + PREFIX + "/[^)\\s#]+)\\)", "g");

/** Every markdown file this guard is responsible for. */
function targets() {
  const out = [];
  for (const t of TREES) if (existsSync(join(ROOT, t))) walk(t, out);
  for (const f of ENTRY_FILES) if (existsSync(join(ROOT, f))) out.push(f);
  return out;
}

let checked = 0;
const problems = [];

const FILES = targets();

// Card-to-card references. Two conventions are in use and both are checked:
//   * a true relative path (`../objects/foo.md`) — must resolve from the citing file
//   * cluster shorthand (`v1-scene/petal-atlas.md`) or a bare name (`status.md`) —
//     passes if any markdown file in the repo matches that path suffix
// This is the pass that catches a reference to a card that never existed.
const RELCITE = /`((?:\.\.?\/)*(?:[\w.-]+\/)*[\w.-]+\.md)(?::\d+(?:-\d+)?)?`/g;
const RELLINK = /\]\(((?:\.\.?\/)*(?:[\w.-]+\/)*[\w.-]+\.md)(?:#[^)]*)?\)/g;
/** Template placeholders — not real files by design. */
const PLACEHOLDER = /YYYY|NNNN|<|slug|_template/i;

/** Every markdown file in the repo — the corpus a shorthand reference may name. */
const ALL_MD = (() => {
  const out = [];
  for (const t of [...TREES, "versions", ".claude"]) {
    if (existsSync(join(ROOT, t))) walk(t, out);
  }
  return [...out.filter((f) => !f.includes("node_modules")), ...ENTRY_FILES];
})();
const endsWithAny = (rel) =>
  ALL_MD.some((f) => f === rel || f.endsWith("/" + rel));

for (const file of FILES) {
  const dir = dirname(file);
  const text = readFileSync(file, "utf8");
  for (const m of [...text.matchAll(RELCITE), ...text.matchAll(RELLINK)]) {
    const rel = m[1];
    if (/^(?:versions|scripts|docs|agent-workspace|\.claude)\//.test(rel)) continue;
    if (PLACEHOLDER.test(rel)) continue;
    checked++;
    if (rel.startsWith("./") || rel.startsWith("../")) {
      if (!existsSync(resolve(ROOT, dir, rel))) {
        problems.push(`${file}: relative link ${rel} does not resolve`);
      }
    } else if (!existsSync(resolve(ROOT, dir, rel)) && !endsWithAny(rel)) {
      problems.push(`${file}: names ${rel}, which is not a file anywhere in the repo`);
    }
  }
}

for (const file of FILES) {
  const text = readFileSync(file, "utf8");
  for (const m of [...text.matchAll(CITE), ...text.matchAll(LINK)]) {
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

console.log(`checked ${checked} citations across ${FILES.length} files`);
if (problems.length) {
  for (const p of problems) console.error("  " + p);
  console.error(`${problems.length} broken citation(s)`);
  process.exit(1);
}
console.log("all citations resolve");
