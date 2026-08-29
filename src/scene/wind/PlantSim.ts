/**
 * CPU plant dynamics: every plant is a damped oscillator anchored at its
 * root and forced by the shared WindField. Wind does not directly set the
 * pose — it applies force, the stem stores energy, the head lags, damping
 * settles it. This is what separates "vegetation in airflow" from
 * "geometry modulated by a wave".
 *
 * Integration: semi-implicit Euler at a fixed 120 Hz substep with an
 * accumulator, so behavior is identical at 30/60/120 fps displays.
 *
 * The damped-spring pattern (velocity += -k·x·dt; velocity *= (1 - c·dt);
 * clamped dt; sleep thresholds) is adapted from
 * achrefelouafi/VegetationGeneratorThreeJS (MIT) — see docs/CREDITS.md.
 */
import { WindField, type WindSample } from "./WindField";
import { createRng } from "../../utils/prng";

export interface Mechanics {
  /** Natural frequency of the stem's fundamental mode, Hz. */
  freq: number;
  /** Damping ratio (0.2–0.6 = gently underdamped, slight overshoot). */
  zeta: number;
  /** Wind force coupling — how much m/s of wind becomes m of deflection. */
  drag: number;
  /** Max head deflection as a fraction of plant height. */
  maxBendFrac: number;
  /** Secondary head-nod oscillator frequency, Hz (a bit above stem freq). */
  headFreq: number;
  headZeta: number;
  /** Radians of head nod per m/s² of stem-tip acceleration. */
  headGain: number;
  /** 0..1 — how much fine turbulence this plant feels (tiny plants feel more). */
  turbulence: number;
}

/** Species mechanics presets. Heavier heads → lower freq, more lag. */
export const MECHANICS: Record<string, Mechanics> = {
  cosmosHero: { freq: 0.9, zeta: 0.32, drag: 0.045, maxBendFrac: 0.16, headFreq: 1.6, headZeta: 0.28, headGain: 0.030, turbulence: 0.5 },
  daisySmall: { freq: 1.5, zeta: 0.30, drag: 0.038, maxBendFrac: 0.14, headFreq: 2.4, headZeta: 0.30, headGain: 0.022, turbulence: 0.7 },
  daisyOrange: { freq: 1.1, zeta: 0.34, drag: 0.042, maxBendFrac: 0.15, headFreq: 1.9, headZeta: 0.30, headGain: 0.026, turbulence: 0.6 },
  microSprig: { freq: 2.2, zeta: 0.26, drag: 0.050, maxBendFrac: 0.20, headFreq: 3.2, headZeta: 0.26, headGain: 0.016, turbulence: 1.0 },
  bud: { freq: 1.8, zeta: 0.35, drag: 0.030, maxBendFrac: 0.12, headFreq: 2.8, headZeta: 0.32, headGain: 0.014, turbulence: 0.8 },
  heavyBloom: { freq: 0.7, zeta: 0.40, drag: 0.040, maxBendFrac: 0.12, headFreq: 1.2, headZeta: 0.34, headGain: 0.026, turbulence: 0.35 },
  foregroundMass: { freq: 0.75, zeta: 0.38, drag: 0.050, maxBendFrac: 0.18, headFreq: 1.3, headZeta: 0.34, headGain: 0.020, turbulence: 0.4 },
  backgroundStalk: { freq: 1.2, zeta: 0.33, drag: 0.045, maxBendFrac: 0.16, headFreq: 2.0, headZeta: 0.3, headGain: 0.015, turbulence: 0.6 },
};

const SUBSTEP = 1 / 120;
const MAX_FRAME_DT = 1 / 15; // clamp giant pauses (tab switches)

/** Per-plant packed state layout in `state` (Float32Array). */
const S = 10; // rootX, rootZ, height, k, c, drag, maxBend, kh, ch, headGain
const D = 8; // bx, bz, vbx, vbz, hx, hz, vhx, vhz

export class PlantSim {
  readonly wind: WindField;
  /** Per-plant output, stride 4: bendX(m), bendZ(m), headPitch(rad), headRoll(rad). */
  output: Float32Array;
  /** Per-plant local gust value 0..~1 (for GPU shimmer amplitude). */
  gustOut: Float32Array;
  time = 0;

  private params: Float32Array;
  private dyn: Float32Array;
  private turb: Float32Array;
  private count = 0;
  private capacity: number;
  private accumulator = 0;
  private sampleScratch: WindSample = { x: 0, z: 0, gust: 0 };

  constructor(wind: WindField, capacity = 1024) {
    this.wind = wind;
    this.capacity = capacity;
    this.params = new Float32Array(capacity * S);
    this.dyn = new Float32Array(capacity * D);
    this.turb = new Float32Array(capacity);
    this.output = new Float32Array(capacity * 4);
    this.gustOut = new Float32Array(capacity);
  }

  get plantCount(): number {
    return this.count;
  }

  /**
   * Register a plant. Mechanics get ±12% seeded variation so no two plants
   * share a natural frequency (kills synchronization).
   * Returns the plant index (its slot in `output`).
   */
  addPlant(rootX: number, rootZ: number, height: number, mech: Mechanics, seed: number): number {
    if (this.count >= this.capacity) throw new Error("PlantSim capacity exceeded");
    const rng = createRng(seed);
    const vary = () => 1 + 0.24 * (rng.next() - 0.5);

    const f = mech.freq * vary();
    const w0 = 2 * Math.PI * f;
    const k = w0 * w0;
    const c = 2 * (mech.zeta * vary()) * w0;
    const fh = mech.headFreq * vary();
    const wh = 2 * Math.PI * fh;

    const i = this.count++;
    const p = i * S;
    this.params[p] = rootX;
    this.params[p + 1] = rootZ;
    this.params[p + 2] = height;
    this.params[p + 3] = k;
    this.params[p + 4] = c;
    this.params[p + 5] = mech.drag * vary() * height; // taller = more sail area
    this.params[p + 6] = mech.maxBendFrac * height;
    this.params[p + 7] = wh * wh;
    this.params[p + 8] = 2 * mech.headZeta * wh;
    this.params[p + 9] = mech.headGain * vary();
    this.turb[i] = mech.turbulence;

    // start at rest with a touch of seeded rest-curvature (not everything is
    // perfectly vertical in still air)
    const d = i * D;
    this.dyn[d] = rng.range(-0.15, 0.15) * mech.maxBendFrac * height;
    this.dyn[d + 1] = rng.range(-0.15, 0.15) * mech.maxBendFrac * height;
    return i;
  }

  /** Advance simulation by a frame's worth of wall time. */
  update(frameDt: number): void {
    this.accumulator += Math.min(frameDt, MAX_FRAME_DT);
    while (this.accumulator >= SUBSTEP) {
      this.step(SUBSTEP);
      this.accumulator -= SUBSTEP;
      this.time += SUBSTEP;
    }
    this.writeOutput();
  }

  /** Jump deterministically to an absolute time (screenshot/test mode). */
  advanceTo(targetTime: number): void {
    while (this.time + SUBSTEP <= targetTime) {
      this.step(SUBSTEP);
      this.time += SUBSTEP;
    }
    this.writeOutput();
  }

  private step(dt: number): void {
    const { params, dyn, wind } = this;
    const t = this.time;
    const ws = this.sampleScratch;
    for (let i = 0; i < this.count; i++) {
      const p = i * S;
      const d = i * D;
      const drag = params[p + 5];
      const k = params[p + 3];
      const c = params[p + 4];
      const maxBend = params[p + 6];

      wind.sample(params[p], params[p + 1], t, ws);
      this.gustOut[i] = ws.gust;

      let bx = dyn[d];
      let bz = dyn[d + 1];
      let vx = dyn[d + 2];
      let vz = dyn[d + 3];

      // wind force via relative-velocity drag (moving stem sheds load)
      const fx = drag * (ws.x - vx * 0.6);
      const fz = drag * (ws.z - vz * 0.6);

      // progressive stiffening near max bend (soft limit — no hard stop pop)
      const r2 = (bx * bx + bz * bz) / (maxBend * maxBend);
      const stiff = k * (1 + r2 * r2 * 3);

      const ax = fx * k - stiff * bx - c * vx;
      const az = fz * k - stiff * bz - c * vz;
      vx += ax * dt;
      vz += az * dt;
      bx += vx * dt;
      bz += vz * dt;

      // secondary head oscillator forced by stem-tip acceleration → lag/nod
      const kh = params[p + 7];
      const ch = params[p + 8];
      let hx = dyn[d + 4];
      let hz = dyn[d + 5];
      let vhx = dyn[d + 6];
      let vhz = dyn[d + 7];
      const ahx = -kh * hx - ch * vhx - ax;
      const ahz = -kh * hz - ch * vhz - az;
      vhx += ahx * dt;
      vhz += ahz * dt;
      hx += vhx * dt;
      hz += vhz * dt;

      dyn[d] = bx;
      dyn[d + 1] = bz;
      dyn[d + 2] = vx;
      dyn[d + 3] = vz;
      dyn[d + 4] = hx;
      dyn[d + 5] = hz;
      dyn[d + 6] = vhx;
      dyn[d + 7] = vhz;
    }
  }

  private writeOutput(): void {
    const { params, dyn, output } = this;
    for (let i = 0; i < this.count; i++) {
      const p = i * S;
      const d = i * D;
      const o = i * 4;
      const maxBend = params[p + 6];
      const gain = params[p + 9];
      // absolute safety clamp on top of the soft limit
      let bx = dyn[d];
      let bz = dyn[d + 1];
      const len = Math.hypot(bx, bz);
      const cap = maxBend * 1.35;
      if (len > cap) {
        bx = (bx / len) * cap;
        bz = (bz / len) * cap;
      }
      output[o] = bx;
      output[o + 1] = bz;
      // head nod: pitch about the axis perpendicular to lag direction
      output[o + 2] = clampAbs(dyn[d + 4] * gain * 60, 0.22);
      output[o + 3] = clampAbs(dyn[d + 5] * gain * 60, 0.22);
    }
  }
}

function clampAbs(v: number, m: number): number {
  return v > m ? m : v < -m ? -m : v;
}
