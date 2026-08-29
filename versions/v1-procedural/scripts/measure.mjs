/** DEV metric: how much bright teal "linework" sits in the midground band,
 * and overall band statistics — reference vs render (Gate E, numerically). */
import sharp from "sharp";
const W = 1242, H = 822;
const BANDS = {
  mid: { x0: 40, x1: 700, y0: 300, y1: 640 },
  low: { x0: 0, x1: 1242, y0: 640, y1: 822 },
  top: { x0: 0, x1: 1242, y0: 0, y1: 250 },
};
async function stats(file, band) {
  const d = await sharp(file).raw().toBuffer();
  let teal = 0, n = 0, lumSum = 0, lumMax = 0;
  const lums = [];
  for (let y = band.y0; y < band.y1; y++) {
    for (let x = band.x0; x < band.x1; x++) {
      const i = (y * W + x) * 3;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lums.push(L);
      lumSum += L; n++;
      if (L > lumMax) lumMax = L;
      if (g > 58 && g > r * 1.5 && g > b * 1.02) teal++;
    }
  }
  lums.sort((a, b) => a - b);
  return {
    tealPct: +((teal / n) * 100).toFixed(2),
    meanLum: +(lumSum / n).toFixed(1),
    p50: +lums[(lums.length * 0.5) | 0].toFixed(1),
    p95: +lums[(lums.length * 0.95) | 0].toFixed(1),
    maxLum: +lumMax.toFixed(1),
  };
}
for (const [name, band] of Object.entries(BANDS)) {
  const r = await stats("dev-assets/reference.jpg", band);
  const m = await stats("shots/ref-aspect.png", band);
  console.log(name.padEnd(4), "ref", JSON.stringify(r), "\n     mine", JSON.stringify(m));
}
