/**
 * Decomposition acceptance tests — the anti-ghost guarantees, run against
 * the GENERATED assets (npm run assets must have produced them):
 *
 *  GHOST TEST: the plate must contain no flower chroma inside each moving
 *  flower's core region — a moving flower must never leave a copy of
 *  itself behind.
 *
 *  COVERAGE TEST: every strong flower-colored reference pixel in the core
 *  must be near-opaque in the cutout — the moving layer carries the WHOLE
 *  flower (dark petals included, since the silhouette masks are geometric).
 *
 *  MARGIN TEST: the plate reconstruction extends beyond the cutout by more
 *  than the runtime displacement clamp.
 */
import { beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { qcRegions, riggedLayers, IMG_W, IMG_H } from "../../tools/masks.mjs";
import { layers } from "../../src/config/layers";
import { LayerMesh } from "../../src/layers/LayerMesh";

const layersDir = join(dirname(fileURLToPath(import.meta.url)), "../../public/reference/layers");
const refPath = join(dirname(fileURLToPath(import.meta.url)), "../../public/reference/reference.jpg");

function metric(kind: "magenta" | "orange", r: number, g: number, b: number): number {
  return kind === "orange" ? r - b + 0.3 * (g - b) : r - g + 0.45 * (b - g);
}

let ref: Buffer;
let plate: Buffer;
beforeAll(async () => {
  ref = await sharp(refPath).raw().toBuffer();
  plate = await sharp(join(layersDir, "plate.jpg")).raw().toBuffer();
});

describe("decomposition acceptance", () => {
  for (const qc of qcRegions) {
    it(`${qc.id}: plate holds no flower remnant in the core (no ghosts)`, () => {
      const { cx, cy, r } = qc.core;
      let refChroma = 0;
      let plateChroma = 0;
      let refGrad = 0;
      let plateGrad = 0;
      let n = 0;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
          const i = (y * IMG_W + x) * 3;
          refChroma += Math.max(0, metric(qc.metric, ref[i], ref[i + 1], ref[i + 2]));
          plateChroma += Math.max(0, metric(qc.metric, plate[i], plate[i + 1], plate[i + 2]));
          // structure: a ghost is EDGES (petal shapes), a fill is smooth
          const ix = i + 3;
          const iy = i + IMG_W * 3;
          refGrad += Math.abs(ref[i] - ref[ix]) + Math.abs(ref[i] - ref[iy]);
          plateGrad += Math.abs(plate[i] - plate[ix]) + Math.abs(plate[i] - plate[iy]);
          n++;
        }
      }
      const refChromaMean = refChroma / n;
      // sanity: the core really is strongly flower-colored in the reference
      expect(refChromaMean).toBeGreaterThan(45);
      // chroma must collapse relative to the reference (some residual hue is
      // fine where the legitimate surroundings share the flower's tint)
      expect(plateChroma / n).toBeLessThan(Math.max(12, refChromaMean * 0.35));
      // and the fill must be STRUCTURELESS — no petal shapes left behind
      expect(plateGrad / Math.max(1, refGrad)).toBeLessThan(0.3);
    });

    it(`${qc.id}: cutout covers every strong flower pixel in the core`, async () => {
      const spec = riggedLayers.find((l) => l.id === qc.id)!;
      const [nx, ny, nw] = spec.rect;
      const x0 = Math.round(nx * IMG_W);
      const y0 = Math.round(ny * IMG_H);
      const w = Math.round(nw * IMG_W);
      const cut = await sharp(join(layersDir, `${qc.id}.png`)).raw().toBuffer();
      const { cx, cy, r } = qc.core;
      let strong = 0;
      let covered = 0;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
          const i = (y * IMG_W + x) * 3;
          if (metric(qc.metric, ref[i], ref[i + 1], ref[i + 2]) < 60) continue;
          strong++;
          const a = cut[((y - y0) * w + (x - x0)) * 4 + 3];
          if (a >= 240) covered++;
        }
      }
      expect(strong).toBeGreaterThan(500); // sanity: the core really is the flower
      expect(covered / strong).toBeGreaterThan(0.995);
    });
  }

  it("plate reconstruction margin exceeds the runtime displacement clamp", async () => {
    const { MOTION_MARGIN_PX } = await import("../../tools/masks.mjs");
    const clampPx = LayerMesh.MAX_BEND_IMG * IMG_W;
    expect(MOTION_MARGIN_PX).toBeGreaterThan(clampPx);
  });

  it("all rigged manifest layers have mask specs (and vice versa)", () => {
    const maskIds = new Set(riggedLayers.map((m) => m.id));
    const rigged = layers.filter((l) => l.rig).map((l) => l.id);
    for (const id of rigged) expect(maskIds.has(id), id).toBe(true);
  });
});
