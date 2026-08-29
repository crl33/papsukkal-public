/**
 * Offline asset preparation (development-time only — nothing here runs on
 * the public site). From the reference photograph it produces:
 *
 *   public/reference/layers/<id>.png   RGBA cutout per rigged layer
 *   public/reference/layers/plate.jpg  clean background plate (disoccluded)
 *   public/reference/layers/<id>-mask.png  (debug) the mask itself
 *
 * Pipeline per layer: SVG shapes ∪ chroma key → dilate → feather → cutout.
 * Plate: masked regions filled by iterative neighbor diffusion at 1/4 res,
 * blurred to match the local bokeh, composited under the original — i.e.
 * restoration, not redesign (spec §9). Deterministic; no AI.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IMG_H, IMG_W, riggedLayers } from "./masks.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const refPath = join(root, "public/reference/reference.jpg");
const outDir = join(root, "public/reference/layers");
mkdirSync(outDir, { recursive: true });

const { data: ref } = await sharp(refPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

/** Build one layer's mask (Uint8, 0..255, full-frame). */
async function buildMask(layer) {
  // SVG shapes
  const svgRaw = await sharp(Buffer.from(layer.svg)).ensureAlpha().raw().toBuffer();
  const mask = new Uint8Array(IMG_W * IMG_H);
  for (let i = 0; i < IMG_W * IMG_H; i++) {
    // white shapes on transparent: use alpha·luminance
    mask[i] = Math.min(255, (svgRaw[i * 4] * svgRaw[i * 4 + 3]) / 255);
  }

  // chroma key inside ROI (skipped for SVG-only layers)
  if (layer.roi && layer.key) {
    const { cx, cy, rx, ry } = layer.roi;
    for (let y = Math.max(0, cy - ry); y <= Math.min(IMG_H - 1, cy + ry); y++) {
      for (let x = Math.max(0, cx - rx); x <= Math.min(IMG_W - 1, cx + rx); x++) {
        const ex = (x - cx) / rx;
        const ey = (y - cy) / ry;
        if (ex * ex + ey * ey > 1) continue;
        const i = (y * IMG_W + x) * 4;
        const R = ref[i];
        const G = ref[i + 1];
        const B = ref[i + 2];
        const value = Math.max(R, G, B);
        const rr = Math.sqrt(ex * ex + ey * ey);

        let score;
        let thr;
        if (layer.key === "white") {
          // bright + low chroma spread = white petals
          const spread = value - Math.min(R, G, B);
          const g = layer.whiteGate;
          score = value >= g.minValue && spread <= g.maxChromaSpread ? 255 : 0;
          thr = 1;
          if (rr > 0.85) score = 0;
        } else {
          score =
            layer.key === "orange"
              ? R - B + 0.3 * (G - B)
              : R - G + 0.45 * (B - G);
          // radial falloff: demand a stronger score toward the ROI edge
          thr = layer.chromaThreshold + Math.max(0, rr - 0.72) * 220;
          if (layer.valueGate && value < layer.valueGate.minValue) {
            thr = Math.max(thr, layer.valueGate.darkThreshold);
          }
        }
        if (score > thr) {
          const idx = y * IMG_W + x;
          mask[idx] = Math.max(mask[idx], Math.min(255, (score - thr) * 8));
        }
      }
    }
  }

  // dilate (2 passes of 3×3 max) — closes pinholes, grows a safety margin
  let cur = mask;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(cur);
    for (let y = 1; y < IMG_H - 1; y++) {
      for (let x = 1; x < IMG_W - 1; x++) {
        const idx = y * IMG_W + x;
        let mx = cur[idx];
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) mx = Math.max(mx, cur[idx + dy * IMG_W + dx]);
        next[idx] = mx;
      }
    }
    cur = next;
  }

  // feather — NOTE: sharp promotes 1-channel raw to 3 channels through
  // blur(), so de-interleave by the reported stride
  const feathered = await sharp(Buffer.from(cur), {
    raw: { width: IMG_W, height: IMG_H, channels: 1 },
  })
    .blur(layer.feather ?? 1.6)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = feathered.info.channels;
  const out = new Uint8Array(IMG_W * IMG_H);
  for (let i = 0; i < out.length; i++) out[i] = feathered.data[i * ch];

  // fade the mask out where the stem slips behind foreground blur
  if (layer.fadeOut) {
    const { y0, y1 } = layer.fadeOut;
    for (let y = y0; y < IMG_H; y++) {
      const f = y >= y1 ? 0 : 1 - (y - y0) / (y1 - y0);
      for (let x = 0; x < IMG_W; x++) out[y * IMG_W + x] = Math.round(out[y * IMG_W + x] * f);
    }
  }
  return out;
}

/** Write the RGBA cutout for a layer, cropped to its rect. */
async function writeCutout(layer, mask) {
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
    .toFile(join(outDir, `${layer.id}.png`));
  await sharp(Buffer.from(mask), { raw: { width: IMG_W, height: IMG_H, channels: 1 } })
    .png()
    .toFile(join(outDir, `${layer.id}-mask.png`));
  console.log(`${layer.id}.png  (${w}×${h})`);
}

/**
 * Diffusion inpaint: at 1/4 resolution, repeatedly fill masked pixels from
 * the average of already-known neighbors, then smooth, upsample and blur —
 * behind these defocused flowers the surroundings are bokeh, so a diffusion
 * fill is visually indistinguishable from "what was behind".
 */
async function buildPlate(unionMask) {
  const S = 4;
  const sw = Math.floor(IMG_W / S);
  const sh = Math.floor(IMG_H / S);
  const small = await sharp(refPath).resize(sw, sh).ensureAlpha().raw().toBuffer();
  const smallMaskRes = await sharp(Buffer.from(unionMask), {
    raw: { width: IMG_W, height: IMG_H, channels: 1 },
  })
    .resize(sw, sh)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mch = smallMaskRes.info.channels;
  const smallMask = new Uint8Array(sw * sh);
  for (let i = 0; i < smallMask.length; i++) smallMask[i] = smallMaskRes.data[i * mch];

  const rgb = new Float32Array(sw * sh * 3);
  const known = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    rgb[i * 3] = small[i * 4];
    rgb[i * 3 + 1] = small[i * 4 + 1];
    rgb[i * 3 + 2] = small[i * 4 + 2];
    known[i] = smallMask[i] > 24 ? 0 : 1;
  }

  // flood-fill unknown region from known neighbors
  let remaining = 1;
  let guard = 0;
  while (remaining > 0 && guard++ < 500) {
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

  // smoothing sweeps inside the filled region
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

  // upsample the fill, soften to local bokeh, composite under the original
  const fillFull = await sharp(fillSmall, { raw: { width: sw, height: sh, channels: 3 } })
    .resize(IMG_W, IMG_H)
    .blur(6)
    .raw()
    .toBuffer();

  const plate = Buffer.alloc(IMG_W * IMG_H * 3);
  for (let i = 0; i < IMG_W * IMG_H; i++) {
    const a = unionMask[i] / 255;
    for (let c = 0; c < 3; c++) {
      plate[i * 3 + c] = Math.round(ref[i * 4 + c] * (1 - a) + fillFull[i * 3 + c] * a);
    }
  }
  await sharp(plate, { raw: { width: IMG_W, height: IMG_H, channels: 3 } })
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
    .toFile(join(outDir, "plate.jpg"));
  console.log("plate.jpg");
}

const union = new Uint8Array(IMG_W * IMG_H);
for (const layer of riggedLayers) {
  const mask = await buildMask(layer);
  await writeCutout(layer, mask);
  for (let i = 0; i < union.length; i++) union[i] = Math.max(union[i], mask[i]);
}
await buildPlate(union);
console.log("done");
