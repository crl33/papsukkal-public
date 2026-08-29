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
          data: { s: 1, head: 1, flutter: (o.flutter ?? 0.5) * u * u, phase },
        };
      });
    });
  }
}

function smoothstep01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Squashed dome for flower centers, facing +Y, base at origin. */
export function addCenterDome(
  b: GeomBuilder,
  radius: number,
  height: number,
  colorFn: (r: number, ang: number) => Color,
  flutter = 0.06,
): void {
  b.grid(6, 10, (u, v, pos, normal) => {
    const r = u * radius;
    const ang = v * Math.PI * 2;
    const y = Math.cos((u * Math.PI) / 2) * height;
    pos.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
    const n = new Vector3(Math.cos(ang) * u, 1.2 * (1 - u * 0.5), Math.sin(ang) * u).normalize();
    normal.copy(n);
    return { color: colorFn(u, ang), data: { s: 1, head: 1, flutter: flutter * u, phase: ang } };
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
): void {
  b.grid(6, 8, (u, v, pos, normal) => {
    const phi = u * Math.PI;
    const theta = v * Math.PI * 2;
    const n = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi) * squash, Math.sin(phi) * Math.sin(theta));
    normal.copy(n).normalize();
    pos.set(center.x + n.x * radius, center.y + n.y * radius, center.z + n.z * radius);
    return { color, data: { s, head: 0, flutter, phase } };
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
): PlantBuild {
  const rng = createRng(seed);
  const b = new GeomBuilder();
  addStem(b, headY, 0.0014 + diameter * 0.006, rng, {});
  const cMid = srgb(palette.magenta);
  const cHi = srgb(palette.magentaHi);
  const cDeep = srgb(palette.magentaDeep);

  headSection(b, headY, facing, () => {
    addPetalRing(b, rng, {
      count: 8,
      length: diameter * 0.5 - diameter * 0.1,
      width: diameter * 0.285,
      cone: 0.28,
      cup: 0.55,
      arch: 0.8,
      baseRadius: diameter * 0.075,
      nu: Math.round(9 * detail) + 2,
      nv: Math.round(6 * detail) + 1,
      tipNotch: 0.16,
      flutter: 0.45,
      colorFn: (u, va, petalIdx) => {
        const c = cDeep.clone().lerp(cMid, smoothstep01(u * 2.2)).lerp(cHi, smoothstep01((u - 0.4) * 1.7) * 0.85);
        // radial striations — subtle veins running the petal's length
        const stripe = 0.5 + 0.5 * Math.sin(va * 11.5);
        c.multiplyScalar(1 - 0.17 * stripe * (1 - u * 0.35));
        // per-petal light variation: overlapping petals catch light unevenly
        const petalLum = 0.84 + 0.28 * (0.5 + 0.5 * Math.sin(petalIdx * 12.9898 + 4.1));
        c.multiplyScalar(petalLum);
        // soft central crease
        c.multiplyScalar(0.9 + 0.1 * Math.abs(va));
        return c;
      },
    });
    const navy = srgb("#2e3f78");
    const stamen = srgb(palette.daisyCenter);
    const stamenHot = srgb("#f59a1e");
    addCenterDome(b, diameter * 0.115, diameter * 0.05, (r, ang) => {
      if (r < 0.55) return varied(navy, rng, 0.03);
      const dash = 0.5 + 0.5 * Math.sin(ang * 19 + r * 20);
      return stamen.clone().lerp(stamenHot, dash).multiplyScalar(0.85 + 0.5 * (r - 0.55));
    });
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
    addPetalRing(b, rng, {
      count: petalCount,
      length: diameter * 0.40,
      width: diameter * (variant === "white" ? 0.10 : 0.17),
      cone: 0.18,
      cup: 0.35,
      arch: 0.5,
      baseRadius: diameter * 0.08,
      nu: 4,
      nv: 2,
      tipNotch: 0.03,
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
      addPetalRing(b, rng, {
        count: 9 + layer,
        length: diameter * 0.5 * (1 - lf * 0.45),
        width: diameter * 0.24 * (1 - lf * 0.25),
        cone: 0.15 - lf * 0.45, // inner layers cup upward
        cup: 0.9,
        arch: 1.1,
        baseRadius: diameter * 0.04,
        nu: 4,
        nv: 2,
        tipNotch: 0.12,
        flutter: 0.3,
        colorFn: (u) => maroon.clone().lerp(red, smoothstep01(u * 1.3) * 0.4).multiplyScalar(0.5 + 0.45 * u),
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
    blue: [srgb(palette.cobalt).multiplyScalar(0.6), srgb(palette.cobaltHi).multiplyScalar(0.6)],
    violet: [srgb(palette.violet).multiplyScalar(0.85), srgb(palette.violetHi).multiplyScalar(0.85)],
  };
  const [cA, cB] = colors[kind];
  const stemCol = srgb(palette.stemCyan);

  const count = kind === "red" ? rng.int(11, 16) : rng.int(7, 11);
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

    const bloomR = spread * rng.range(0.07, 0.115);
    const col = varied(cA.clone().lerp(cB, rng.next()), rng, 0.05);
    if (kind === "red") col.multiplyScalar(1.35);
    if (kind === "red") {
      addBlob(b, new Vector3(px, y, pz), bloomR, 0.85, col, sAvg, 0.5, phase);
    } else {
      // tiny open rosette: 5 rounded petals
      _m.makeRotationFromEuler(new Euler(rng.range(0.7, 1.35), rng.range(-0.6, 0.6), 0, "YXZ")).setPosition(px, y, pz);
      b.section(_m, () => {
        addPetalRing(b, rng, {
          count: 5,
          length: bloomR * 1.5,
          width: bloomR * 1.15,
          cone: 0.25,
          cup: 0.4,
          arch: 0.3,
          baseRadius: bloomR * 0.2,
          nu: 2,
          nv: 1,
          flutter: 0.55,
          colorFn: (u) => col.clone().multiplyScalar(0.8 + 0.45 * u),
        });
        addCenterDome(b, bloomR * 0.3, bloomR * 0.2, () => srgb(kind === "blue" ? "#dfe6ff" : "#2a0a3a"));
      });
      // override head flags — sprig blooms bend with the stem, no rigid pivot
      // (handled by marking head=0 in ring? simpler: they are small; keep head flag 0)
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
