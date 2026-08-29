/**
 * Generate the agent-entry twins. `CLAUDE.md` is the only hand-edited entry
 * file; `AGENTS.md` and `routing.md` are byte-identical copies so tools that
 * ignore CLAUDE.md still get the same catalog and the two can never drift.
 *
 *   node scripts/sync-twins.mjs          write the twins
 *   node scripts/sync-twins.mjs --check  exit 1 if any twin is stale (CI)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const BANNER = (src) =>
  `<!-- GENERATED from ${src} by scripts/sync-twins.mjs — do not edit. -->\n`;

/** source → twins written beside it */
const PAIRS = [
  { src: "CLAUDE.md", twins: ["AGENTS.md"] },
  { src: "agent-workspace/CLAUDE.md", twins: ["AGENTS.md"] },
];

const check = process.argv.includes("--check");
let stale = 0;

for (const { src, twins } of PAIRS) {
  if (!existsSync(src)) throw new Error(`missing entry file: ${src}`);
  const body = BANNER(src) + readFileSync(src, "utf8");
  for (const name of twins) {
    const dest = join(dirname(src), name);
    const current = existsSync(dest) ? readFileSync(dest, "utf8") : null;
    if (current === body) continue;
    if (check) {
      console.error(`stale twin: ${dest}`);
      stale++;
    } else {
      writeFileSync(dest, body);
      console.log(`wrote ${dest}`);
    }
  }
}
if (check) {
  console.log(stale ? `${stale} stale twin(s)` : "twins in sync");
  process.exit(stale ? 1 : 0);
}
