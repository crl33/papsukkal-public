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
 * The principal movers, expanded after the one-flower proof passed
 * (spec §21 phases 9–10): both cosmos, the white daisy, both orange
 * daisies, and the three big foreground blur masses (near-field drift).
 * The far background stays atmospheric and still (spec §16) — its blur
 * hides nothing, so motion there risks more than it adds.
 *
 * windPos values reuse the V1 composition's world coordinates for each
 * flower, so the shared field's gust fronts cross V2's layers with the
 * same spatial timing V1's meadow had.
 */
export const layers: LayerDef[] = [
  {
    id: "plate",
    file: "reference/layers/plate.jpg",
    rect: [0, 0, 1, 1],
    order: 0,
  },
  {
    id: "cosmos-2",
    file: "reference/layers/cosmos-2.png",
    rect: [0.395, 0.27, 0.175, 0.4],
    order: 8,
    rig: {
      root: [0.437, 0.617],
      head: [0.4734, 0.3723],
      headRadius: 0.074,
      mechanics: "cosmosHero",
      windPos: [-0.02, -1.26, 0.55],
      bendScale: 0.48,
      rotGain: 0.5,
    },
  },
  {
    id: "daisy-white",
    file: "reference/layers/daisy-white.png",
    rect: [0.505, 0.29, 0.085, 0.155],
    order: 9,
    rig: {
      root: [0.54, 0.415],
      head: [0.545, 0.3345],
      headRadius: 0.034,
      mechanics: "daisySmall",
      windPos: [0.03, -1.3, 0.55],
      bendScale: 0.42,
      rotGain: 0.4,
    },
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
  {
    id: "orange-ur",
    file: "reference/layers/orange-ur.png",
    rect: [0.77, 0.2, 0.135, 0.235],
    order: 11,
    rig: {
      root: [0.808, 0.43],
      head: [0.8285, 0.27],
      headRadius: 0.061,
      mechanics: "daisyOrange",
      windPos: [0.26, -1.36, 0.62],
      bendScale: 0.45,
      rotGain: 0.45,
    },
  },
  {
    id: "orange-lr",
    file: "reference/layers/orange-lr.png",
    rect: [0.815, 0.53, 0.125, 0.2],
    order: 12,
    rig: {
      root: [0.858, 0.71],
      head: [0.875, 0.5974],
      headRadius: 0.056,
      mechanics: "daisyOrange",
      windPos: [0.35, -1.58, 0.5],
      bendScale: 0.42,
      rotGain: 0.4,
    },
  },
  /* broadened participation: clusters, accents, nodding buds — the meadow
     itself is alive, not just two flowers. Amplitudes stay whisper-level. */
  {
    id: "bud-pair",
    file: "reference/layers/bud-pair.png",
    rect: [0.47, 0.13, 0.08, 0.41],
    order: 7,
    rig: {
      root: [0.516, 0.515],
      head: [0.508, 0.165],
      headRadius: 0.022,
      mechanics: "bud",
      windPos: [-0.01, -1.37, 0.75],
      bendScale: 0.35,
      rotGain: 0.3,
    },
  },
  {
    id: "red-spray",
    file: "reference/layers/red-spray.png",
    rect: [0.27, 0.385, 0.235, 0.32],
    order: 13,
    rig: {
      root: [0.363, 0.7],
      head: [0.352, 0.502],
      headRadius: 0.09,
      mechanics: "microSprig",
      windPos: [-0.11, -1.22, 0.42],
      bendScale: 0.3,
      rotGain: 0,
    },
  },
  {
    id: "daisy-pair",
    file: "reference/layers/daisy-pair.png",
    rect: [0.585, 0.405, 0.08, 0.175],
    order: 14,
    rig: {
      root: [0.617, 0.575],
      head: [0.632, 0.452],
      headRadius: 0.026,
      mechanics: "daisySmall",
      windPos: [0.11, -1.42, 0.42],
      bendScale: 0.35,
      rotGain: 0.3,
    },
  },
  {
    id: "yellow-edge",
    file: "reference/layers/yellow-edge.png",
    rect: [0.672, 0.352, 0.115, 0.15],
    order: 15,
    rig: {
      root: [0.699, 0.49],
      head: [0.715, 0.407],
      headRadius: 0.043,
      mechanics: "daisyOrange",
      windPos: [0.19, -1.5, 0.5],
      bendScale: 0.35,
      rotGain: 0.35,
    },
  },
  {
    id: "violet-c",
    file: "reference/layers/violet-c.png",
    rect: [0.45, 0.695, 0.125, 0.185],
    order: 16,
    rig: {
      root: [0.506, 0.862],
      head: [0.5056, 0.7786],
      headRadius: 0.05,
      mechanics: "foregroundMass",
      windPos: [0.0, -0.75, 0.4],
      bendScale: 0.4,
      rotGain: 0,
    },
  },
  /* near-field blur masses: slow, soft, low-amplitude drift (spec §15) */
  {
    id: "fg-red-left",
    file: "reference/layers/fg-red-left.png",
    rect: [0.112, 0.428, 0.242, 0.268],
    order: 20,
    rig: {
      root: [0.2335, 0.675],
      head: [0.2335, 0.5633],
      headRadius: 0.1,
      mechanics: "foregroundMass",
      windPos: [-0.07, -0.42, 0.5],
      bendScale: 0.6,
      rotGain: 0,
    },
  },
  {
    id: "fg-crimson-c",
    file: "reference/layers/fg-crimson-c.png",
    rect: [0.42, 0.655, 0.3, 0.295],
    order: 21,
    rig: {
      root: [0.575, 0.945],
      head: [0.5749, 0.7908],
      headRadius: 0.12,
      mechanics: "foregroundMass",
      windPos: [0.01, -0.3, 0.45],
      bendScale: 0.62,
      rotGain: 0,
    },
  },
  {
    id: "fg-yellow-br",
    file: "reference/layers/fg-yellow-br.png",
    rect: [0.685, 0.72, 0.257, 0.28],
    order: 22,
    rig: {
      root: [0.805, 0.995],
      head: [0.8051, 0.8589],
      headRadius: 0.11,
      mechanics: "foregroundMass",
      windPos: [0.14, -0.36, 0.45],
      bendScale: 0.6,
      rotGain: 0,
    },
  },
];

/** Deterministic wind seed (matches V1's default personality). */
export const WIND_SEED = 1337;
