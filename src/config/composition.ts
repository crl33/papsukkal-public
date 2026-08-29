/**
 * Deterministic art-directed composition, transcribed from the reference
 * photograph (docs/visual-reference.md §2–§4). Screen coords are normalized
 * reference-frame positions of each flower HEAD; depth is meters from camera.
 * `sizeFrac` is head diameter as a fraction of reference frame width.
 *
 * Hero placements are hand-authored and MUST NOT be randomized per reload.
 * Supporting vegetation is generated with seeded randomness (see scatter()).
 */

export type SpeciesId =
  | "cosmos"
  | "daisyWhite"
  | "daisyOrange"
  | "redCluster"
  | "blueMicro"
  | "violetMicro"
  | "budTeal"
  | "bloomMaroon"
  | "poppyBokeh"
  | "softBokeh";

export type FocusRole = "hero" | "support" | "foreground" | "background";

export interface Placement {
  id: string;
  species: SpeciesId;
  /** Normalized reference-photo position of the flower head. */
  screen: [number, number];
  /** Distance from camera, meters. Focus plane sits at ~1.18. */
  depth: number;
  /** Head diameter as fraction of reference frame width at that depth. */
  sizeFrac: number;
  focusRole: FocusRole;
  /** Petal tint override (hex) for species with variants. */
  tint?: string;
  /** Head orientation: [pitchDeg, yawDeg, rollDeg]. 0,0,0 = facing camera. */
  facing?: [number, number, number];
  /** Deterministic per-plant shape seed. */
  seed: number;
}

import { palette } from "./palette";

/* ------------------------------------------------------------------ */
/* Focus plane — the subjects the eye settles on                       */
/* ------------------------------------------------------------------ */

export const heroes: Placement[] = [
  {
    id: "cosmos-hero",
    species: "cosmos",
    screen: [0.25, 0.30],
    depth: 1.15,
    sizeFrac: 0.165,
    focusRole: "hero",
    facing: [72, -16, 10],
    seed: 101,
  },
  {
    id: "cosmos-2",
    species: "cosmos",
    screen: [0.47, 0.375],
    depth: 1.26,
    sizeFrac: 0.105,
    focusRole: "hero",
    tint: palette.violet,
    facing: [64, 18, -6],
    seed: 102,
  },
  {
    id: "daisy-center",
    species: "daisyWhite",
    screen: [0.54, 0.335],
    depth: 1.30,
    sizeFrac: 0.048,
    focusRole: "hero",
    facing: [74, 6, 0],
    seed: 103,
  },
  {
    id: "daisy-pair-a",
    species: "daisyWhite",
    screen: [0.635, 0.445],
    depth: 1.42,
    sizeFrac: 0.034,
    focusRole: "support",
    facing: [55, 12, 0],
    seed: 104,
  },
  {
    id: "daisy-pair-b",
    species: "daisyWhite",
    screen: [0.615, 0.50],
    depth: 1.46,
    sizeFrac: 0.030,
    focusRole: "support",
    facing: [48, -10, 0],
    seed: 105,
  },
  {
    id: "orange-ur",
    species: "daisyOrange",
    screen: [0.83, 0.27],
    depth: 1.36,
    sizeFrac: 0.10,
    focusRole: "hero",
    facing: [76, -10, 4],
    seed: 106,
  },
  {
    id: "orange-lr",
    species: "daisyOrange",
    screen: [0.875, 0.60],
    depth: 1.58,
    sizeFrac: 0.092,
    focusRole: "support",
    facing: [70, -16, 0],
    seed: 107,
  },
  {
    id: "orange-edge-on",
    species: "daisyOrange",
    screen: [0.72, 0.41],
    depth: 1.5,
    sizeFrac: 0.09,
    focusRole: "support",
    tint: palette.yellow,
    facing: [24, -58, 32],
    seed: 108,
  },
  {
    id: "orange-mid-low",
    species: "daisyOrange",
    screen: [0.70, 0.71],
    depth: 1.88,
    sizeFrac: 0.085,
    focusRole: "support",
    facing: [62, 10, 0],
    seed: 109,
  },
  {
    id: "bloom-maroon",
    species: "bloomMaroon",
    screen: [0.42, 0.20],
    depth: 1.9,
    sizeFrac: 0.115,
    focusRole: "support",
    facing: [78, 0, 0],
    seed: 110,
  },
  { id: "bud-a", species: "budTeal", screen: [0.495, 0.155], depth: 1.35, sizeFrac: 0.020, focusRole: "support", seed: 111 },
  { id: "bud-b", species: "budTeal", screen: [0.52, 0.175], depth: 1.4, sizeFrac: 0.017, focusRole: "support", seed: 112 },
  { id: "bud-c", species: "budTeal", screen: [0.35, 0.11], depth: 1.55, sizeFrac: 0.018, focusRole: "support", seed: 113 },
  { id: "bud-d", species: "budTeal", screen: [0.62, 0.30], depth: 1.45, sizeFrac: 0.016, focusRole: "support", tint: palette.maroon, seed: 114 },
  { id: "bud-e", species: "budTeal", screen: [0.585, 0.34], depth: 1.32, sizeFrac: 0.014, focusRole: "support", tint: palette.red, seed: 115 },
  { id: "bud-f", species: "budTeal", screen: [0.31, 0.135], depth: 1.6, sizeFrac: 0.016, focusRole: "support", tint: palette.crimson, seed: 116 },
  { id: "bud-g", species: "budTeal", screen: [0.275, 0.095], depth: 1.75, sizeFrac: 0.015, focusRole: "support", seed: 117 },
  { id: "bud-h", species: "budTeal", screen: [0.44, 0.305], depth: 1.35, sizeFrac: 0.013, focusRole: "support", tint: palette.maroon, seed: 118 },
  { id: "bud-i", species: "budTeal", screen: [0.575, 0.505], depth: 1.5, sizeFrac: 0.013, focusRole: "support", seed: 119 },
  { id: "bud-j", species: "budTeal", screen: [0.665, 0.30], depth: 1.62, sizeFrac: 0.014, focusRole: "support", seed: 127 },
  { id: "bud-k", species: "budTeal", screen: [0.61, 0.115], depth: 1.9, sizeFrac: 0.016, focusRole: "support", seed: 128 },
  {
    id: "bloom-maroon-2",
    species: "bloomMaroon",
    screen: [0.475, 0.055],
    depth: 3.0,
    sizeFrac: 0.085,
    focusRole: "background",
    facing: [70, 10, 0],
    seed: 129,
  },
];

/* Red micro-clusters near focus (each entry = one sprig of several blooms) */
export const redClusters: Placement[] = [
  { id: "red-c1", species: "redCluster", screen: [0.34, 0.50], depth: 1.22, sizeFrac: 0.075, focusRole: "hero", seed: 120 },
  { id: "red-c2", species: "redCluster", screen: [0.30, 0.60], depth: 1.28, sizeFrac: 0.065, focusRole: "support", seed: 121 },
  { id: "red-c3", species: "redCluster", screen: [0.42, 0.57], depth: 1.36, sizeFrac: 0.06, focusRole: "support", seed: 122 },
  { id: "red-c4", species: "redCluster", screen: [0.48, 0.63], depth: 1.44, sizeFrac: 0.055, focusRole: "support", seed: 123 },
  { id: "red-c5", species: "redCluster", screen: [0.10, 0.42], depth: 0.95, sizeFrac: 0.08, focusRole: "support", seed: 124 },
  { id: "red-c6", species: "redCluster", screen: [0.55, 0.72], depth: 1.55, sizeFrac: 0.05, focusRole: "support", seed: 125 },
  { id: "red-c7", species: "redCluster", screen: [0.63, 0.585], depth: 1.62, sizeFrac: 0.045, focusRole: "support", seed: 126 },
  { id: "red-c8", species: "redCluster", screen: [0.205, 0.475], depth: 1.08, sizeFrac: 0.06, focusRole: "support", seed: 170 },
  { id: "red-c9", species: "redCluster", screen: [0.385, 0.435], depth: 1.3, sizeFrac: 0.05, focusRole: "support", seed: 171 },
  { id: "red-c10", species: "redCluster", screen: [0.445, 0.675], depth: 1.35, sizeFrac: 0.052, focusRole: "support", seed: 172 },
  { id: "red-c11", species: "redCluster", screen: [0.045, 0.345], depth: 1.0, sizeFrac: 0.055, focusRole: "support", seed: 173 },
  { id: "red-c12", species: "redCluster", screen: [0.28, 0.415], depth: 1.42, sizeFrac: 0.045, focusRole: "support", seed: 174 },
];

/* Cobalt micro-flower sprigs, lower left */
export const blueSprigs: Placement[] = [
  { id: "blue-1", species: "blueMicro", screen: [0.26, 0.72], depth: 1.18, sizeFrac: 0.06, focusRole: "support", seed: 130 },
  { id: "blue-2", species: "blueMicro", screen: [0.17, 0.66], depth: 1.10, sizeFrac: 0.065, focusRole: "support", seed: 131 },
  { id: "blue-3", species: "blueMicro", screen: [0.07, 0.60], depth: 1.0, sizeFrac: 0.07, focusRole: "support", seed: 132 },
  { id: "blue-4", species: "blueMicro", screen: [0.21, 0.84], depth: 1.05, sizeFrac: 0.075, focusRole: "support", seed: 133 },
  { id: "blue-5", species: "blueMicro", screen: [0.30, 0.90], depth: 1.0, sizeFrac: 0.07, focusRole: "support", seed: 134 },
  { id: "blue-6", species: "blueMicro", screen: [0.05, 0.78], depth: 0.95, sizeFrac: 0.08, focusRole: "support", seed: 135 },
  { id: "violet-1", species: "violetMicro", screen: [0.44, 0.79], depth: 0.78, sizeFrac: 0.08, focusRole: "support", seed: 136 },
  { id: "violet-2", species: "violetMicro", screen: [0.51, 0.93], depth: 0.62, sizeFrac: 0.09, focusRole: "foreground", seed: 137 },
  { id: "violet-3", species: "violetMicro", screen: [0.545, 0.635], depth: 1.35, sizeFrac: 0.045, focusRole: "support", seed: 138 },
  { id: "blue-7", species: "blueMicro", screen: [0.125, 0.755], depth: 1.0, sizeFrac: 0.06, focusRole: "support", seed: 175 },
  { id: "blue-8", species: "blueMicro", screen: [0.355, 0.83], depth: 1.05, sizeFrac: 0.055, focusRole: "support", seed: 176 },
  { id: "blue-9", species: "blueMicro", screen: [0.02, 0.88], depth: 0.92, sizeFrac: 0.07, focusRole: "support", seed: 177 },
  { id: "violet-4", species: "violetMicro", screen: [0.50, 0.845], depth: 0.85, sizeFrac: 0.065, focusRole: "support", seed: 178 },
  { id: "violet-5", species: "violetMicro", screen: [0.615, 0.93], depth: 0.7, sizeFrac: 0.07, focusRole: "foreground", seed: 179 },
];

/* ------------------------------------------------------------------ */
/* Extreme foreground — huge soft masses framing the shot              */
/* ------------------------------------------------------------------ */

export const foreground: Placement[] = [
  { id: "fg-red-left", species: "softBokeh", screen: [0.23, 0.56], depth: 0.44, sizeFrac: 0.11, focusRole: "foreground", tint: "#d21b28", seed: 140 },
  { id: "fg-red-bl", species: "softBokeh", screen: [0.10, 0.83], depth: 0.34, sizeFrac: 0.155, focusRole: "foreground", tint: "#b31220", seed: 141 },
  { id: "fg-crimson-c", species: "softBokeh", screen: [0.58, 0.79], depth: 0.30, sizeFrac: 0.175, focusRole: "foreground", tint: "#c11726", seed: 142 },
  { id: "fg-yellow-br", species: "softBokeh", screen: [0.80, 0.85], depth: 0.36, sizeFrac: 0.13, focusRole: "foreground", tint: "#e8ae1c", seed: 143 },
  { id: "fg-orange-r", species: "softBokeh", screen: [0.95, 0.66], depth: 0.44, sizeFrac: 0.10, focusRole: "foreground", tint: palette.orange, seed: 144 },
  { id: "fg-pink-l", species: "softBokeh", screen: [0.02, 0.21], depth: 0.5, sizeFrac: 0.10, focusRole: "foreground", tint: "#8e3a62", seed: 145 },
  { id: "fg-magenta-l2", species: "softBokeh", screen: [0.005, 0.38], depth: 0.55, sizeFrac: 0.09, focusRole: "foreground", tint: palette.magenta, seed: 146 },
  { id: "fg-red-corner", species: "softBokeh", screen: [0.025, 0.95], depth: 0.28, sizeFrac: 0.19, focusRole: "foreground", tint: "#a51320", seed: 180 },
  { id: "fg-magenta-bl", species: "softBokeh", screen: [0.15, 0.99], depth: 0.33, sizeFrac: 0.13, focusRole: "foreground", tint: palette.magentaDeep, seed: 181 },
  { id: "fg-orange-r2", species: "softBokeh", screen: [0.995, 0.78], depth: 0.4, sizeFrac: 0.12, focusRole: "foreground", tint: palette.orange, seed: 182 },
  { id: "fg-crimson-c2", species: "softBokeh", screen: [0.68, 0.92], depth: 0.32, sizeFrac: 0.15, focusRole: "foreground", tint: "#b31220", seed: 183 },
  { id: "fg-violet-c", species: "softBokeh", screen: [0.44, 0.82], depth: 0.42, sizeFrac: 0.07, focusRole: "foreground", tint: "#4c39c4", seed: 184 },
  { id: "fg-violet-c2", species: "softBokeh", screen: [0.52, 0.96], depth: 0.36, sizeFrac: 0.08, focusRole: "foreground", tint: "#53309e", seed: 185 },
  { id: "fg-blue-c", species: "softBokeh", screen: [0.37, 0.95], depth: 0.4, sizeFrac: 0.06, focusRole: "foreground", tint: "#2438a8", seed: 186 },
];

/* ------------------------------------------------------------------ */
/* Background bokeh sources                                            */
/* ------------------------------------------------------------------ */

export const background: Placement[] = [
  // defocused poppies (ring + dark heart)
  { id: "bg-poppy-1", species: "poppyBokeh", screen: [0.68, 0.09], depth: 3.4, sizeFrac: 0.07, focusRole: "background", tint: "#ff2530", seed: 150 },
  { id: "bg-poppy-2", species: "poppyBokeh", screen: [0.80, 0.05], depth: 3.8, sizeFrac: 0.072, focusRole: "background", tint: "#ff2530", seed: 151 },
  { id: "bg-poppy-3", species: "poppyBokeh", screen: [0.86, 0.15], depth: 3.2, sizeFrac: 0.065, focusRole: "background", tint: "#f2232e", seed: 152 },
  { id: "bg-poppy-4", species: "poppyBokeh", screen: [0.97, 0.02], depth: 4.0, sizeFrac: 0.068, focusRole: "background", tint: "#ff2530", seed: 153 },
  { id: "bg-red-tc", species: "softBokeh", screen: [0.37, 0.06], depth: 4.5, sizeFrac: 0.07, focusRole: "background", tint: palette.red, seed: 154 },
  { id: "bg-red-tc2", species: "softBokeh", screen: [0.44, 0.035], depth: 5.0, sizeFrac: 0.06, focusRole: "background", tint: palette.crimson, seed: 155 },
  // dark maroon top-left
  { id: "bg-maroon-1", species: "softBokeh", screen: [0.06, 0.10], depth: 2.6, sizeFrac: 0.12, focusRole: "background", tint: palette.maroon, seed: 156 },
  { id: "bg-maroon-2", species: "softBokeh", screen: [0.02, 0.04], depth: 2.9, sizeFrac: 0.11, focusRole: "background", tint: "#450a10", seed: 157 },
  { id: "bg-maroon-3", species: "softBokeh", screen: [0.14, 0.03], depth: 3.2, sizeFrac: 0.09, focusRole: "background", tint: palette.maroon, seed: 158 },
  // right edge color
  { id: "bg-orange-tr", species: "softBokeh", screen: [0.955, 0.22], depth: 2.6, sizeFrac: 0.12, focusRole: "background", tint: palette.orange, seed: 159 },
  { id: "bg-magenta-r", species: "softBokeh", screen: [0.93, 0.35], depth: 2.4, sizeFrac: 0.09, focusRole: "background", tint: palette.violet, seed: 160 },
  { id: "bg-violet-r", species: "softBokeh", screen: [0.93, 0.47], depth: 2.1, sizeFrac: 0.085, focusRole: "background", tint: palette.magenta, seed: 161 },
  // cyan sky-gap bokeh
  { id: "bg-cyan-1", species: "softBokeh", screen: [0.58, 0.055], depth: 7.0, sizeFrac: 0.10, focusRole: "background", tint: palette.cyanGap, seed: 162 },
  { id: "bg-cyan-2", species: "softBokeh", screen: [0.66, 0.03], depth: 7.5, sizeFrac: 0.085, focusRole: "background", tint: palette.cyanGapDim, seed: 163 },
  { id: "bg-cyan-3", species: "softBokeh", screen: [0.73, 0.12], depth: 6.5, sizeFrac: 0.07, focusRole: "background", tint: palette.cyanGapDim, seed: 164 },
  { id: "bg-cyan-4", species: "softBokeh", screen: [0.52, 0.10], depth: 6.8, sizeFrac: 0.06, focusRole: "background", tint: "#1d5a74", seed: 165 },
  // pink left edge
  { id: "bg-pink-l", species: "softBokeh", screen: [0.03, 0.17], depth: 2.2, sizeFrac: 0.09, focusRole: "background", tint: "#7e3358", seed: 166 },
  // soft red presence, left-center band (fills the void beside the hero)
  { id: "bg-red-lc1", species: "softBokeh", screen: [0.115, 0.38], depth: 2.0, sizeFrac: 0.085, focusRole: "background", tint: "#8e1220", seed: 167 },
  { id: "bg-red-lc2", species: "softBokeh", screen: [0.045, 0.47], depth: 1.8, sizeFrac: 0.075, focusRole: "background", tint: "#a01523", seed: 168 },
  { id: "bg-magenta-lc", species: "softBokeh", screen: [0.06, 0.30], depth: 2.4, sizeFrac: 0.07, focusRole: "background", tint: "#8e1766", seed: 169 },
];

export const allPlacements: Placement[] = [
  ...heroes,
  ...redClusters,
  ...blueSprigs,
  ...foreground,
  ...background,
];

/** Global seed for supporting-vegetation scatter. Changing it re-rolls only
 * the filler plants, never the art-directed placements above. */
export const SCATTER_SEED = 0xa11ce;

/* ------------------------------------------------------------------ */
/* Density map — screen-space elliptical zones matching the reference  */
/* distribution (docs/visual-reference.md §7).                         */
/* ------------------------------------------------------------------ */

export interface ScatterZone {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  w: number;
}

/** Where the stem/foliage tangle lives (heaviest in the mid-lower band). */
export const tangleZones: ScatterZone[] = [
  { cx: 0.45, cy: 0.6, rx: 0.24, ry: 0.22, w: 1.0 },
  { cx: 0.3, cy: 0.5, rx: 0.16, ry: 0.18, w: 0.85 },
  { cx: 0.62, cy: 0.52, rx: 0.16, ry: 0.2, w: 0.7 },
  { cx: 0.16, cy: 0.6, rx: 0.13, ry: 0.18, w: 0.6 },
  { cx: 0.5, cy: 0.22, rx: 0.26, ry: 0.14, w: 0.32 },
  { cx: 0.5, cy: 0.4, rx: 0.34, ry: 0.09, w: 0.22 },
  { cx: 0.85, cy: 0.45, rx: 0.13, ry: 0.25, w: 0.55 },
  { cx: 0.75, cy: 0.72, rx: 0.14, ry: 0.14, w: 0.5 },
];

/** Feathery foliage concentration (sharp filigree around the focus band). */
export const featherZones: ScatterZone[] = [
  { cx: 0.44, cy: 0.55, rx: 0.16, ry: 0.13, w: 1.0 },
  { cx: 0.3, cy: 0.66, rx: 0.13, ry: 0.12, w: 0.8 },
  { cx: 0.58, cy: 0.66, rx: 0.12, ry: 0.12, w: 0.7 },
  { cx: 0.17, cy: 0.5, rx: 0.1, ry: 0.1, w: 0.5 },
];

/**
 * Background flower field — clusters of defocused blooms far behind the
 * focus plane. Kind: 0 soft blob, 1 poppy ring, 2 petal silhouette,
 * 3 bright disc. Colors sampled per cluster.
 */
export interface BgCluster {
  zone: ScatterZone;
  depth: [number, number];
  sizeFrac: [number, number];
  colors: string[];
  kinds: number[];
  count: number;
}

export const bgField: BgCluster[] = [
  // top-left dark maroon blooms
  {
    zone: { cx: 0.07, cy: 0.08, rx: 0.09, ry: 0.09, w: 1 },
    depth: [2.5, 3.4],
    sizeFrac: [0.07, 0.12],
    colors: ["#5c0e14", "#450a10", "#6b1018"],
    kinds: [2, 2, 0],
    count: 6,
  },
  // top-center red glow + poppy forms
  {
    zone: { cx: 0.4, cy: 0.06, rx: 0.1, ry: 0.07, w: 1 },
    depth: [3.6, 5.0],
    sizeFrac: [0.05, 0.09],
    colors: ["#d81f2a", "#b3121f", "#8e1220"],
    kinds: [0, 2],
    count: 5,
  },
  // top-right poppy rings
  {
    zone: { cx: 0.8, cy: 0.09, rx: 0.14, ry: 0.09, w: 1 },
    depth: [3.2, 4.2],
    sizeFrac: [0.048, 0.072],
    colors: ["#ff2530", "#f2232e", "#e01c28"],
    kinds: [1, 1, 2],
    count: 7,
  },
  // top-center cyan sky-gap — the luminous patch the eye rests on
  {
    zone: { cx: 0.60, cy: 0.07, rx: 0.05, ry: 0.05, w: 1 },
    depth: [4.2, 5.2],
    sizeFrac: [0.07, 0.10],
    colors: ["#3fa9c9", "#2a8fb4"],
    kinds: [3],
    count: 3,
  },
  // top-right azure/cobalt discs (sky gaps between flowers)
  {
    zone: { cx: 0.78, cy: 0.05, rx: 0.12, ry: 0.06, w: 1 },
    depth: [3.8, 5.0],
    sizeFrac: [0.045, 0.07],
    colors: ["#2a6fd4", "#3fa9c9", "#2a7fa0"],
    kinds: [3, 0],
    count: 4,
  },
  // right band magenta/violet/orange
  {
    zone: { cx: 0.93, cy: 0.36, rx: 0.07, ry: 0.12, w: 1 },
    depth: [2.2, 3.0],
    sizeFrac: [0.06, 0.09],
    colors: ["#7a3bd4", "#c2258f", "#ee7d0e", "#9b59e8"],
    kinds: [2, 0],
    count: 4,
  },
  // luminous teal foliage glow behind the center flowers
  {
    zone: { cx: 0.58, cy: 0.42, rx: 0.14, ry: 0.13, w: 1 },
    depth: [2.6, 3.8],
    sizeFrac: [0.08, 0.14],
    colors: ["#17505c", "#1f6a68", "#123c4a"],
    kinds: [0],
    count: 5,
  },
  {
    zone: { cx: 0.42, cy: 0.5, rx: 0.12, ry: 0.11, w: 1 },
    depth: [2.8, 4.0],
    sizeFrac: [0.07, 0.12],
    colors: ["#1b5f63", "#14464f"],
    kinds: [0],
    count: 4,
  },
  // deep scattered midfield murmur (very dim, far)
  {
    zone: { cx: 0.5, cy: 0.3, rx: 0.3, ry: 0.18, w: 1 },
    depth: [4.5, 6.5],
    sizeFrac: [0.035, 0.06],
    colors: ["#8e1220", "#8e1766", "#5c0e14", "#1d5a74"],
    kinds: [0, 2],
    count: 10,
  },
  // left edge pink/red presence
  {
    zone: { cx: 0.05, cy: 0.3, rx: 0.06, ry: 0.14, w: 1 },
    depth: [1.9, 2.8],
    sizeFrac: [0.06, 0.1],
    colors: ["#c05a9a", "#a01523", "#8e1766"],
    kinds: [0, 2],
    count: 5,
  },
];
