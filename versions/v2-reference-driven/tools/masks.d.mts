/** Type declarations for the untyped .mjs mask tool module (used by tests). */
export const IMG_W: number;
export const IMG_H: number;
export const MOTION_MARGIN_PX: number;
export const riggedLayers: {
  id: string;
  rect: [number, number, number, number];
  svg: string;
  fadeOut?: { y0: number; y1: number };
  feather?: number;
}[];
export const qcRegions: {
  id: string;
  core: { cx: number; cy: number; r: number };
  metric: "magenta" | "orange";
}[];
