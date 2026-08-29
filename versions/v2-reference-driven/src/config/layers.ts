/**
 * The layer manifest — V2's equivalent of a composition file.
 *
 * Every layer is a rectangle of the reference photograph (normalized image
 * coordinates, x right / y DOWN, of the 1242×822 source). Static layers are
 * drawn as-is; rigged layers carry the animation skeleton: a root anchor
 * (fixed), a head center (moves with the breeze) and mapping constants that
 * translate the copied V1 plant-oscillator output (meters of stem-tip
 * deflection) into subtle image-space motion.
 *
 * Assets are produced offline by tools/prepare-assets.mjs from mask specs in
 * tools/masks.mjs — the reference pixels are authoritative; nothing here
 * generates appearance.
 */

export const IMG_W = 1242;
export const IMG_H = 822;
export const IMG_ASPECT = IMG_W / IMG_H;

export interface LayerRig {
  /** Fixed anchor (image coords) — zero motion here, ever. */
  root: [number, number];
  /** Flower-head center (image coords) — receives the full bend. */
  head: [number, number];
  /** Head radius, normalized by image WIDTH. */
  headRadius: number;
  /** Mechanics preset key from the copied V1 MECHANICS table. */
  mechanics: string;
  /** V1-world wind-sampling position + plant height: [x, z, height]. */
  windPos: [number, number, number];
  /** Image units of displacement per meter of simulated deflection. */
  bendScale: number;
  /** Head rotation (radians) per meter of simulated x-deflection. */
  rotGain: number;
}

export interface LayerDef {
  id: string;
  /** File under public/reference/ */
  file: string;
  /** Crop rect [x, y, w, h] in normalized image coords. */
  rect: [number, number, number, number];
  /** Painter's order, back → front. */
  order: number;
  rig?: LayerRig;
}

/**
 * v0 — one-flower proof (spec §22): the clean plate plus the hero magenta
 * cosmos with its stem. Expand only after the zero-motion gate passes.
 */
export const layers: LayerDef[] = [
  {
    id: "plate",
    file: "reference/layers/plate.jpg",
    rect: [0, 0, 1, 1],
    order: 0,
  },
  {
    id: "hero-cosmos",
    file: "reference/layers/hero-cosmos.png",
    rect: [0.115, 0.145, 0.28, 0.535],
    order: 10,
    rig: {
      root: [0.281, 0.548],
      head: [0.247, 0.288],
      headRadius: 0.092,
      mechanics: "cosmosHero",
      windPos: [-0.17, -1.15, 0.61],
      // full physical mapping would be 1/frameWidth(1.15m) ≈ 1.48 img/m;
      // V2 aims for "quietly alive" — roughly a third of physical amplitude
      bendScale: 0.5,
      rotGain: 0.55,
    },
  },
];

/** Deterministic wind seed (matches V1's default personality). */
export const WIND_SEED = 1337;
