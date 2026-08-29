import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __papsukkalReady?: boolean;
    __advanceTo?: (t: number) => void;
    __app?: unknown;
  }
}

async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

/** Average luma + colorfulness of the rendered canvas. */
async function canvasStats(page: Page) {
  return page.evaluate(() => {
    // re-render synchronously so the drawing buffer is valid for drawImage
    // (preserveDrawingBuffer is off for performance)
    const app = window.__app as { post: { composer: { render(): void } } };
    app.post.composer.render();
    const src = document.querySelector("#scene canvas") as HTMLCanvasElement;
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.drawImage(src, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data;
    let luma = 0;
    let sat = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255;
      const gg = d[i + 1] / 255;
      const b = d[i + 2] / 255;
      luma += 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      sat += Math.max(r, gg, b) - Math.min(r, gg, b);
    }
    const n = d.length / 4;
    return { luma: luma / n, sat: sat / n };
  });
}

test("deterministic scene renders without errors and with real content", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/?det=1&t=6");
  await page.waitForFunction(() => window.__papsukkalReady === true);
  await page.waitForTimeout(300);

  const stats = await canvasStats(page);
  // not a black screen, not a white screen, visibly colorful
  expect(stats.luma).toBeGreaterThan(0.02);
  expect(stats.luma).toBeLessThan(0.6);
  expect(stats.sat).toBeGreaterThan(0.05);
  expect(errors).toEqual([]);
});

test("live mode animates the meadow", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/");
  await page.waitForFunction(() => window.__papsukkalReady === true);
  const a = await page.screenshot();
  await page.waitForTimeout(1400);
  const b = await page.screenshot();
  expect(a.equals(b)).toBe(false);
  expect(errors).toEqual([]);
});

test("reduced motion still renders the scene, nearly still", async ({ page, browser: _b }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await collectErrors(page);
  await page.goto("/");
  await page.waitForFunction(() => window.__papsukkalReady === true);
  await page.waitForTimeout(300);
  const stats = await canvasStats(page);
  expect(stats.sat).toBeGreaterThan(0.05); // scene is intact
  expect(errors).toEqual([]);

  const intensity = await page.evaluate(
    () => (window.__app as { wind: { intensity: number } }).wind.intensity,
  );
  expect(intensity).toBeLessThan(0.2);
});

test.describe("responsive framing", () => {
  for (const [w, h] of [
    [1920, 1080],
    [1366, 768],
    [1024, 768],
    [430, 932],
    [390, 844],
  ] as const) {
    test(`${w}x${h} keeps the scene composed and error-free`, async ({ page }) => {
      const errors = await collectErrors(page);
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/?det=1&t=6");
      await page.waitForFunction(() => window.__papsukkalReady === true);
      await page.waitForTimeout(300);
      const stats = await canvasStats(page);
      expect(stats.luma).toBeGreaterThan(0.02);
      expect(stats.sat).toBeGreaterThan(0.04);
      expect(errors).toEqual([]);
    });
  }
});
