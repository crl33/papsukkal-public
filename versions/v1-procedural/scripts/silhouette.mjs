/**
 * DEV-ONLY silhouette gate (objective 1): compares a REGION of the reference
 * photograph against the same region of the render.
 *
 *   node scripts/silhouette.mjs hero        # named region
 *   node scripts/silhouette.mjs --list
 *
 * Outputs into shots/silhouette/<name>/:
 *   pair.png      reference | render, side by side
 *   gray.png      both desaturated (Gate A / Gate E)
 *   edges.png     reference edges (magenta) over render edges (green)
 *   mass.png      both heavily blurred (Gate D — broad color-mass check)
 *
 * Reference lives in dev-assets/reference.jpg (gitignored — art-direction
 * source, never shipped).
 */
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const REF = "dev-assets/reference.jpg";
const MISSING_REF = `missing ${REF} (gitignored by decision 0007, and this script must run
from versions/v1-procedural/).

It is byte-identical to the copy committed under V2, so:

  mkdir -p versions/v1-procedural/dev-assets
  cp versions/v2-reference-driven/public/reference/reference.jpg \\
     versions/v1-procedural/dev-assets/reference.jpg

See agent-workspace/20-visual-gates/how-to-run.md.`;
const RENDER = "shots/ref-aspect.png";

/** Regions in reference pixels (1242×822): [x, y, w, h] */
const REGIONS = {
  hero: [150, 120, 380, 340],
  cosmos2: [455, 215, 300, 260],
  orangeUR: [900, 130, 300, 250],
  foreground: [0, 534, 1242, 288],
  background: [0, 0, 1242, 290],
  midground: [180, 330, 700, 330],
  full: [0, 0, 1242, 822],
};

const name = process.argv[2] ?? "hero";
if (name === "--list") {
  console.log(Object.keys(REGIONS).join("\n"));
  process.exit(0);
}
const rect = REGIONS[name];
if (!rect) throw new Error(`unknown region: ${name} (try --list)`);
if (!existsSync(REF)) throw new Error(MISSING_REF);

const outDir = join("shots/silhouette", name);
mkdirSync(outDir, { recursive: true });
const [x, y, w, h] = rect;
const crop = { left: x, top: y, width: w, height: h };

const ref = sharp(REF).extract(crop);
const rnd = sharp(RENDER).extract(crop);

const refBuf = await ref.clone().png().toBuffer();
const rndBuf = await rnd.clone().png().toBuffer();

const stack = async (a, b, file, post = (p) => p) => {
  const canvas = sharp({
    create: { width: w * 2 + 12, height: h, channels: 3, background: { r: 10, g: 10, b: 14 } },
  });
  await post(
    canvas.composite([
      { input: a, left: 0, top: 0 },
      { input: b, left: w + 12, top: 0 },
    ]),
  )
    .png()
    .toFile(join(outDir, file));
};

await stack(refBuf, rndBuf, "pair.png");
await stack(
  await ref.clone().greyscale().normalise().png().toBuffer(),
  await rnd.clone().greyscale().normalise().png().toBuffer(),
  "gray.png",
);
await stack(
  await ref.clone().blur(Math.max(2, w / 22)).png().toBuffer(),
  await rnd.clone().blur(Math.max(2, w / 22)).png().toBuffer(),
  "mass.png",
);

/** Edge overlay: reference edges in magenta, render edges in green. */
const edgeOf = async (pipe) => {
  const { data } = await pipe
    .clone()
    .greyscale()
    .normalise()
    .blur(1.6)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = new Uint8Array(w * h);
  for (let yy = 1; yy < h - 1; yy++) {
    for (let xx = 1; xx < w - 1; xx++) {
      const i = yy * w + xx;
      const gx = data[i + 1] - data[i - 1];
      const gy = data[i + w] - data[i - w];
      out[i] = Math.min(255, Math.hypot(gx, gy) * 2.2);
    }
  }
  return out;
};
const [er, ed] = await Promise.all([edgeOf(ref), edgeOf(rnd)]);
const rgb = Buffer.alloc(w * h * 3);
for (let i = 0; i < w * h; i++) {
  const a = er[i] > 42 ? 255 : 0;
  const b = ed[i] > 42 ? 255 : 0;
  rgb[i * 3] = a;
  rgb[i * 3 + 1] = b;
  rgb[i * 3 + 2] = Math.round(a * 0.75);
}
await sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
  .png()
  .toFile(join(outDir, "edges.png"));

console.log(`silhouette/${name}: pair.png gray.png edges.png mass.png  (${w}×${h})`);
