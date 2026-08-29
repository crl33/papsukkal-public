import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--use-angle=default"] });
const sizeArg = process.argv[2] ?? "1920x1080x2";
const [w, h, dprS] = sizeArg.split("x").map(Number);
const urlArg = process.argv[3] ?? "http://localhost:5183/";
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dprS });
await page.goto(urlArg, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__papsukkalReady === true);
await page.waitForTimeout(1500);
const stats = await page.evaluate(async () => {
  const app = window.__app;
  const frames = [];
  let last = performance.now();
  await new Promise((resolve) => {
    let n = 0;
    const loop = () => {
      const now = performance.now();
      frames.push(now - last);
      last = now;
      if (++n < 240) requestAnimationFrame(loop);
      else resolve();
    };
    requestAnimationFrame(loop);
  });
  frames.sort((a, b) => a - b);
  const avg = frames.reduce((s, v) => s + v, 0) / frames.length;
  const info = app.renderer.info;
  return {
    fpsAvg: +(1000 / avg).toFixed(1),
    p95ms: +frames[Math.floor(frames.length * 0.95)].toFixed(2),
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    programs: info.programs.length,
    quality: app.quality.name,
    plants: app.sim.plantCount,
  };
});
console.log(JSON.stringify(stats, null, 2));
await browser.close();
