/**
 * Motion review probe: steps the deterministic simulation through a set of
 * times and captures frames, so gust propagation, per-plant variety and
 * long-run stability can be inspected frame by frame.
 *
 *   node scripts/motion-probe.mjs [--url http://localhost:5183]
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
const outDir = resolve(get("--out", "shots/motion"));
mkdirSync(outDir, { recursive: true });

const times = (get("--times", "6,6.4,6.8,7.2,8,9,10,12,30,120,600") ?? "")
  .split(",")
  .map(Number);

const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1242, height: 822 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
await page.goto(`${baseUrl}/?det=1&t=${times[0]}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__papsukkalReady === true, { timeout: 15000 });

for (const t of times) {
  await page.evaluate((tt) => window.__advanceTo(tt), t);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${outDir}/t${String(t).replace(".", "_")}.png` });
  console.log(`captured t=${t}`);
}

// numeric stability probe: inspect simulation output for NaN / runaway values
const sim = await page.evaluate(() => {
  const app = window.__app;
  const out = app.sim.output;
  let maxBend = 0;
  let bad = 0;
  for (let i = 0; i < app.sim.plantCount * 4; i += 4) {
    const b = Math.hypot(out[i], out[i + 1]);
    if (!Number.isFinite(b)) bad++;
    maxBend = Math.max(maxBend, b);
  }
  return { plants: app.sim.plantCount, maxBend, bad, time: app.sim.time };
});
console.log("sim state after long run:", JSON.stringify(sim));
await browser.close();

if (errors.length || sim.bad > 0) {
  console.error("problems:", errors, sim.bad);
  process.exit(1);
}
