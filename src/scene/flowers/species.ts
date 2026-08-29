/**
 * Procedural botanical species builders. Every builder is deterministic in
 * its seed; dimensions are passed in meters so composition config controls
 * exact framed sizes. Geometry convention: root at origin, stem rises +Y,
 * head pivot at (0, headPivotY, 0); the whole plant may then be yawed/tilted
 * slightly via its mesh transform (rotation about the root keeps roots put).
 */
import { Color, Matrix4, Vector3, Euler } from "three";
import { GeomBuilder } from "./GeomBuilder";
import { createRng, type Rng } from "../../utils/prng";
import { srgb } from "../shaders/vegetationMaterial";
import { palette } from "../../config/palette";

export interface PlantBuild {
  builder: GeomBuilder;
  headPivotY: number;
}

const _m = new Matrix4();

function varied(c: Color, rng: Rng, amt = 0.06): Color {
  const out = c.clone();
  out.offsetHSL(rng.range(-amt, amt) * 0.25, rng.range(-amt, amt), rng.range(-amt, amt));
  return out;
}

/* ------------------------------------------------------------------ */
/* Shared parts                                                        */
/* ------------------------------------------------------------------ */

export function addStem(
  b: GeomBuilder,
  height: number,
  radius: number,
  rng: Rng,
  opts: { bow?: number; color?: Color; flutterTop?: number; radial?: number; segs?: number } = {},
): void {
  const bowAmt = opts.bow ?? rng.range(0.008, 0.03);
  const bowAng = rng.range(0, Math.PI * 2);
  const bx = Math.cos(bowAng) * bowAmt;
  const bz = Math.sin(bowAng) * bowAmt;
  const color = opts.color ?? srgb(palette.stemCyan);
  const radial = opts.radial ?? 5;
  const segs = opts.segs ?? 7;
  const flutterTop = opts.flutterTop ?? 0.05;

  // slight secondary S-curve so stems read wiry, not extruded
  const s2 = rng.range(-0.012, 0.012);
  const s2a = rng.range(0, Math.PI * 2);

  const center = (t: number, out: Vector3) => {
    const bow = Math.sin(t * Math.PI);
    const wig = Math.sin(t * Math.PI * 2);
    out.set(bx * bow + Math.cos(s2a) * s2 * wig, t * height, bz * bow + Math.sin(s2a) * s2 * wig);
  };

  const c = new Vector3();
  b.grid(segs, radial, (u, v, pos, normal) => {
    center(u, c);
    const ang = v * Math.PI * 2;
    const r = radius * (1 - u * 0.35);
    normal.set(Math.cos(ang), 0, Math.sin(ang));
    pos.set(c.x + normal.x * r, c.y, c.z + normal.z * r);
    const col = color.clone().multiplyScalar(0.72 + 0.16 * u);
    return { color: col, data: { s: u, head: 0, flutter: flutterTop * u * u, phase: 0 } };
  });
}

export interface PetalRingOptions {
  count: number;
  length: number;
  width: number;
  /** Cone angle in radians — 0 = flat disc, positive = petals sweep back. */
  cone: number;
  /** Cross-section cup (edges lift toward face). */
  cup: number;
  /** Length-wise arch. */
  arch: number;
  baseRadius: number;
  colorFn: (u: number, va: number, petalIdx: number) => Color;
  nu?: number;
  nv?: number;
  flutter?: number;
  tipNotch?: number;
  jitter?: number;
  /** aData head flag (default 1 = rigid head). Sprig blooms pass 0. */
  headFlag?: number;
  /** aData stem-height parameter (default 1). Used with headFlag 0 so the
   * bloom bends with the stem envelope at its attach height. */
  sOverride?: number;
}

/** Adds a radial ring of petals in head-local space (center at origin, facing +Y). */
export function addPetalRing(b: GeomBuilder, rng: Rng, o: PetalRingOptions): void {
  const nu = o.nu ?? 5;
  const nv = o.nv ?? 4;
  const jitter = o.jitter ?? 1;
  for (let i = 0; i < o.count; i++) {
    const theta = (i / o.count) * Math.PI * 2 + rng.range(-0.4, 0.4) * (jitter / o.count);
    const len = o.length * (1 + rng.range(-0.09, 0.09) * jitter);
    const cone = o.cone + rng.range(-0.12, 0.12) * jitter;
    const roll = rng.range(-0.15, 0.15) * jitter;
    const phase = rng.next() * Math.PI * 2;
    const notchPhase = rng.next() * 10;

    _m.makeRotationFromEuler(new Euler(0, -theta, roll, "YXZ"));
    b.section(_m, () => {
      b.grid(nu, nv, (u, v, pos) => {
        const va = v * 2 - 1;
        // width profile: narrow base, broad blade, softly truncated tip
        let half = o.width * 0.5 * (0.22 + 0.78 * smoothstep01(u / 0.62)) ;
        if (u > 0.85) half *= Math.sqrt(Math.max(0.05, 1 - ((u - 0.85) / 0.15) ** 2 * 0.55));
        // tip serration
        const notch = 1 - (o.tipNotch ?? 0.05) * Math.max(0, (u - 0.75) / 0.25) * (0.5 + 0.5 * Math.sin(va * 7 + notchPhase));
        const x = o.baseRadius + u * len * notch;
        const y =
          -Math.sin(cone) * u * len + // sweep back
          o.arch * Math.sin(u * Math.PI) * len * 0.22 + // gentle arch
          o.cup * (1 - va * va) * o.width * 0.16; // cross cup
        pos.set(x, y, va * half);
        return {
          color: o.colorFn(u, va, i),
          data: {
            s: o.sOverride ?? 1,
            head: o.headFlag ?? 1,
            flutter: (o.flutter ?? 0.5) * u * u,
            phase,
          },
        };
      });
    });
  }
}

function smoothstep01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

export interface IrregularPetalOptions {
  count: number;
  length: number;
  width: number;
  /** Mean sweep-back angle (radians); each petal deviates strongly. */
  cone: number;
  cup: number;
  arch: number;
  baseRadius: number;
  colorFn: (u: number, va: number, petalIdx: number) => Color;
  nu?: number;
  nv?: number;
  flutter?: number;
  /** How wild the irregularity is, 0..1. Real flowers ≈ 0.6–1. */
  wildness?: number;
  /** Per-petal tip curl range (radians of tip curvature, ± ). */
  curl?: number;
}

/**
 * A ring of NATURAL petals: uneven lengths, irregular angular spacing,
 * per-petal droop/lift (depth staggering), twist, tip curl, wavy edges and
 * ragged tips. This is what separates "flower" from "mathematical rosette" —
 * the reference's blossoms have no two petals alike.
 */
export function addIrregularPetals(b: GeomBuilder, rng: Rng, o: IrregularPetalOptions): void {
  const nu = o.nu ?? 8;
  const nv = o.nv ?? 5;
  const wild = o.wildness ?? 0.7;
  const curlAmt = o.curl ?? 0.5;

  // irregular angular layout: jittered slots, some petals crowd, gaps appear
  const angles: number[] = [];
  for (let i = 0; i < o.count; i++) {
    angles.push((i / o.count) * Math.PI * 2 + rng.gauss() * (1.4 / o.count) * wild);
  }

  for (let i = 0; i < o.count; i++) {
    const theta = angles[i];
    const len = o.length * (1 + rng.gauss() * 0.13 * wild);
    const width = o.width * (1 + rng.gauss() * 0.12 * wild);
    const cone = o.cone + rng.gauss() * 0.24 * wild; // droop/lift stagger
    const roll = rng.gauss() * 0.22 * wild; // twist around petal axis
    const curl = rng.gauss() * curlAmt * wild; // tip curls up or down
    const lift = rng.gauss() * 0.012 * wild * len; // small depth offset
    const baseR = o.baseRadius * (1 + rng.gauss() * 0.18 * wild);
    const phase = rng.next() * Math.PI * 2;
    const notchPhase = rng.next() * 10;
    const wavePhase = rng.next() * 10;
    const skew = rng.gauss() * 0.1 * wild; // asymmetric blade

    _m.makeRotationFromEuler(new Euler(0, -theta, roll, "YXZ"));
    b.section(_m, () => {
      b.grid(nu, nv, (u, v, pos) => {
        const va = v * 2 - 1;
        // width profile with wavy edge + ragged tip
        let half = width * 0.5 * (0.2 + 0.8 * smoothstep01(u / 0.6));
        if (u > 0.8) half *= Math.sqrt(Math.max(0.04, 1 - ((u - 0.8) / 0.2) ** 2 * 0.6));
        half *= 1 + 0.07 * wild * Math.sin(u * 6.3 + wavePhase);
        const notch = 1 - 0.09 * wild * Math.max(0, (u - 0.7) / 0.3) * (0.5 + 0.5 * Math.sin(va * 6 + notchPhase));
        const x = baseR + u * len * notch;
        const y =
          -Math.sin(cone) * u * len +
          o.arch * Math.sin(u * Math.PI) * len * 0.2 +
          curl * u * u * len * 0.55 + // tip curl
          o.cup * (1 - va * va) * width * 0.15 +
          lift;
        pos.set(x, y, va * half + skew * u * len);
        return {
          color: o.colorFn(u, va, i),
          data: { s: 1, head: 1, flutter: (o.flutter ?? 0.45) * u * u, phase },
        };
      });
    });
  }
}

/**
 * A natural flower center: dark bulging cone with a physical stamen ring —
 * small warm blobs seated on the rim, so a tilted head shows the crescent of
 * stamens the reference's cosmos centers have.
 */
export function addNaturalCenter(
  b: GeomBuilder,
  rng: Rng,
  radius: number,
  height: number,
  coneColor: Color,
  stamenA: Color,
  stamenB: Color,
): void {
  // bulging cone
  b.grid(6, 12, (u, v, pos, normal) => {
    const r = Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.5) * radius;
    const ang = v * Math.PI * 2;
    const y = (1 - u * u) * height;
    pos.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
    const n = new Vector3(Math.cos(ang) * u, 1.1 * (1 - u * 0.6), Math.sin(ang) * u).normalize();
    normal.copy(n);
    const col = coneColor.clone().multiplyScalar(0.75 + 0.5 * (1 - u)); // darker rim
    return { color: col, data: { s: 1, head: 1, flutter: 0.04 * u, phase: ang } };
  });
  // stamen blobs around the top rim + a few inner
  const n = rng.int(9, 14);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const rr = radius * rng.range(0.55, 0.85);
    const y = height * rng.range(0.55, 0.95);
    const sr = radius * rng.range(0.1, 0.16);
    const col = varied(stamenA.clone().lerp(stamenB, rng.next()), rng, 0.05);
    addBlob(b, new Vector3(Math.cos(ang) * rr, y, Math.sin(ang) * rr), sr, 0.8, col, 1, 0.05, ang, 1);
  }
}

/** Squashed dome for flower centers, facing +Y, base at origin. */
export function addCenterDome(
  b: GeomBuilder,
  radius: number,
  height: number,
  colorFn: (r: number, ang: number) => Color,
  flutter = 0.06,
  headFlag = 1,
  sOverride = 1,
): void {
  b.grid(6, 10, (u, v, pos, normal) => {
    const r = u * radius;
    const ang = v * Math.PI * 2;
    const y = Math.cos((u * Math.PI) / 2) * height;
    pos.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
    const n = new Vector3(Math.cos(ang) * u, 1.2 * (1 - u * 0.5), Math.sin(ang) * u).normalize();
    normal.copy(n);
    return { color: colorFn(u, ang), data: { s: sOverride, head: headFlag, flutter: flutter * u, phase: ang } };
  });
}

export function addBlob(
  b: GeomBuilder,
  center: Vector3,
  radius: number,
  squash: number,
  color: Color,
  s: number,
  flutter: number,
  phase: number,
  headFlag = 0,
): void {
  b.grid(6, 8, (u, v, pos, normal) => {
    const phi = u * Math.PI;
    const theta = v * Math.PI * 2;
    const n = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi) * squash, Math.sin(phi) * Math.sin(theta));
    normal.copy(n).normalize();
    pos.set(center.x + n.x * radius, center.y + n.y * radius, center.z + n.z * radius);
    return { color, data: { s, head: headFlag, flutter, phase } };
  });
}

/** Thin tapered leaf blade attached at a stem height, angling outward. */
export function addLeaf(
  b: GeomBuilder,
  rng: Rng,
  attachY: number,
  stemHeight: number,
  length: number,
  width: number,
  color: Color,
): void {
  const theta = rng.range(0, Math.PI * 2);
  const up = rng.range(0.35, 0.9);
  _m.makeRotationFromEuler(new Euler(0, -theta, 0, "YXZ")).setPosition(0, attachY, 0);
  const s0 = attachY / stemHeight;
  const phase = rng.next() * Math.PI * 2;
  b.section(_m, () => {
    b.grid(4, 1, (u, v, pos) => {
      const va = v * 2 - 1;
      const half = width * 0.5 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.9)) * (1 - u * 0.3);
      pos.set(u * length * Math.cos(up), u * length * Math.sin(up) - u * u * length * 0.35, va * half);
      return {
        color: color.clone().multiplyScalar(0.8 + 0.35 * u),
        data: { s: Math.min(1, s0 + (u * length) / stemHeight), head: 0, flutter: 0.3 * u, phase },
      };
    });
  });
}

/** Rotate + translate head-local geometry up to the pivot with facing angles. */
function headSection(b: GeomBuilder, headY: number, facing: [number, number, number], fn: () => void): void {
  const [pitch, yaw, roll] = facing;
  const DEG = Math.PI / 180;
  _m.makeRotationFromEuler(new Euler(pitch * DEG, yaw * DEG, roll * DEG, "YXZ")).setPosition(0, headY, 0);
  b.section(_m, fn);
}

/* ------------------------------------------------------------------ */
/* Species                                                             */
/* ------------------------------------------------------------------ */

export function buildCosmos(
  seed: number,
  headY: number,
  diameter: number,
  facing: [number, number, number] = [14, 0, 0],
  detail = 1,
  variant: "magenta" | "violet" = "magenta",
): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  addStem(b, headY, 0.0014 + diameter * 0.006, rng, {});

  // magenta hero vs the deeper purple second bloom of the reference
  const cMid = variant === "violet" ? srgb("#a637a0") : srgb(palette.magenta);
  const cHi = variant === "violet" ? srgb("#bd55d0") : srgb(palette.magentaHi);
  const cDeep = variant === "violet" ? srgb("#5c1670") : srgb(palette.magentaDeep);

  const colorFn = (layerDim: number) => (u: number, va: number, petalIdx: number) => {
    const c = cDeep
      .clone()
      .lerp(cMid, smoothstep01(u * 2.0))
      .lerp(cHi, smoothstep01((u - 0.42) * 1.7) * 0.7);
    // striations — veins running the petal's length
    const stripe = 0.5 + 0.5 * Math.sin(va * 11.5 + petalIdx);
    c.multiplyScalar(1 - 0.2 * stripe * (1 - u * 0.3));
    // strong per-petal light variation + darker inner region
    const petalLum = 0.6 + 0.38 * (0.5 + 0.5 * Math.sin(petalIdx * 12.9898 + seed));
    c.multiplyScalar(petalLum * layerDim);
    c.multiplyScalar(0.66 + 0.34 * smoothstep01(u * 3.2)); // dark throat
    c.multiplyScalar(0.9 + 0.1 * Math.abs(va));
    return c;
  };

  headSection(b, headY, facing, () => {
    // back layer: fewer, longer, droopier, in shadow
    addIrregularPetals(b, rng, {
      count: 6,
      length: diameter * 0.44,
      width: diameter * 0.27,
      cone: 0.42,
      cup: 0.5,
      arch: 0.7,
      baseRadius: diameter * 0.07,
      nu: Math.round(8 * detail) + 2,
      nv: Math.round(5 * detail) + 1,
      wildness: 0.85,
      curl: 0.35,
      flutter: 0.45,
      colorFn: colorFn(0.72),
    });
    // front layer: the readable petals
    addIrregularPetals(b, rng, {
      count: 8,
      length: diameter * 0.395,
      width: diameter * 0.275,
      cone: 0.22,
      cup: 0.55,
      arch: 0.85,
      baseRadius: diameter * 0.065,
      nu: Math.round(9 * detail) + 2,
      nv: Math.round(6 * detail) + 1,
      wildness: 0.75,
      curl: 0.5,
      flutter: 0.45,
      colorFn: colorFn(1),
    });
    addNaturalCenter(
      b,
      rng,
      diameter * 0.095,
      diameter * 0.07,
      srgb("#232c5e"),
      srgb(palette.daisyCenter),
      srgb("#f59a1e"),
    );
  });

  // feathery leaves low on the stem
  const leaves = rng.int(2, 3);
  for (let i = 0; i < leaves; i++) {
    addLeaf(b, rng, headY * rng.range(0.25, 0.6), headY, diameter * rng.range(0.5, 0.8), diameter * 0.05, srgb(palette.foliageTeal));
  }
  return { builder: b, headPivotY: headY };
}

export function buildDaisy(
  seed: number,
  headY: number,
  diameter: number,
  facing: [number, number, number] = [10, 0, 0],
  variant: "white" | "orange" | "yellow" = "white",
): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  addStem(b, headY, 0.0012 + diameter * 0.005, rng, {});

  const white = srgb(palette.white);
  const orange = srgb(palette.orange);
  const yellow = srgb(palette.yellow);
  const petalCount = variant === "white" ? rng.int(15, 19) : rng.int(11, 13);

  headSection(b, headY, facing, () => {
    addIrregularPetals(b, rng, {
      count: petalCount,
      length: diameter * 0.40,
      width: diameter * (variant === "white" ? 0.10 : 0.17),
      cone: 0.18,
      cup: 0.35,
      arch: 0.5,
      baseRadius: diameter * 0.08,
      nu: 5,
      nv: 2,
      wildness: 0.5,
      curl: 0.3,
      flutter: 0.5,
      colorFn: (u, _va, petalIdx) => {
        const petalLum = 0.88 + 0.2 * (0.5 + 0.5 * Math.sin(petalIdx * 7.31 + 1.7));
        if (variant === "white") {
          // creamy whites: shadowed base, bright blade
          return white
            .clone()
            .lerp(srgb("#cdbf9d"), (1 - smoothstep01(u * 2.6)) * 0.5)
            .multiplyScalar((0.72 + 0.38 * smoothstep01(u * 1.6)) * petalLum);
        }
        if (variant === "yellow")
          return yellow.clone().lerp(orange, smoothstep01((u - 0.35) * 1.2) * 0.5).multiplyScalar(petalLum);
        // orange daisy: yellow glow at the petal base, saturated orange blade
        return orange.clone().lerp(yellow, (1 - smoothstep01(u * 2.4)) * 0.55).multiplyScalar(petalLum);
      },
    });
    const centerCol = variant === "white" ? srgb(palette.daisyCenter) : srgb(palette.daisyCenterNavy);
    const rimCol = variant === "white" ? srgb("#c98f10") : srgb("#27356b");
    addCenterDome(b, diameter * 0.10, diameter * 0.06, (r) => centerCol.clone().lerp(rimCol, r * r));
  });
  return { builder: b, headPivotY: headY };
}

export function buildBud(seed: number, headY: number, size: number, tint?: string): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  addStem(b, headY, 0.0012 + size * 0.02, rng, { bow: rng.range(0.02, 0.05) });
  const base = tint ? srgb(tint) : srgb(palette.foliageTealMid).multiplyScalar(0.8).offsetHSL(0, -0.06, 0);
  const tipCol = tint
    ? srgb(tint).clone().offsetHSL(0, 0.05, 0.08)
    : srgb(palette.foliageTealLight).multiplyScalar(0.85).offsetHSL(0, -0.05, 0);
  headSection(b, headY, [rng.range(-14, 14), rng.range(0, 360), 0], () => {
    b.grid(7, 9, (u, v, pos, normal) => {
      const phi = u * Math.PI;
      const theta = v * Math.PI * 2;
      // teardrop: fat base, pointed crown
      const r = Math.sin(phi) * (1 - u * 0.25) * size * 0.55;
      const y = (u - 0.35) * size * 1.15;
      const n = new Vector3(Math.cos(theta) * Math.sin(phi), Math.cos(phi) * 0.8 + 0.3, Math.sin(theta) * Math.sin(phi));
      normal.copy(n).normalize();
      // subtle vertical sepal ridges
      const ridge = 1 - 0.08 * (0.5 + 0.5 * Math.sin(theta * 5));
      pos.set(Math.cos(theta) * r * ridge, y, Math.sin(theta) * r * ridge);
      return {
        color: base.clone().lerp(tipCol, u),
        data: { s: 1, head: 1, flutter: 0.1, phase: theta },
      };
    });
  });
  return { builder: b, headPivotY: headY };
}

export function buildMaroonBloom(
  seed: number,
  headY: number,
  diameter: number,
  facing: [number, number, number] = [8, 0, 0],
): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  addStem(b, headY, 0.0018 + diameter * 0.008, rng, {});
  const maroon = srgb(palette.maroon);
  const red = srgb(palette.crimson);
  headSection(b, headY, facing, () => {
    for (let layer = 0; layer < 3; layer++) {
      const lf = layer / 2;
      addIrregularPetals(b, rng, {
        count: 9 + layer,
        length: diameter * 0.5 * (1 - lf * 0.45),
        width: diameter * 0.24 * (1 - lf * 0.25),
        cone: 0.15 - lf * 0.45, // inner layers cup upward
        cup: 0.9,
        arch: 1.1,
        baseRadius: diameter * 0.04,
        nu: 4,
        nv: 2,
        wildness: 0.9,
        curl: 0.45,
        flutter: 0.3,
        colorFn: (u, _va, petalIdx) =>
          maroon
            .clone()
            .lerp(red, smoothstep01(u * 1.3) * 0.5)
            .multiplyScalar((0.5 + 0.45 * u) * (0.8 + 0.35 * (0.5 + 0.5 * Math.sin(petalIdx * 7.7)))),
      });
    }
    addCenterDome(b, diameter * 0.08, diameter * 0.05, () => srgb("#2e070b"));
  });
  return { builder: b, headPivotY: headY };
}

/** Sprig of tiny clustered blooms (red gypsophila-like or cobalt micro-flowers). */
export function buildMicroSprig(
  seed: number,
  topY: number,
  spread: number,
  kind: "red" | "blue" | "violet",
): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  const mainH = topY * 0.7;
  addStem(b, mainH, 0.0016, rng, { bow: rng.range(0.015, 0.045), flutterTop: 0.15 });

  const colors: Record<string, [Color, Color]> = {
    red: [srgb(palette.red), srgb(palette.crimson)],
    blue: [srgb(palette.cobalt).multiplyScalar(0.85), srgb(palette.cobaltHi).multiplyScalar(0.85)],
    violet: [srgb(palette.violet).multiplyScalar(0.85), srgb(palette.violetHi).multiplyScalar(0.85)],
  };
  const [cA, cB] = colors[kind];
  const stemCol = srgb(palette.stemCyan);

  const count = kind === "red" ? rng.int(14, 20) : rng.int(7, 11);
  for (let i = 0; i < count; i++) {
    const ang = rng.range(0, Math.PI * 2);
    const rad = spread * Math.sqrt(rng.next()) * 0.5;
    const y = topY * rng.range(0.72, 1.0);
    const px = Math.cos(ang) * rad;
    const pz = Math.sin(ang) * rad;
    const attachY = mainH * rng.range(0.75, 0.98);
    const sAvg = Math.min(1, y / topY);
    const phase = rng.next() * Math.PI * 2;

    // pedicel: thin line quad from main stem to bloom
    b.grid(3, 1, (u, v, pos) => {
      const va = v * 2 - 1;
      const x = px * u;
      const z = pz * u;
      const yy = attachY + (y - attachY) * u;
      pos.set(x + va * 0.0012, yy, z);
      return { color: stemCol.clone().multiplyScalar(0.9), data: { s: Math.min(1, yy / topY), head: 0, flutter: 0.25 * u, phase } };
    });

    const bloomR = spread * rng.range(0.052, 0.085);
    const col = varied(cA.clone().lerp(cB, rng.next()), rng, 0.05);
    if (kind === "red") col.multiplyScalar(1.25);
    if (kind === "red") {
      // tiny pom cluster: 3-5 lobes so the blossom reads floral, not berry
      const lobes = rng.int(3, 5);
      for (let li = 0; li < lobes; li++) {
        const la = (li / lobes) * Math.PI * 2 + rng.range(-0.5, 0.5);
        const lr = bloomR * rng.range(0.3, 0.55);
        const lc = varied(col, rng, 0.06).multiplyScalar(rng.range(0.85, 1.15));
        addBlob(
          b,
          new Vector3(px + Math.cos(la) * lr, y + rng.range(-0.3, 0.5) * lr, pz + Math.sin(la) * lr),
          bloomR * rng.range(0.38, 0.52),
          0.9,
          lc,
          sAvg,
          0.5,
          phase + li,
        );
      }
    } else {
      // tiny open rosette: 5 rounded petals
      _m.makeRotationFromEuler(new Euler(rng.range(0.7, 1.35), rng.range(-0.6, 0.6), 0, "YXZ")).setPosition(px, y, pz);
      // sprig blooms bend with the stem envelope at their attach height —
      // no rigid pivot (each pedicel carries its own bloom)
      b.section(_m, () => {
        addPetalRing(b, rng, {
          count: 5,
          length: bloomR * 1.8,
          width: bloomR * 1.4,
          cone: 0.25,
          cup: 0.4,
          arch: 0.3,
          baseRadius: bloomR * 0.2,
          nu: 2,
          nv: 1,
          flutter: 0.55,
          headFlag: 0,
          sOverride: sAvg,
          colorFn: (u) => col.clone().multiplyScalar(0.8 + 0.45 * u),
        });
        addCenterDome(b, bloomR * 0.3, bloomR * 0.2, () => srgb(kind === "blue" ? "#dfe6ff" : "#2a0a3a"), 0.06, 0, sAvg);
      });
    }
  }
  return { builder: b, headPivotY: topY };
}

/**
 * Unit mid-distance flower head (head only, white albedo — per-instance tint
 * colors it). Root at origin, head pivot at y=1; instanceMatrix scales.
 * Rendered beyond ~1.8m where DOF melts it into a soft colored bloom.
 */
export function buildMidFlowerHead(seed: number): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  const d = 0.16;
  headSection(b, 1.0, [rng.range(30, 80), rng.range(0, 360), 0], () => {
    addPetalRing(b, rng, {
      count: rng.int(6, 8),
      length: d * 0.45,
      width: d * 0.3,
      cone: 0.35,
      cup: 0.5,
      arch: 0.7,
      baseRadius: d * 0.05,
      nu: 3,
      nv: 1,
      flutter: 0.4,
      colorFn: (u) => new Color(1, 1, 1).multiplyScalar(0.65 + 0.45 * smoothstep01(u)),
    });
    addCenterDome(b, d * 0.1, d * 0.06, () => new Color(0.32, 0.28, 0.3));
  });
  return { builder: b, headPivotY: 1.0 };
}

/**
 * Wiry tangle stem — the connective tissue of the reference meadow.
 * Unit height 1: curved (two bow harmonics), optionally nodding over at the
 * tip, with 0–2 side branches, a bud or two, and tiny leaf flecks.
 * Rendered as thin ribbons (camera is frontal and locked).
 */
export function buildWiryStem(seed: number): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  const stemCol = srgb(palette.stemCyan).multiplyScalar(1.35);
  const darkCol = srgb(palette.foliageTealDark);

  const bow1 = rng.gauss() * 0.1;
  const bow2 = rng.gauss() * 0.05;
  const bowAng = rng.range(0, Math.PI * 2);
  const hook = rng.next() < 0.42 ? rng.range(0.1, 0.26) : 0; // nodding tip
  const hookAng = rng.range(0, Math.PI * 2);
  const baseW = rng.range(0.0014, 0.0042);

  const center = (t: number, out: Vector3) => {
    const b1 = Math.sin(t * Math.PI) * bow1;
    const b2 = Math.sin(t * Math.PI * 2) * bow2;
    const hk = hook * smoothstep01((t - 0.72) / 0.28) ** 2;
    out.set(
      Math.cos(bowAng) * (b1 + b2) + Math.cos(hookAng) * hk,
      t - hk * 0.55, // the hooked tip dips
      Math.sin(bowAng) * (b1 + b2) * 0.5 + Math.sin(hookAng) * hk,
    );
  };

  const ribbon = (
    fn: (t: number, out: Vector3) => void,
    t0: number,
    t1: number,
    w0: number,
    segs: number,
    col: Color,
    sScale = 1,
  ) => {
    const c = new Vector3();
    b.grid(segs, 1, (u, v, pos, normal) => {
      const t = t0 + (t1 - t0) * u;
      fn(t, c);
      const va = v * 2 - 1;
      const w = w0 * (1 - u * 0.55);
      pos.set(c.x + va * w, c.y, c.z);
      normal.set(0, 0, 1);
      const shade = 0.55 + 0.45 * rngShade(t, seed);
      return {
        color: col.clone().multiplyScalar(shade),
        data: { s: Math.min(1, t * sScale), head: 0, flutter: 0.12 * t, phase: seed % 7 },
      };
    });
  };

  ribbon(center, 0, 1, baseW, 9, rng.next() < 0.3 ? darkCol : stemCol);

  // side branches
  const branches = rng.int(0, 2);
  const cAt = new Vector3();
  for (let i = 0; i < branches; i++) {
    const t0 = rng.range(0.45, 0.78);
    center(t0, cAt);
    const ang = rng.range(0, Math.PI * 2);
    const len = rng.range(0.12, 0.28);
    const up = rng.range(0.55, 1.1);
    const bx = cAt.x;
    const by = cAt.y;
    const bz = cAt.z;
    const branchFn = (t: number, out: Vector3) => {
      const tt = t;
      out.set(
        bx + Math.cos(ang) * Math.cos(up) * tt * len,
        by + Math.sin(up) * tt * len - tt * tt * len * 0.25,
        bz + Math.sin(ang) * Math.cos(up) * tt * len * 0.6,
      );
    };
    ribbon(branchFn, 0.05, 1, baseW * 0.6, 4, stemCol, 1);
    if (rng.next() < 0.3) {
      // small bud at branch tip — some teal, some red-tipped like the reference
      branchFn(1, cAt);
      const budCol =
        rng.next() < 0.35
          ? srgb(palette.red).multiplyScalar(1.1)
          : varied(srgb(palette.foliageTealMid), rng, 0.06).multiplyScalar(1.2);
      addBlob(b, cAt.clone(), rng.range(0.0035, 0.006), 1.25, budCol, Math.min(1, t0 + 0.2), 0.2, i * 2.1);
    }
  }

  // main-tip bud for hooked stems
  if (hook > 0 && rng.next() < 0.65) {
    center(1, cAt);
    const budCol = rng.next() < 0.3 ? srgb(palette.crimson).multiplyScalar(1.15) : varied(srgb(palette.foliageTealMid), rng, 0.08).multiplyScalar(1.2);
    addBlob(b, cAt.clone(), rng.range(0.005, 0.009), 1.3, budCol, 1, 0.15, 3.3);
  }

  // tiny leaf flecks
  const leaves = rng.int(1, 3);
  for (let i = 0; i < leaves; i++) {
    const t0 = rng.range(0.25, 0.7);
    center(t0, cAt);
    const ang = rng.range(0, Math.PI * 2);
    const len = rng.range(0.04, 0.1);
    const lx = cAt.x;
    const ly = cAt.y;
    const lz = cAt.z;
    ribbon(
      (t, out) =>
        out.set(
          lx + Math.cos(ang) * t * len,
          ly + t * len * 0.7 - t * t * len * 0.5,
          lz + Math.sin(ang) * t * len * 0.5,
        ),
      0,
      1,
      0.006,
      3,
      varied(srgb(palette.foliageTeal), rng, 0.08),
    );
  }

  return { builder: b, headPivotY: 1 };
}

/** Deterministic pseudo-shade along a stem (no Math.random anywhere). */
function rngShade(t: number, seed: number): number {
  const x = Math.sin(t * 37.7 + seed * 0.61) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Feathery cosmos-foliage clump: thread-like leaflets radiating from stem
 * nodes — the sharp green-teal filigree visible through the reference's
 * focus band. Unit height ~0.5.
 */
export function buildFeatherClump(seed: number): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  const teal = srgb(palette.foliageTeal);
  const light = srgb(palette.foliageTealLight);
  const stems = rng.int(2, 3);
  for (let sIdx = 0; sIdx < stems; sIdx++) {
    const baseAng = rng.range(0, Math.PI * 2);
    const lean = rng.range(0.05, 0.3);
    const h = rng.range(0.3, 0.5);
    const bx = Math.cos(baseAng) * lean;
    const bz = Math.sin(baseAng) * lean;
    // node heights along a leaning axis
    const nodes = rng.int(2, 4);
    for (let n = 0; n <= nodes; n++) {
      const t0 = 0.35 + (0.65 * n) / nodes;
      const nx = bx * t0;
      const ny = h * t0;
      const nz = bz * t0;
      const threads = rng.int(3, 6);
      for (let i = 0; i < threads; i++) {
        const ang = rng.range(0, Math.PI * 2);
        const up = rng.range(-0.2, 0.9);
        const len = rng.range(0.05, 0.14);
        const col = varied(teal.clone().lerp(light, rng.next() * 0.7), rng, 0.07);
        const phase = rng.next() * Math.PI * 2;
        b.grid(3, 1, (u, v, pos) => {
          const va = v * 2 - 1;
          const w = 0.0024 * (1 - u * 0.6);
          pos.set(
            nx + Math.cos(ang) * Math.cos(up) * u * len + va * w,
            ny + Math.sin(up) * u * len - u * u * len * 0.3,
            nz + Math.sin(ang) * Math.cos(up) * u * len * 0.7,
          );
          return {
            color: col.clone().multiplyScalar(0.7 + 0.5 * u),
            data: { s: Math.min(1, t0), head: 0, flutter: 0.3 * u, phase },
          };
        });
      }
    }
  }
  return { builder: b, headPivotY: 0.5 };
}

/** Low dark leafy tuft filling the meadow floor. Unit height ~0.35. */
export function buildFoliageTuft(seed: number): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  const teal = srgb(palette.foliageTeal);
  const dark = srgb(palette.foliageTealDark);
  const blades = rng.int(5, 8);
  for (let i = 0; i < blades; i++) {
    const theta = (i / blades) * Math.PI * 2 + rng.range(-0.5, 0.5);
    const up = rng.range(0.7, 1.25);
    const len = rng.range(0.2, 0.4);
    const col = dark.clone().lerp(teal, rng.next() * 0.6);
    const phase = rng.next() * Math.PI * 2;
    _m.makeRotationFromEuler(new Euler(0, -theta, 0, "YXZ"));
    b.section(_m, () => {
      b.grid(4, 1, (u, v, pos) => {
        const va = v * 2 - 1;
        const half = 0.014 * Math.sin(Math.PI * Math.min(1, 0.2 + u * 0.85));
        pos.set(u * len * Math.cos(up * (1 - u * 0.4)), u * len * Math.sin(up * (1 - u * 0.4)), va * half);
        return {
          color: col.clone().multiplyScalar(0.7 + 0.5 * u),
          data: { s: u * 0.6, head: 0, flutter: 0.25 * u, phase },
        };
      });
    });
  }
  return { builder: b, headPivotY: 0.35 };
}

/** Huge soft foreground flower — silhouette donor for the extreme-blur zone. */
export function buildForegroundMass(
  seed: number,
  headY: number,
  diameter: number,
  tint: string,
): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  addStem(b, headY, diameter * 0.018, rng, { bow: rng.range(0.02, 0.06) });
  const cBase = srgb(tint);
  const cLite = srgb(tint).offsetHSL(0, 0.02, 0.12);
  headSection(b, headY, [rng.range(45, 85), rng.range(-40, 40), 0], () => {
    addPetalRing(b, rng, {
      count: rng.int(6, 8),
      length: diameter * 0.42,
      width: diameter * 0.34,
      cone: 0.5,
      cup: 0.5,
      arch: 0.9,
      baseRadius: diameter * 0.06,
      nu: 3,
      nv: 2,
      flutter: 0.35,
      colorFn: (u, va) => cBase.clone().lerp(cLite, smoothstep01(u) * 0.8).multiplyScalar(1 - 0.1 * Math.abs(va)),
    });
    addCenterDome(b, diameter * 0.12, diameter * 0.07, () => cBase.clone().multiplyScalar(0.55));
  });
  return { builder: b, headPivotY: headY };
}
