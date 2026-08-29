/**
 * Continuous spatial-temporal wind field W(x, z, t).
 *
 * Structure (docs/architecture.md §Wind):
 *  - BASE FLOW: gentle persistent breeze whose direction meanders slowly.
 *  - LARGE GUSTS: 1D ridge noise advected along the wind direction — a gust
 *    front physically travels across the meadow, so the left side feels it
 *    before the right. Cross-wind variation breaks up uniform fronts.
 *  - MEDIUM TURBULENCE: advected 2D simplex FBM, giving local irregularity.
 *  - MICRO TURBULENCE is handled per-vertex on the GPU (petal/leaf shimmer);
 *    its amplitude scalar is exported from here so it breathes with gusts.
 *
 * The field is a pure deterministic function of (x, z, t) for a given seed —
 * no internal state — which makes it testable and timestep-independent.
 */
import { createSimplex2, createValueNoise1, type Noise2 } from "../../utils/noise";

export interface WindSample {
  x: number;
  z: number;
  /** Gust envelope 0..~1.5 at this location (drives micro-shimmer, audio…). */
  gust: number;
}

export interface WindFieldOptions {
  seed?: number;
  /** Mean wind speed, m/s. */
  baseSpeed?: number;
  /** Peak extra speed contributed by a strong gust, m/s. */
  gustStrength?: number;
  /** How fast gust fronts travel, m/s. */
  gustSpeed?: number;
  /** Master intensity 0..1 (reduced-motion uses a small value). */
  intensity?: number;
}

export class WindField {
  readonly baseSpeed: number;
  readonly gustStrength: number;
  readonly gustSpeed: number;
  intensity: number;

  private nDir: (x: number) => number;
  private nGustA: (x: number) => number;
  private nGustB: (x: number) => number;
  private nCross: Noise2;
  private nTurb: Noise2;

  constructor(opts: WindFieldOptions = {}) {
    const seed = opts.seed ?? 1337;
    this.baseSpeed = opts.baseSpeed ?? 0.32;
    this.gustStrength = opts.gustStrength ?? 1.05;
    this.gustSpeed = opts.gustSpeed ?? 1.35;
    this.intensity = opts.intensity ?? 1;
    this.nDir = createValueNoise1(seed ^ 0x1a2b);
    this.nGustA = createValueNoise1(seed ^ 0x3c4d);
    this.nGustB = createValueNoise1(seed ^ 0x5e6f);
    this.nCross = createSimplex2(seed ^ 0x7081);
    this.nTurb = createSimplex2(seed ^ 0x92a3);
  }

  /** Wind direction angle (radians) at time t — meanders slowly. */
  direction(t: number): number {
    return 0.35 + 0.4 * this.nDir(t * 0.021) + 0.15 * this.nDir(t * 0.057 + 31.7);
  }

  /**
   * Sample the wind velocity (m/s) at a world position.
   * `out` is written in place to avoid allocation in hot loops.
   */
  sample(x: number, z: number, t: number, out: WindSample): WindSample {
    const theta = this.direction(t);
    const dx = Math.cos(theta);
    const dz = -Math.sin(theta);

    // --- coordinate along/across wind direction
    const along = x * dx + z * dz;
    const across = -x * dz + z * dx;

    // --- large gusts: two advected ridge-noise channels at different scales.
    // fronts travel downwind at gustSpeed; ridge() keeps only the crests.
    const g1 = ridge(this.nGustA(along * 0.55 - t * this.gustSpeed * 0.55));
    const g2 = ridge(this.nGustB(along * 0.21 - t * this.gustSpeed * 0.21 + 11.3));
    // cross-wind modulation so a front is not a perfectly straight bar
    const crossMod = 0.65 + 0.35 * this.nCross(across * 0.5 + 3.1, t * 0.11);
    const gust = (0.65 * g1 + 0.75 * g2) * crossMod;

    // --- medium turbulence: advected FBM (2 octaves, hand-rolled for speed)
    const ax = x - dx * t * this.gustSpeed * 0.4;
    const az = z - dz * t * this.gustSpeed * 0.4;
    const t1 = this.nTurb(ax * 0.9, az * 0.9 + t * 0.05);
    const t2 = this.nTurb(ax * 2.3 + 17.1, az * 2.3 - t * 0.09);
    const turb = t1 * 0.7 + t2 * 0.3;
    // turbulence also nudges direction, not just magnitude
    const turbAngle = 0.5 * this.nTurb(ax * 0.4 - 8.2, t * 0.07);

    const speed = (this.baseSpeed * (0.85 + 0.3 * turb) + this.gustStrength * gust) * this.intensity;
    const phi = theta + turbAngle * (0.35 + 0.4 * gust);

    out.x = Math.cos(phi) * speed;
    out.z = -Math.sin(phi) * speed;
    out.gust = gust * this.intensity;
    return out;
  }
}

/** Shape [-1,1] noise into gust crests: mostly calm, occasional smooth peaks. */
function ridge(n: number): number {
  const p = Math.max(0, n);
  return p * p * (3 - 2 * p); // smooth rise, zero floor
}
