/** Records live playback for motion QA and saves frames at intervals. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("shots/video", { recursive: true });
const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const ctx = await browser.newContext({
  viewport: { width: 1242, height: 822 },
  deviceScaleFactor: 1,
  recordVideo: { dir: "shots/video", size: { width: 1242, height: 822 } },
});
const page = await ctx.newPage();
await page.goto("http://localhost:5183/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__papsukkalReady === true);
await page.waitForTimeout(25000);
await ctx.close();
await browser.close();
console.log("video recorded");
