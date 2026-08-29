/**
 * Procedural botanical species builders. Every builder is deterministic in
 * its seed; dimensions are passed in meters so composition config controls
 * exact framed sizes. Geometry convention: root at origin, stem rises +Y,
 * head pivot at (0, headPivotY, 0); the whole plant may then be yawed/tilted
 * slightly via its mesh transform (rotation about the root keeps roots put).
 */
import { Color, Matrix4, Vector3, Euler } from "three";
import { GeomBuilder } from "./GeomBuilder";
import { CENTER_CELL, PETAL_CELLS } from "./petalTextures";
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
  opts: {
    bow?: number;
    color?: Color;
    flutterTop?: number;
    radial?: number;
    segs?: number;
    sMax?: number;
    /** Darken the lower part of the stalk so it fades into the tangle. */
    fadeLow?: number;
  } = {},
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
    const fadeLow = opts.fadeLow ?? 0;
    const emerge = fadeLow > 0 ? 0.25 + 0.75 * smoothstep01(u / fadeLow) : 1;
    const col = color.clone().multiplyScalar((0.72 + 0.16 * u) * emerge);
    return { color: col, data: { s: u * (opts.sMax ?? 1), head: 0, flutter: flutterTop * u * u, phase: 0 } };
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

export interface TexturedPetalOptions {
  count: number;
  /** Visible petal length / width (meters). */
  length: number;
  width: number;
  /** Sweep BACK from the face plane (radians, positive = petals droop away). */
  cone: number;
  /**
   * Cup elevation (radians): how far petals RISE out of the receptacle
   * plane, forming a bowl. This is the parameter that makes an oblique
   * flower read as volumetric — the far petals stand up around the cup
   * while the near ones foreshorten into the rim.
   */
  elevation?: number;
  /** Extra rise applied to the petal's outer half (bowl flare). */
  flare?: number;
  cup: number;
  arch: number;
  baseRadius: number;
  flutter?: number;
  wildness?: number;
  curl?: number;
  nu?: number;
  nv?: number;
  /** Per-petal luminance variation range (multiplies the painted albedo). */
  lum?: [number, number];
  /** Base tint multiplied into the painted albedo (fg masses reuse the
   * neutral atlas with their own hue). */
  tint?: Color;
  /**
   * Structural ambient occlusion inside the cup: albedo scale at the petal
   * BASE (throat), ramping to 1 at the tip. Real flowers are darkest deep
   * in the corolla — this is geometry-driven shading, not noise.
   */
  aoBase?: number;
  /** Elevation jitter per petal (radians) — uneven whorls. */
  elevJitter?: number;
}

/**
 * HIGH-FIDELITY petals: simple curved cards mapped onto the painted petal
 * atlas — the artwork's alpha carries an organic silhouette (serrated,
 * lobed, ruffled tips) and its albedo carries veins/gradients/mottling.
 * Per-petal pose keeps the natural irregularity (droop stagger, twist,
 * curl, uneven spacing); per-petal cell choice + mirroring + luminance
 * variation kill cloning.
 */
export function addTexturedPetals(b: GeomBuilder, rng: Rng, o: TexturedPetalOptions): void {
  const nu = o.nu ?? 7;
  const nv = o.nv ?? 3;
  const wild = o.wildness ?? 0.7;
  const curlAmt = o.curl ?? 0.5;
  const lumLo = o.lum?.[0] ?? 0.78;
  const lumHi = o.lum?.[1] ?? 1.12;
  // the painted petal spans ~88% of its atlas cell width
  const cardHalf = (o.width / 0.88) * 0.5;

  const angles: number[] = [];
  for (let i = 0; i < o.count; i++) {
    angles.push((i / o.count) * Math.PI * 2 + rng.gauss() * (1.4 / o.count) * wild);
  }

  const elevation = o.elevation ?? 0;
  const flare = o.flare ?? 0;
  const aoBase = o.aoBase ?? 1;

  for (let i = 0; i < o.count; i++) {
    const theta = angles[i];
    const len = o.length * (1 + rng.gauss() * 0.12 * wild);
    const cone = o.cone + rng.gauss() * 0.22 * wild;
    const elev = elevation + rng.gauss() * (o.elevJitter ?? 0.14) * wild;
    const roll = rng.gauss() * 0.2 * wild;
    const curl = rng.gauss() * curlAmt * wild;
    const lift = rng.gauss() * 0.012 * wild * len;
    const baseR = o.baseRadius * (1 + rng.gauss() * 0.15 * wild);
    const phase = rng.next() * Math.PI * 2;
    const lum = rng.range(lumLo, lumHi);
    const cell = PETAL_CELLS[rng.int(0, PETAL_CELLS.length - 1)];
    const mirror = rng.next() < 0.5 ? -1 : 1;
    const color = o.tint ? o.tint.clone().multiplyScalar(lum) : new Color(lum, lum, lum);

    _m.makeRotationFromEuler(new Euler(0, -theta, roll, "YXZ"));
    b.section(_m, () => {
      const base = b.vertexCount;
      const pos = new Vector3();
      const nrm = new Vector3();
      for (let iu = 0; iu <= nu; iu++) {
        for (let iv = 0; iv <= nv; iv++) {
          const u = iu / nu;
          const va = (iv / nv) * 2 - 1;
          // radial reach shortens as the petal rises out of the cup
          const x = baseR + u * len * Math.cos(elev + flare * u);
          const y =
            Math.sin(elev) * u * len +
            flare * u * u * len * 0.55 +
            -Math.sin(cone) * u * len +
            o.arch * Math.sin(u * Math.PI) * len * 0.2 +
            curl * u * u * len * 0.55 +
            o.cup * (1 - va * va) * o.width * 0.15 +
            lift;
          pos.set(x, y, va * cardHalf);
          nrm.set(0, 0, 0);
          // structural AO: darkest deep in the throat, opening toward the tip
          const ao = aoBase + (1 - aoBase) * smoothstep01(u * 1.45);
          b.vertex(
            pos,
            nrm,
            cell.u0 + (0.5 + (va * mirror) / 2) * cell.du,
            cell.v0 + u * cell.dv,
            color.clone().multiplyScalar(ao),
            { s: 1, head: 1, flutter: (o.flutter ?? 0.45) * u * u, phase, tex: 1 },
          );
        }
      }
      for (let iu = 0; iu < nu; iu++) {
        for (let iv = 0; iv < nv; iv++) {
          const a = base + iu * (nv + 1) + iv;
          const c2 = base + (iu + 1) * (nv + 1) + iv;
          b.quad(a, c2, c2 + 1, a + 1);
        }
      }
      b.finishGridNormals(base, nu, nv);
    });
  }
}

/**
 * Textured flower center: a bulging dome mapped onto the atlas center-disc
 * artwork (florets/pollen painted), for close-inspection detail.
 */
export function addTexturedCenter(
  b: GeomBuilder,
  rng: Rng,
  radius: number,
  height: number,
): void {
  const lum = rng.range(0.95, 1.05);
  const color = new Color(lum, lum, lum);
  b.grid(6, 14, (u, v, pos, normal) => {
    const r = Math.sin(Math.min(1, u * 1.12) * Math.PI * 0.5) * radius;
    const ang = v * Math.PI * 2;
    const y = (1 - u * u) * height;
    pos.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
    const n = new Vector3(Math.cos(ang) * u, 1.1 * (1 - u * 0.6), Math.sin(ang) * u).normalize();
    normal.copy(n);
    return {
      color,
      data: { s: 1, head: 1, flutter: 0.04 * u, phase: ang, tex: 1 },
      uv: [CENTER_CELL.cu + u * CENTER_CELL.r * Math.cos(ang), CENTER_CELL.cv + u * CENTER_CELL.r * Math.sin(ang)] as [number, number],
    };
  });
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
  const n = rng.int(12, 17);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rng.range(-0.09, 0.09);
    const rr = radius * rng.range(0.68, 0.8);
    const y = height * rng.range(0.6, 0.85);
    const sr = radius * rng.range(0.105, 0.14);
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
  nu = 6,
  nv = 8,
): void {
  b.grid(nu, nv, (u, v, pos, normal) => {
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
  _variant: "magenta" | "violet" = "magenta",
): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  addStem(b, headY, 0.0014 + diameter * 0.006, rng, {});

  // variant selects the painted atlas (magenta hero vs violet second bloom)
  // — see MeadowScene, which attaches the matching petal artwork.
  //
  // MORPHOLOGY (silhouette-matched against the reference, not tuned by
  // arbitrary angles): a shallow BOWL. Petals rise ~40° out of the
  // receptacle plane and flare outward, so when the head is pitched
  // obliquely the far petals stand up around the cup while the near ones
  // foreshorten into a smooth rim — the wide, volumetric, side-biased
  // silhouette of the reference, not a frontal radial disc.
  headSection(b, headY, facing, () => {
    // outer whorl: longer, lower, sweeping back — reads as the cup's rim
    addTexturedPetals(b, rng, {
      count: 7,
      length: diameter * 0.54,
      width: diameter * 0.31,
      cone: 0.16,
      elevation: 0.34,
      flare: 0.46,
      cup: 0.75,
      arch: 0.55,
      baseRadius: diameter * 0.05,
      nu: Math.round(7 * detail) + 2,
      nv: 3,
      wildness: 0.85,
      elevJitter: 0.2,
      curl: 0.3,
      flutter: 0.45,
      lum: [0.8, 1.08],
      aoBase: 0.46,
    });
    // inner whorl: shorter, steeper — the standing petals inside the bowl
    addTexturedPetals(b, rng, {
      count: 8,
      length: diameter * 0.46,
      width: diameter * 0.28,
      cone: 0.0,
      elevation: 0.62,
      flare: 0.3,
      cup: 0.95,
      arch: 0.4,
      baseRadius: diameter * 0.038,
      nu: Math.round(7 * detail) + 2,
      nv: 3,
      wildness: 0.75,
      elevJitter: 0.22,
      curl: 0.34,
      flutter: 0.45,
      lum: [1.0, 1.34],
      aoBase: 0.38,
    });
    // receptacle sits LOW in the cup — a foreshortened dark wedge under an
    // oblique head, exactly as the reference reads
    addTexturedCenter(b, rng, diameter * 0.085, diameter * 0.05);
    const stamen = srgb(palette.daisyCenter);
    const stamenHot = srgb("#f59a1e");
    const n = rng.int(9, 12);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rng.range(-0.12, 0.12);
      const rr = diameter * 0.085 * rng.range(0.7, 0.88);
      addBlob(
        b,
        new Vector3(Math.cos(ang) * rr, diameter * 0.05 * rng.range(0.7, 1.0), Math.sin(ang) * rr),
        diameter * rng.range(0.008, 0.0115),
        0.8,
        varied(stamen.clone().lerp(stamenHot, rng.next()), rng, 0.05),
        1,
        0.05,
        ang,
        1,
      );
    }
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

  const petalCount = variant === "white" ? rng.int(15, 19) : rng.int(11, 13);
  headSection(b, headY, facing, () => {
    addTexturedPetals(b, rng, {
      count: petalCount,
      length: diameter * 0.4,
      width: diameter * (variant === "white" ? 0.11 : 0.17),
      cone: 0.18,
      cup: 0.35,
      arch: 0.5,
      baseRadius: diameter * 0.08,
      nu: 5,
      nv: 2,
      wildness: 0.5,
      curl: 0.3,
      flutter: 0.5,
      lum: variant === "white" ? [0.82, 1.08] : [0.78, 1.1],
    });
    addTexturedCenter(b, rng, diameter * 0.1, diameter * 0.06);
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
  headSection(b, headY, facing, () => {
    for (let layer = 0; layer < 3; layer++) {
      const lf = layer / 2;
      addTexturedPetals(b, rng, {
        count: 9 + layer,
        length: diameter * 0.5 * (1 - lf * 0.45),
        width: diameter * 0.25 * (1 - lf * 0.25),
        cone: 0.15 - lf * 0.45,
        cup: 0.9,
        arch: 1.1,
        baseRadius: diameter * 0.04,
        nu: 5,
        nv: 2,
        wildness: 0.9,
        curl: 0.45,
        flutter: 0.3,
        lum: [0.55 + lf * 0.25, 0.9 + lf * 0.25],
      });
    }
    addTexturedCenter(b, rng, diameter * 0.08, diameter * 0.05);
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
  const mainH = topY * 0.52;
  // stem s runs 0..mainH/topY so pedicels/blooms (normalized by topY) share
  // one bend convention — mismatched weights shear blooms off under wind
  addStem(b, mainH, 0.00042, rng, {
    bow: rng.range(0.02, 0.07),
    flutterTop: 0.15,
    sMax: mainH / topY,
    color: srgb(palette.foliageTealDark).multiplyScalar(0.8),
    fadeLow: 0.55,
  });

  const colors: Record<string, [Color, Color]> = {
    red: [srgb(palette.red), srgb(palette.crimson)],
    blue: [srgb(palette.cobalt).multiplyScalar(0.7), srgb(palette.cobaltHi).multiplyScalar(0.7)],
    violet: [srgb(palette.violet).multiplyScalar(0.85), srgb(palette.violetHi).multiplyScalar(0.85)],
  };
  const [cA, cB] = colors[kind];
  const stemCol = srgb(palette.stemCyan);

  /** One tiny blossom: a flat 5-petal star with a pale eye. */
  const blossom = (x: number, y: number, z: number, r: number, sVal: number, col: Color, ph: number) => {
    _m.makeRotationFromEuler(
      new Euler(rng.range(0.5, 1.5), rng.range(0, Math.PI * 2), 0, "YXZ"),
    ).setPosition(x, y, z);
    b.section(_m, () => {
      const petals = 5;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + rng.range(-0.25, 0.25);
        const pr = r * rng.range(0.85, 1.15);
        b.grid(2, 1, (u, v, pos) => {
          const va = v * 2 - 1;
          const half = pr * 0.42 * Math.sin(Math.PI * Math.min(1, 0.25 + u * 0.85));
          const rad = r * 0.25 + u * pr;
          pos.set(
            Math.cos(a) * rad - Math.sin(a) * va * half,
            u * u * pr * 0.18,
            Math.sin(a) * rad + Math.cos(a) * va * half,
          );
          return {
            color: col.clone().multiplyScalar(0.82 + 0.4 * u),
            data: { s: sVal, head: 0, flutter: 0.5, phase: ph + i },
          };
        });
      }
      // a rounded heart under the star: the reference's blossoms are small
      // double flowers, not flat asterisks. One coarse dome is plenty at a
      // few pixels across — these are built in the thousands.
      addBlob(b, new Vector3(0, r * 0.14, 0), r * 0.44, 0.85, col.clone().multiplyScalar(1.25), sVal, 0.5, ph, 0, 4, 5);
    });
  };

  if (kind === "red") {
    // RED SPRAY: a branching corymb. Several stalks leave the upper stem and
    // each carries a TIGHT umbel of many tiny blossoms — the reference's
    // airy scarlet clouds. (Blossoms on long individual pedicels read as
    // "sticks with a dot", which is exactly what this replaces.)
    const branches = rng.int(5, 8);
    const cAt = new Vector3();
    for (let bi = 0; bi < branches; bi++) {
      const t0 = rng.range(0.5, 0.95);
      const baseY = mainH * t0;
      const ang = rng.range(0, Math.PI * 2);
      const reach = spread * rng.range(0.22, 0.75);
      // umbels ride at the TOP of the sprig, where the reference's scarlet
      // clouds sit — not down in the dark understory
      const cy = topY * rng.range(0.66, 1.06);
      const rise = cy - baseY;
      const cx = Math.cos(ang) * reach;
      const cz = Math.sin(ang) * reach * 0.7;
      const sTip = Math.min(1, cy / topY);
      const bend = rng.range(-0.5, 0.5);
      // curved stalk out to the umbel
      b.grid(5, 1, (u, v, pos) => {
        const va = v * 2 - 1;
        const a2 = ang + bend * u * u;
        const rr = reach * u;
        pos.set(
          Math.cos(a2) * rr + va * 0.0005,
          baseY + rise * u * (1.15 - 0.15 * u),
          Math.sin(a2) * rr * 0.7,
        );
        return {
          color: stemCol.clone().multiplyScalar(0.85 + 0.3 * u),
          data: { s: Math.min(1, (baseY + rise * u) / topY), head: 0, flutter: 0.3 * u, phase: bi },
        };
      });
      // the umbel itself: a dense rounded head of tiny blossoms
      const n = rng.int(26, 38);
      const uR = spread * rng.range(0.13, 0.22);
      for (let i = 0; i < n; i++) {
        const a = rng.range(0, Math.PI * 2);
        const rr = uR * Math.sqrt(rng.next());
        const yy = cy + rng.gauss() * uR * 0.5;
        cAt.set(cx + Math.cos(a) * rr, yy, cz + Math.sin(a) * rr * 0.8);
        blossom(
          cAt.x,
          cAt.y,
          cAt.z,
          spread * rng.range(0.032, 0.052),
          sTip,
          varied(cA.clone().lerp(cB, rng.next()), rng, 0.07).multiplyScalar(rng.range(0.7, 1.15)),
          i * 1.7 + bi,
        );
      }
    }
  } else {
    // scattered small rosettes on short pedicels (cornflower-like)
    const count = rng.int(7, 11);
    for (let i = 0; i < count; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const rad = spread * Math.sqrt(rng.next()) * 0.5;
      const y = topY * rng.range(0.72, 1.0);
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const attachY = mainH * rng.range(0.82, 0.99);
      const sAvg = Math.min(1, y / topY);
      const phase = rng.next() * Math.PI * 2;
      b.grid(3, 1, (u, v, pos) => {
        const va = v * 2 - 1;
        pos.set(px * u + va * 0.0012, attachY + (y - attachY) * u, pz * u);
        return {
          color: stemCol.clone().multiplyScalar(0.9),
          data: { s: Math.min(1, (attachY + (y - attachY) * u) / topY), head: 0, flutter: 0.25 * u, phase },
        };
      });
      blossom(
        px,
        y,
        pz,
        spread * rng.range(0.1, 0.16),
        sAvg,
        varied(cA.clone().lerp(cB, rng.next()), rng, 0.05),
        phase,
      );
    }
  }
  return { builder: b, headPivotY: topY };
}

/**
 * Unit mid-distance flower head (head only, neutral albedo — per-instance
 * tint colours it). Root at origin, head pivot at y=1; instanceMatrix
 * scales. Rendered beyond ~2m where DOF melts it into a soft bloom.
 */
export function buildMidFlowerHead(seed: number): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  const d = 0.16;
  headSection(b, 1.0, [rng.range(22, 62), rng.range(0, 360), rng.range(-25, 25)], () => {
    addTexturedPetals(b, rng, {
      count: rng.int(6, 8),
      length: d * 0.45,
      width: d * 0.31,
      cone: 0.16,
      elevation: 0.42,
      flare: 0.3,
      cup: 0.6,
      arch: 0.7,
      baseRadius: d * 0.05,
      nu: 4,
      nv: 2,
      wildness: 0.7,
      elevJitter: 0.2,
      curl: 0.35,
      flutter: 0.4,
      lum: [0.78, 1.18],
      aoBase: 0.5,
    });
    addTexturedCenter(b, rng, d * 0.085, d * 0.05);
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
  const stemCol = srgb("#2f6153");
  const darkCol = srgb(palette.foliageTealDark).multiplyScalar(1.0);

  const bow1 = rng.gauss() * 0.19;
  const bow2 = rng.gauss() * 0.09;
  const bowAng = rng.range(0, Math.PI * 2);
  const hook = rng.next() < 0.42 ? rng.range(0.1, 0.26) : 0; // nodding tip
  const hookAng = rng.range(0, Math.PI * 2);
  const baseW = rng.range(0.0003, 0.00065);

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

  // sBase/sSpan: bend weight tracks the ATTACH HEIGHT on the main stem, so a
  // branch at t0 starts with the stem's own weight there and gains only its
  // own vertical extent — otherwise side parts shear off under wind.
  const ribbon = (
    fn: (t: number, out: Vector3) => void,
    t0: number,
    t1: number,
    w0: number,
    segs: number,
    col: Color,
    sBase = 0,
    sSpan = 1,
  ) => {
    const c = new Vector3();
    b.grid(segs, 1, (u, v, pos, normal) => {
      const t = t0 + (t1 - t0) * u;
      fn(t, c);
      const va = v * 2 - 1;
      const w = w0 * (1 - u * 0.55);
      pos.set(c.x + va * w, c.y, c.z);
      normal.set(0, 0, 1);
      const shade = 0.6 + 0.34 * rngShade(t, seed);
      // vanish softly at both ends so no stem reads as a drawn line
      const sHere = Math.min(1, sBase + t * sSpan);
      const fade = smoothstep01(sHere / 0.25) * (1 - 0.55 * smoothstep01((sHere - 0.55) / 0.45));
      return {
        color: col.clone().multiplyScalar(shade * (0.35 + 0.65 * fade)),
        data: { s: Math.min(1, sBase + t * sSpan), head: 0, flutter: 0.12 * (sBase + t * sSpan), phase: seed % 7 },
      };
    });
  };

  ribbon(center, 0, 1, baseW, 9, rng.next() < 0.3 ? darkCol : stemCol);

  // side branches
  const branches = rng.int(1, 3);
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
    const bend = rng.range(-0.7, 0.7);
    const branchFn = (t: number, out: Vector3) => {
      const a2 = ang + bend * t * t;
      out.set(
        bx + Math.cos(a2) * Math.cos(up) * t * len,
        by + Math.sin(up) * t * len - t * t * len * 0.42,
        bz + Math.sin(a2) * Math.cos(up) * t * len * 0.6,
      );
    };
    ribbon(branchFn, 0.05, 1, baseW * 0.6, 4, stemCol, t0, Math.sin(up) * len);
    if (rng.next() < 0.3) {
      // small bud at branch tip — some teal, some red-tipped like the reference
      branchFn(1, cAt);
      const budCol =
        rng.next() < 0.25
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
  const leaves = rng.int(3, 6);
  for (let i = 0; i < leaves; i++) {
    const t0 = rng.range(0.2, 0.85);
    center(t0, cAt);
    const ang = rng.range(0, Math.PI * 2);
    const len = rng.range(0.028, 0.062);
    const droop = rng.range(0.5, 1.3);
    const bend = rng.range(-0.5, 0.5);
    const lx = cAt.x;
    const ly = cAt.y;
    const lz = cAt.z;
    ribbon(
      (t, out) =>
        out.set(
          // curved leaflet: arcs outward and nods over — no straight strokes
          lx + Math.cos(ang + bend * t * t) * t * len,
          ly + t * len * 0.62 - t * t * len * droop,
          lz + Math.sin(ang + bend * t * t) * t * len * 0.6,
        ),
      0,
      1,
      0.0042,
      4,
      varied(srgb(palette.foliageTeal), rng, 0.08),
      t0,
      len * 0.6,
    );
  }

  return { builder: b, headPivotY: 1 };
}

/**
 * Smooth deterministic shade along a stem. (An earlier white-noise version
 * sampled per-vertex made every ribbon render as a DASHED line — the single
 * loudest "wire frame" artifact in the midground.)
 */
function rngShade(t: number, seed: number): number {
  const a = Math.sin(t * 2.3 + seed * 0.37);
  const b = Math.sin(t * 1.1 - seed * 0.91);
  return 0.5 + 0.32 * a + 0.18 * b;
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
      const threads = rng.int(7, 12);
      for (let i = 0; i < threads; i++) {
        const ang = rng.range(0, Math.PI * 2);
        const up = rng.range(-0.2, 0.9);
        const len = rng.range(0.024, 0.058);
        const col = varied(teal.clone().lerp(light, 0.1 + rng.next() * 0.35), rng, 0.07).multiplyScalar(0.95);
        const phase = rng.next() * Math.PI * 2;
        const bendT = rng.range(-0.8, 0.8);
        b.grid(4, 1, (u, v, pos) => {
          const va = v * 2 - 1;
          const w = 0.0009 * (1 - u * 0.6);
          const a2 = ang + bendT * u * u;
          pos.set(
            nx + Math.cos(a2) * Math.cos(up) * u * len + va * w,
            ny + Math.sin(up) * u * len - u * u * len * 0.55,
            nz + Math.sin(a2) * Math.cos(up) * u * len * 0.7,
          );
          return {
            color: col.clone().multiplyScalar(0.62 + 0.4 * u),
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
    const len = rng.range(0.045, 0.1);
    const col = dark.clone().lerp(teal, rng.next() * 0.6);
    const phase = rng.next() * Math.PI * 2;
    _m.makeRotationFromEuler(new Euler(0, -theta, 0, "YXZ"));
    b.section(_m, () => {
      b.grid(4, 1, (u, v, pos) => {
        const va = v * 2 - 1;
        const half = 0.006 * Math.sin(Math.PI * Math.min(1, 0.2 + u * 0.85));
        pos.set(u * len * Math.cos(up * (1 - u * 0.4)), u * len * Math.sin(up * (1 - u * 0.4)), va * half);
        return {
          color: col.clone().multiplyScalar(0.75 + 0.45 * u),
          data: { s: u * 0.6, head: 0, flutter: 0.25 * u, phase },
        };
      });
    });
  }
  return { builder: b, headPivotY: 0.35 };
}

/**
 * EXTREME FOREGROUND flower — the near-lens forms that frame the shot.
 *
 * The reference's foreground masses are NOT circles: they are flower heads
 * inches from the lens, seen strongly oblique (often nearly edge-on), so
 * they project as ELONGATED, irregular, horizontally-biased smears, most of
 * their geometry outside the frame. Built here as coarse original 3D heads
 * with real cup morphology and near-edge-on orientation; the existing DOF
 * does the rest. Blurred flower silhouette — never a colored disc.
 */
export function buildForegroundMass(
  seed: number,
  headY: number,
  diameter: number,
  tint: string,
): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  addStem(b, headY, diameter * 0.02, rng, { bow: rng.range(0.02, 0.06) });
  // the neutral atlas mid-tones sit ~0.85; boost so masses stay luminous
  // through the heavy near-field defocus
  const cBase = srgb(tint).multiplyScalar(1.45);

  // near edge-on: a shallow pitch is what turns a round head into a long
  // smear. Roll tips the smear off horizontal, as in the reference.
  const pitch = rng.range(6, 24);
  const yaw = rng.range(-50, 50);
  const roll = rng.range(-38, 38);

  headSection(b, headY, [pitch, yaw, roll], () => {
    // elongation: petals reach further along the head's X axis than its Z,
    // so even a head-on glimpse stays oval rather than circular
    const stretch = rng.range(1.35, 1.85);
    for (const [count, lenK, widK, elev, flare, lum] of [
      [6, 0.62, 0.34, 0.3, 0.4, [0.85, 1.2]],
      [7, 0.52, 0.3, 0.62, 0.26, [1.0, 1.42]],
    ] as [number, number, number, number, number, [number, number]][]) {
      _m.makeScale(stretch, 1, 1 / stretch);
      b.section(_m, () => {
        addTexturedPetals(b, rng, {
          count,
          length: diameter * lenK,
          width: diameter * widK,
          cone: 0.14,
          elevation: elev,
          flare,
          cup: 0.7,
          arch: 0.7,
          baseRadius: diameter * 0.05,
          nu: 4,
          nv: 2,
          wildness: 0.85,
          elevJitter: 0.24,
          curl: 0.4,
          flutter: 0.35,
          lum,
          aoBase: 0.5,
          tint: cBase,
        });
      });
    }
    addTexturedCenter(b, rng, diameter * 0.1, diameter * 0.055);
  });
  return { builder: b, headPivotY: headY };
}
