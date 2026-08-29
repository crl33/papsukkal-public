/**
 * The locked photographic camera. These numbers ARE the composition —
 * every placement in composition.ts is projected through them.
 * World units are meters; camera at origin looking down −Z, pitch 0.
 */
export const cameraConfig = {
  /** Vertical field of view, degrees (~100mm-equivalent close-focus feel). */
  fovY: 22,
  /** Camera height above soil (y=0), meters. */
  height: 0.52,
  /** Aspect ratio of the reference photograph. Composition is authored in it. */
  refAspect: 1.51,
  /** Distance to the sharp focus plane, meters. The blur curves themselves
   * (dead zone, near/far strength) live in CinematicDofPass. */
  focusDistance: 1.18,
  near: 0.05,
  far: 30,
} as const;

const DEG = Math.PI / 180;

/** Half-height of the view frustum at a given camera distance. */
export function halfHeightAt(depth: number): number {
  return depth * Math.tan((cameraConfig.fovY / 2) * DEG);
}

/** Frame width in meters at a given depth, in the reference aspect. */
export function frameWidthAt(depth: number): number {
  return 2 * halfHeightAt(depth) * cameraConfig.refAspect;
}

/**
 * Map a normalized reference-photo position (nx right, ny down, 0..1)
 * plus a camera distance to a world position. This is what guarantees the
 * rendered frame reproduces the photograph's layout.
 */
export function placeFromScreen(nx: number, ny: number, depth: number): [number, number, number] {
  const hh = halfHeightAt(depth);
  const hw = hh * cameraConfig.refAspect;
  return [(2 * nx - 1) * hw, cameraConfig.height + (1 - 2 * ny) * hh, -depth];
}
