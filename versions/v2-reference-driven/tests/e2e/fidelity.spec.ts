/**
 * The V2 gate tests (spec §5/§20): with wind at zero the composite must be
 * essentially the reference photograph; with wind on it must move.
 */
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

declare global {
  interface Window {
    __papsukkalReady?: boolean;
    __advanceTo?: (t: number) => void;
  }
}

const refPath = join(dirname(fileURLToPath(import.meta.url)), "../../public/reference/reference.jpg");

async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("ZERO-MOTION GATE: wind=0 composite matches the reference photograph", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/?wind=0&bare=1&det=1&t=0");
  await page.waitForFunction(() => window.__papsukkalReady === true);
  await page.waitForTimeout(400);

  const shot = await page.screenshot();
  const [got, want] = await Promise.all([
    sharp(shot).resize(1242, 822).raw().toBuffer(),
    sharp(refPath).raw().toBuffer(),
  ]);

  let sum = 0;
  let big = 0;
  const n = 1242 * 822 * 3;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(got[i] - want[i]);
    sum += d;
    if (d > 40) big++;
  }
  const mean = sum / n;
  const bigFrac = big / n;
  console.log(`zero-motion fidelity: meanAbsDiff=${mean.toFixed(3)} (0-255), >40 diff frac=${(bigFrac * 100).toFixed(3)}%`);

  // essentially identical: tiny mean error, almost no strongly-off pixels
  expect(mean).toBeLessThan(3.5);
  expect(bigFrac).toBeLessThan(0.004);
  expect(errors).toEqual([]);
});

test("wind moves the photograph (frames differ over time)", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/?bare=1&det=1&t=6");
  await page.waitForFunction(() => window.__papsukkalReady === true);
  await page.waitForTimeout(200);
  const a = await page.screenshot();
  await page.evaluate(() => window.__advanceTo!(8.5));
  await page.waitForTimeout(120);
  const b = await page.screenshot();
  expect(a.equals(b)).toBe(false);
  expect(errors).toEqual([]);
});

test("live mode animates without console errors", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/");
  await page.waitForFunction(() => window.__papsukkalReady === true);
  const a = await page.screenshot();
  await page.waitForTimeout(1500);
  const b = await page.screenshot();
  expect(a.equals(b)).toBe(false);
  expect(errors).toEqual([]);
});

test("reduced motion keeps the artwork, near-still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await collectErrors(page);
  await page.goto("/?bare=1");
  await page.waitForFunction(() => window.__papsukkalReady === true);
  await page.waitForTimeout(300);
  const shot = await page.screenshot();
  const got = await sharp(shot).resize(1242, 822).raw().toBuffer();
  const want = await sharp(refPath).raw().toBuffer();
  let sum = 0;
  const n = 1242 * 822 * 3;
  for (let i = 0; i < n; i++) sum += Math.abs(got[i] - want[i]);
  expect(sum / n).toBeLessThan(6); // still essentially the photograph
  expect(errors).toEqual([]);
});
