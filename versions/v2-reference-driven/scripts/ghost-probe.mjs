/** Forces every rigged layer to max deflection and captures both poses. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1242, height: 822 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:5193/?det=1&t=0&bare=1", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__papsukkalReady === true);
for (const dir of [1, -1]) {
  await page.evaluate((d) => {
    const app = window.__app;
    for (const lm of app.layerMeshes) {
      if (lm.def.rig) lm.forceBend(0.013 * d, 0.002 * d, 0.05 * d);
    }
    app.renderFrame();
  }, dir);
  await page.waitForTimeout(80);
  await page.screenshot({ path: `shots/pose${dir > 0 ? "pos" : "neg"}.png` });
  console.log("captured pose", dir);
}
await browser.close();
