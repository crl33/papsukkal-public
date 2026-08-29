/** Records 20s of V2 live playback for temporal QA. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("shots/video", { recursive: true });
const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const ctx = await browser.newContext({
  viewport: { width: 1242, height: 822 },
  recordVideo: { dir: "shots/video", size: { width: 1242, height: 822 } },
});
const page = await ctx.newPage();
await page.goto("http://localhost:5193/?bare=1", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__papsukkalReady === true);
await page.waitForTimeout(20000);
await ctx.close();
await browser.close();
console.log("recorded");
