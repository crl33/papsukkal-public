/**
 * Deterministic screenshot capture for the visual-comparison loop.
 * Requires the dev server (npm run dev) or preview server to be running.
 *
 *   node scripts/shots.mjs [--url http://localhost:5173] [--t 6] [--out shots]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const get = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : dflt;
};

const baseUrl = get("--url", "http://localhost:5183");
const t = get("--t", "6");
const outDir = resolve(get("--out", "shots"));
mkdirSync(outDir, { recursive: true });

// reference aspect first (1.51:1), then the responsive matrix
const sizes = [
  ["ref-aspect", 1242, 822],
  ["1920x1080", 1920, 1080],
  ["1440x900", 1440, 900],
  ["1366x768", 1366, 768],
  ["1024x768", 1024, 768],
  ["430x932", 430, 932],
  ["390x844", 390, 844],
];

const only = get("--only", null);

const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const errors = [];
for (const [name, width, height] of sizes) {
  if (only && name !== only) continue;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[${name}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[${name}] pageerror: ${err.message}`));
  await page.goto(`${baseUrl}/?det=1&t=${t}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__papsukkalReady === true, { timeout: 15000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`captured ${name}`);
  await page.close();
}
await browser.close();

if (errors.length) {
  console.error("\nConsole errors during capture:");
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
