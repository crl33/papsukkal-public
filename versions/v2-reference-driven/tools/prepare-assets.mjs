/**
 * Offline asset preparation (development-time only — nothing here runs on
 * the public site). From the reference photograph it produces:
 *
 *   public/reference/layers/<id>.png       RGBA MOVING cutout (tight)
 *   public/reference/layers/<id>-bg.png    RGBA STATIC background patch
 *   public/reference/layers/<id>-mask.png  (debug) the tight mask
 *   public/reference/layers/plate.jpg      clean background plate
 *
 * MOVING-UNIT DISCIPLINE (see tools/masks.mjs):
 *  - the MOVING cutout is TIGHT: only the flower's own pixels (unGated
 *    chroma catches dark petals; structural SVG covers stem/center/calyx);
 *  - the STATIC PATCH holds the true background inside the silhouette but
 *    outside the flower — the world around a flower never moves;
 *  - the plate reconstruction region is the SILHOUETTE expanded by a
 *    motion margin (> the runtime displacement clamp), so a sway can only
 *    reveal static patch or reconstructed background — never leftover
 *    flower;
 *  - all masks are softly windowed to their crop rects (image borders
 *    excepted) so feather never clips into a hard edge.
 *
 * Deterministic; sharp only; no AI.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IMG_H, IMG_W, MOTION_MARGIN_PX, riggedLayers } from "./masks.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const refPath = join(root, "public/reference/reference.jpg");
const outDir = join(root, "public/reference/layers");
mkdirSync(outDir, { recursive: true });

const { data: ref } = await sharp(refPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

/** Read a sharp pipeline back as a stride-1 Uint8 plane (sharp may promote channels). */
async function toPlane(pipeline) {
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8Array(IMG_W * IMG_H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * info.channels];
  return out;
}

/** Rasterize an SVG string to a hard Uint8 plane. */
async function rasterSvg(svg) {
  const raw = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const hard = new Uint8Array(IMG_W * IMG_H);
  for (let i = 0; i < IMG_W * IMG_H; i++) {
    hard[i] = Math.min(255, (raw[i * 4] * raw[i * 4 + 3]) / 255);
  }
  return hard;
}

/** n passes of 3×3 max-dilate. */
function dilate(plane, passes) {
  let cur = plane;
  for (let p = 0; p < passes; p++) {
    const next = new Uint8Array(cur);
    for (let y = 1; y < IMG_H - 1; y++) {
      for (let x = 1; x < IMG_W - 1; x++) {
        const i = y * IMG_W + x;
        let mx = cur[i];
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) mx = Math.max(mx, cur[i + dy * IMG_W + dx]);
        next[i] = mx;
      }
    }
    cur = next;
  }
  return cur;
}

/** Calibrated flower-color scores (no value gate — dark petals count). */
function chromaScore(key, R, G, B) {
  if (key === "orange") return R - B + 0.3 * (G - B);
  if (key === "white") {
    const mx = Math.max(R, G, B);
    return mx >= 150 && mx - Math.min(R, G, B) <= 70 ? 255 : -1;
  }
  return Math.max(R - G + 0.45 * (B - G), 2.2 * (B - G)); // magenta
}

/** Apply fadeOut + rect window (shared by silhouette and tight masks). */
function fadeAndWindow(mask, layer) {

  if (layer.fadeOut) {
    const { y0, y1 } = layer.fadeOut;
    for (let y = y0; y < IMG_H; y++) {
      const f = y >= y1 ? 0 : 1 - (y - y0) / (y1 - y0);
      for (let x = 0; x < IMG_W; x++) mask[y * IMG_W + x] = Math.round(mask[y * IMG_W + x] * f);
    }
  }

  const [nx, ny, nw, nh] = layer.rect;
  const rx0 = Math.round(nx * IMG_W);
  const ry0 = Math.round(ny * IMG_H);
  const rx1 = Math.round((nx + nw) * IMG_W) - 1;
  const ry1 = Math.round((ny + nh) * IMG_H) - 1;
  const ramp = 8;
  // edges that coincide with the image border keep their natural alpha —
  // the frame boundary is not a seam
  const clampX0 = rx0 > 0;
  const clampX1 = rx1 < IMG_W - 1;
  const clampY0 = ry0 > 0;
  const clampY1 = ry1 < IMG_H - 1;
  for (let y = 0; y < IMG_H; y++) {
    for (let x = 0; x < IMG_W; x++) {
      const i = y * IMG_W + x;
      if (!mask[i]) continue;
      if (x < rx0 || x > rx1 || y < ry0 || y > ry1) {
        mask[i] = 0;
        continue;
      }
      let d = ramp;
      if (clampX0) d = Math.min(d, x - rx0);
      if (clampX1) d = Math.min(d, rx1 - x);
      if (clampY0) d = Math.min(d, y - ry0);
      if (clampY1) d = Math.min(d, ry1 - y);
      if (d < ramp) mask[i] = Math.round((mask[i] * d) / ramp);
    }
  }
  return mask;
}

/**
 * Build a layer's mask set:
 *   silhouette — plate hole + patch extent (feathered, faded, windowed)
 *   tight      — the moving flower-only cutout (chroma ∪ structural SVG,
 *                closed, feathered, contained within the silhouette)
 *   patch      — silhouette · (1 − dilated tight): static background
 */
async function buildMasks(layer) {
  const silhouetteHard = await rasterSvg(layer.svg);
  const silhouette = fadeAndWindow(
    await toPlane(
      sharp(Buffer.from(silhouetteHard), { raw: { width: IMG_W, height: IMG_H, channels: 1 } }).blur(
        layer.feather ?? 2,
      ),
    ),
    layer,
  );

  if (!layer.tight) {
    return { silhouette, tight: silhouette, patch: null };
  }

  // structural shapes + un-gated chroma inside the silhouette
  const tightHard = layer.tight.svg ? await rasterSvg(layer.tight.svg) : new Uint8Array(IMG_W * IMG_H);
  if (layer.tight.key) {
    const thr = layer.tight.threshold ?? 50;
    for (let i = 0; i < IMG_W * IMG_H; i++) {
      if (silhouetteHard[i] < 24) continue;
      const s = chromaScore(layer.tight.key, ref[i * 4], ref[i * 4 + 1], ref[i * 4 + 2]);
      if (s > thr) tightHard[i] = Math.max(tightHard[i], Math.min(255, (s - thr) * 8));
    }
  }
  const closed = dilate(tightHard, 2); // close pinholes between petal pixels
  const tightSoft = await toPlane(
    sharp(Buffer.from(closed), { raw: { width: IMG_W, height: IMG_H, channels: 1 } }).blur(
      layer.tightFeather ?? 1.4,
    ),
  );
  const tight = new Uint8Array(IMG_W * IMG_H);
  for (let i = 0; i < tight.length; i++) tight[i] = Math.min(tightSoft[i], silhouette[i]);

  // static patch: true background inside the silhouette, clear of the
  // flower's edge band (the plate fill shows through that thin ring)
  const tightWide = await toPlane(
    sharp(Buffer.from(dilate(closed, 2)), { raw: { width: IMG_W, height: IMG_H, channels: 1 } }).blur(1.2),
  );
  const patch = new Uint8Array(IMG_W * IMG_H);
  let any = 0;
  for (let i = 0; i < patch.length; i++) {
    const v = Math.round((silhouette[i] * (255 - tightWide[i])) / 255);
    patch[i] = v;
    if (v > 8) any++;
  }
  return { silhouette, tight, patch: any > 200 ? patch : null };
}

/** Write an RGBA cutout for a layer, cropped to its rect. */
async function writeCutout(layer, mask, suffix = "") {
  const [nx, ny, nw, nh] = layer.rect;
  const x0 = Math.round(nx * IMG_W);
  const y0 = Math.round(ny * IMG_H);
  const w = Math.round(nw * IMG_W);
  const h = Math.round(nh * IMG_H);
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * IMG_W + (x0 + x)) * 4;
      const di = (y * w + x) * 4;
      out[di] = ref[si];
      out[di + 1] = ref[si + 1];
      out[di + 2] = ref[si + 2];
      out[di + 3] = mask[(y0 + y) * IMG_W + (x0 + x)];
    }
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(join(outDir, `${layer.id}${suffix}.png`));
  if (!suffix) {
    await sharp(Buffer.from(mask), { raw: { width: IMG_W, height: IMG_H, channels: 1 } })
      .png()
      .toFile(join(outDir, `${layer.id}-mask.png`));
  }
  console.log(`${layer.id}${suffix}.png  (${w}×${h})`);
}

/**
 * Diffusion inpaint of the plate-reconstruction region: iterative neighbor
 * fill at 1/4 res, smoothing sweeps, upsample, bokeh blur, composite.
 * Restoration, not redesign — behind these flowers the world is defocused,
 * so a diffusion fill is indistinguishable from "what was behind".
 */
async function buildPlate(plateMask) {
  const S = 4;
  const sw = Math.floor(IMG_W / S);
  const sh = Math.floor(IMG_H / S);
  const small = await sharp(refPath).resize(sw, sh).ensureAlpha().raw().toBuffer();
  const smallRes = await sharp(Buffer.from(plateMask), {
    raw: { width: IMG_W, height: IMG_H, channels: 1 },
  })
    .resize(sw, sh)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mch = smallRes.info.channels;
  const smallMask = new Uint8Array(sw * sh);
  for (let i = 0; i < smallMask.length; i++) smallMask[i] = smallRes.data[i * mch];

  const rgb = new Float32Array(sw * sh * 3);
  const known = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    rgb[i * 3] = small[i * 4];
    rgb[i * 3 + 1] = small[i * 4 + 1];
    rgb[i * 3 + 2] = small[i * 4 + 2];
    known[i] = smallMask[i] > 24 ? 0 : 1;
  }

  let remaining = 1;
  let guard = 0;
  while (remaining > 0 && guard++ < 800) {
    remaining = 0;
    const newlyKnown = [];
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = y * sw + x;
        if (known[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= sw || yy >= sh) continue;
          const j = yy * sw + xx;
          if (!known[j]) continue;
          r += rgb[j * 3]; g += rgb[j * 3 + 1]; b += rgb[j * 3 + 2]; n++;
        }
        if (n > 0) {
          rgb[i * 3] = r / n; rgb[i * 3 + 1] = g / n; rgb[i * 3 + 2] = b / n;
          newlyKnown.push(i);
        } else {
          remaining++;
        }
      }
    }
    for (const i of newlyKnown) known[i] = 1;
  }

  for (let pass = 0; pass < 60; pass++) {
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const i = y * sw + x;
        if (smallMask[i] <= 24) continue;
        for (let c = 0; c < 3; c++) {
          rgb[i * 3 + c] =
            (rgb[(i - 1) * 3 + c] + rgb[(i + 1) * 3 + c] + rgb[(i - sw) * 3 + c] + rgb[(i + sw) * 3 + c]) / 4;
        }
      }
    }
  }

  const fillSmall = Buffer.alloc(sw * sh * 3);
  for (let i = 0; i < sw * sh * 3; i++) fillSmall[i] = Math.max(0, Math.min(255, rgb[i]));

  const fillFull = await sharp(fillSmall, { raw: { width: sw, height: sh, channels: 3 } })
    .resize(IMG_W, IMG_H)
    .blur(6)
    .raw()
    .toBuffer();

  const plate = Buffer.alloc(IMG_W * IMG_H * 3);
  for (let i = 0; i < IMG_W * IMG_H; i++) {
    const a = plateMask[i] / 255;
    for (let c = 0; c < 3; c++) {
      plate[i * 3 + c] = Math.round(ref[i * 4 + c] * (1 - a) + fillFull[i * 3 + c] * a);
    }
  }
  await sharp(plate, { raw: { width: IMG_W, height: IMG_H, channels: 3 } })
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
    .toFile(join(outDir, "plate.jpg"));
  console.log("plate.jpg");
}

/* ------------------------------------------------------------------ */

const union = new Uint8Array(IMG_W * IMG_H);
for (const layer of riggedLayers) {
  const { silhouette, tight, patch } = await buildMasks(layer);
  await writeCutout(layer, tight);
  if (patch) await writeCutout(layer, patch, "-bg");
  for (let i = 0; i < union.length; i++) union[i] = Math.max(union[i], silhouette[i]);
}

// plate-reconstruction region: cutout union EXPANDED by the motion margin —
// blur then remap so the expanded region saturates to full replacement
const expanded = await toPlane(
  sharp(Buffer.from(union), { raw: { width: IMG_W, height: IMG_H, channels: 1 } }).blur(
    MOTION_MARGIN_PX / 2,
  ),
);
// gentle shoulder: the fill blends into the original over a wide band, so
// the reconstruction boundary can never read as a tonal arc when a sway
// exposes it
const plateMask = new Uint8Array(IMG_W * IMG_H);
for (let i = 0; i < plateMask.length; i++) {
  plateMask[i] = Math.min(255, Math.round(expanded[i] * 2.2));
}
await sharp(Buffer.from(plateMask), { raw: { width: IMG_W, height: IMG_H, channels: 1 } })
  .png()
  .toFile(join(outDir, "plate-mask.png"));
await buildPlate(plateMask);
console.log("done");
