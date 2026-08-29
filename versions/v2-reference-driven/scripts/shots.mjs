/** Deterministic V2 captures. Usage: node scripts/shots.mjs [--times 6,8,10] */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const args = process.argv.slice(2);
const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const times = get("--times", get("--t", "6")).split(",").map(Number);
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1242, height: 822 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://localhost:5193/?det=1&t=${times[0]}&bare=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__papsukkalReady === true);
for (const t of times) {
  await page.evaluate((tt) => window.__advanceTo(tt), t);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `shots/t${String(t).replace(".", "_")}.png` });
  console.log("captured t=" + t);
}
await browser.close();
if (errors.length) { console.error(errors); process.exit(1); }
