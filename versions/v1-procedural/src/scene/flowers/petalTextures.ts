/**
 * ORIGINAL BOTANICAL PETAL ARTWORK — the high-fidelity asset stage.
 *
 * Every species gets a seeded, deterministically painted 1024² atlas:
 *
 *   ┌────────┬────────┬────────┬────────┐   4 petal variants, 256×512 each
 *   │ petal0 │ petal1 │ petal2 │ petal3 │   (base at cell bottom, tip up):
 *   ├────────┴────────┴────────┴────────┤   organic ALPHA silhouette
 *   │ center │      (unused)            │   (lobed/serrated/ruffled tips),
 *   └────────┴──────────────────────────┘   painted base→tip gradient,
 *                                           branching veins, lateral
 *   center: 256×256 disc artwork          shading, edge rim, mottling.
 *
 * The petal MESH becomes a simple curved card; the painted alpha carries
 * the silhouette — real ragged petal edges at any zoom, far beyond what
 * mesh outlines deliver. Painted at runtime from seeded randomness (like
 * the backdrop/ground), so the artwork is original, deterministic and
 * ships as code, not binaries.
 */
import { CanvasTexture, SRGBColorSpace } from "three";
import { createRng, hashSeed, type Rng } from "../../utils/prng";

export type AtlasSpecies =
  | "cosmosMagenta"
  | "cosmosViolet"
  | "daisyWhite"
  | "daisyOrange"
  | "daisyYellow"
  | "maroonRuffle"
  | "softNeutral";

export interface UvRect {
  u0: number;
  v0: number;
  du: number;
  dv: number;
}

export interface PetalAtlas {
  texture: CanvasTexture;
}

/** Petal variant cells in three.js UV space (v up; u across petal width,
 * v along petal length, v0 = base). Pure layout constants — geometry
 * builders can import these without touching the DOM. */
export const PETAL_CELLS: UvRect[] = [0, 1, 2, 3].map((i) => ({
  u0: (i * 256) / 1024,
  v0: 1 - 512 / 1024 + 14 / 1024,
  du: 256 / 1024,
  dv: (512 - 30) / 1024,
}));

/** Center-disc artwork region: uv = (cu + u·r·cosθ, cv + u·r·sinθ). */
export const CENTER_CELL = { cu: 0.125, cv: 0.125, r: 0.112 };

interface SpeciesStyle {
  seed: string;
  /** [throat, low, mid, high, tipEdge] hex colors along the petal. */
  ramp: [string, string, string, string, string];
  vein: string;
  veinAlpha: number;
  veinCount: [number, number];
  /** width profile: max half-width as fraction of cell width (≤0.46). */
  maxHalf: number;
  baseHalf: number;
  tip: "teeth" | "round" | "broad" | "ruffle" | "oval";
  edgeRim: string;
  rimAlpha: number;
  center: (g: CanvasRenderingContext2D, rng: Rng) => void;
}

const SIZE = 1024;
const CELL_W = 256;
const CELL_H = 512;

/* ------------------------------------------------------------------ */
/* center-disc painters (drawn into a 256×256 region, centered)        */
/* ------------------------------------------------------------------ */

function cosmosCenter(navyA: string, navyB: string) {
  return (g: CanvasRenderingContext2D, rng: Rng) => {
    const c = 128;
    const grad = g.createRadialGradient(c - 26, c - 26, 8, c, c, 118);
    grad.addColorStop(0, navyB);
    grad.addColorStop(0.55, navyA);
    grad.addColorStop(1, "#0c1330");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(c, c, 118, 0, Math.PI * 2);
    g.fill();
    // fine navy floret texture
    for (let i = 0; i < 140; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = Math.sqrt(rng.next()) * 100;
      g.fillStyle = `rgba(${40 + rng.int(0, 30)}, ${52 + rng.int(0, 30)}, ${110 + rng.int(0, 40)}, ${rng.range(0.12, 0.3)})`;
      g.beginPath();
      g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, rng.range(2, 4.5), 0, Math.PI * 2);
      g.fill();
    }
    // outer ring of stamens — dense warm florets
    const ring = 26;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + rng.range(-0.06, 0.06);
      const rr = rng.range(88, 106);
      const warm = rng.next();
      g.fillStyle = warm > 0.5 ? "#f2b322" : "#e88f14";
      g.beginPath();
      g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, rng.range(5, 8), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255, 230, 150, 0.55)";
      g.beginPath();
      g.arc(c + Math.cos(a) * rr - 1.5, c + Math.sin(a) * rr - 1.5, rng.range(1.6, 2.6), 0, Math.PI * 2);
      g.fill();
    }
    // scattered inner stamens
    for (let i = 0; i < 10; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = rng.range(30, 80);
      g.fillStyle = "rgba(226, 156, 30, 0.85)";
      g.beginPath();
      g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, rng.range(3, 5), 0, Math.PI * 2);
      g.fill();
    }
  };
}

function pollenCenter(base: string, dark: string) {
  return (g: CanvasRenderingContext2D, rng: Rng) => {
    const c = 128;
    const grad = g.createRadialGradient(c - 20, c - 20, 6, c, c, 118);
    grad.addColorStop(0, base);
    grad.addColorStop(1, dark);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(c, c, 118, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 220; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = Math.sqrt(rng.next()) * 110;
      const lum = rng.next();
      g.fillStyle =
        lum > 0.6
          ? `rgba(255, 226, 130, ${rng.range(0.3, 0.7)})`
          : `rgba(150, 100, 12, ${rng.range(0.2, 0.45)})`;
      g.beginPath();
      g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, rng.range(2, 5), 0, Math.PI * 2);
      g.fill();
    }
  };
}

/* ------------------------------------------------------------------ */
/* species styles                                                       */
/* ------------------------------------------------------------------ */

const STYLES: Record<AtlasSpecies, SpeciesStyle> = {
  cosmosMagenta: {
    seed: "cosmos-magenta",
    ramp: ["#4a0c33", "#8e1766", "#c2258f", "#d63aa4", "#ef6cc4"],
    vein: "#5e0f45",
    veinAlpha: 0.4,
    veinCount: [9, 13],
    maxHalf: 0.44,
    baseHalf: 0.1,
    tip: "teeth",
    edgeRim: "#f78ad2",
    rimAlpha: 0.35,
    center: cosmosCenter("#232c5e", "#3a4a8c"),
  },
  cosmosViolet: {
    seed: "cosmos-violet",
    ramp: ["#440d48", "#7e2384", "#b23ab0", "#ca52c6", "#de7cd8"],
    vein: "#3c0d52",
    veinAlpha: 0.42,
    veinCount: [9, 13],
    maxHalf: 0.44,
    baseHalf: 0.1,
    tip: "teeth",
    edgeRim: "#d68ae8",
    rimAlpha: 0.32,
    center: cosmosCenter("#20194e", "#37307c"),
  },
  daisyWhite: {
    seed: "daisy-white",
    ramp: ["#9b8f6c", "#cfc6a8", "#ece7d6", "#f5f1e4", "#fbf8ef"],
    vein: "#a89a78",
    veinAlpha: 0.25,
    veinCount: [4, 6],
    maxHalf: 0.3,
    baseHalf: 0.09,
    tip: "round",
    edgeRim: "#ffffff",
    rimAlpha: 0.3,
    center: pollenCenter("#e8b820", "#a3720c"),
  },
  daisyOrange: {
    seed: "daisy-orange",
    ramp: ["#8a4206", "#c96a0a", "#ee7d0e", "#f79b1c", "#ffc244"],
    vein: "#a04e05",
    veinAlpha: 0.35,
    veinCount: [6, 9],
    maxHalf: 0.4,
    baseHalf: 0.1,
    tip: "broad",
    edgeRim: "#ffd066",
    rimAlpha: 0.25,
    center: cosmosCenter("#151d40", "#2b3768"),
  },
  daisyYellow: {
    seed: "daisy-yellow",
    ramp: ["#9c650a", "#d9920e", "#f7ae16", "#ffcc38", "#ffe578"],
    vein: "#a67f08",
    veinAlpha: 0.3,
    veinCount: [6, 9],
    maxHalf: 0.38,
    baseHalf: 0.1,
    tip: "broad",
    edgeRim: "#fff0a0",
    rimAlpha: 0.25,
    center: cosmosCenter("#1a2248", "#303e74"),
  },
  maroonRuffle: {
    seed: "maroon-ruffle",
    ramp: ["#2c0509", "#5c0e14", "#8a1620", "#a81c28", "#c62834"],
    vein: "#38060c",
    veinAlpha: 0.45,
    veinCount: [7, 10],
    maxHalf: 0.46,
    baseHalf: 0.14,
    tip: "ruffle",
    edgeRim: "#d84a52",
    rimAlpha: 0.3,
    center: (g, rng) => {
      const c = 128;
      g.fillStyle = "#240408";
      g.beginPath();
      g.arc(c, c, 118, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 60; i++) {
        const a = rng.range(0, Math.PI * 2);
        const rr = Math.sqrt(rng.next()) * 105;
        g.fillStyle = `rgba(${90 + rng.int(0, 60)}, 12, 24, ${rng.range(0.2, 0.4)})`;
        g.beginPath();
        g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, rng.range(3, 7), 0, Math.PI * 2);
        g.fill();
      }
    },
  },
  softNeutral: {
    // near-white artwork — per-instance tint colors it at runtime
    seed: "soft-neutral",
    ramp: ["#8a8480", "#c2bbb4", "#e4ddd6", "#f2ece5", "#fdf9f4"],
    vein: "#8a827c",
    veinAlpha: 0.22,
    veinCount: [5, 7],
    maxHalf: 0.42,
    baseHalf: 0.12,
    tip: "oval",
    edgeRim: "#ffffff",
    rimAlpha: 0.2,
    center: pollenCenter("#8f8880", "#57524c"),
  },
};

/* ------------------------------------------------------------------ */
/* petal painting                                                       */
/* ------------------------------------------------------------------ */

function widthProfile(style: SpeciesStyle, t: number): number {
  const grow = style.baseHalf + (style.maxHalf - style.baseHalf) * smooth(Math.min(1, t / 0.55));
  let tipShrink = 1;
  if (t > 0.78) {
    const k = (t - 0.78) / 0.22;
    tipShrink =
      style.tip === "round" || style.tip === "oval"
        ? Math.sqrt(Math.max(0.02, 1 - k * k))
        : 1 - 0.35 * k * k;
  }
  return grow * tipShrink;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function paintPetal(g: CanvasRenderingContext2D, style: SpeciesStyle, cellX: number, rng: Rng): void {
  const cx = cellX + CELL_W / 2;
  const yBase = CELL_H - 14;
  const yTip = 16;
  const len = yBase - yTip;
  const N = 30;

  // silhouette: wobbling half-width + tip character
  const wobblePhase = rng.range(0, 10);
  const wobbleAmp = rng.range(0.015, 0.05);
  const skew = rng.range(-0.06, 0.06);
  const teethN = rng.int(3, 4);
  const teethPhase = rng.range(0, Math.PI);

  const half = (t: number, side: number): number => {
    let h = widthProfile(style, t) * (1 + wobbleAmp * Math.sin(t * 7.3 + wobblePhase + side));
    if (style.tip === "teeth" && t > 0.86) {
      const k = (t - 0.86) / 0.14;
      h *= 1 - 0.3 * k * (0.5 + 0.5 * Math.sin(side * teethN * 2.4 + teethPhase + t * 34));
    }
    if (style.tip === "ruffle") {
      h *= 1 + 0.09 * Math.sin(t * 16 + wobblePhase * 2 + side * 2);
    }
    return h * CELL_W;
  };
  const xAt = (t: number, side: number): number => cx + side * half(t, side) + skew * t * CELL_W * 0.5;
  const yAt = (t: number): number => yBase - t * len;

  const path = new Path2D();
  path.moveTo(cx - style.baseHalf * CELL_W * 0.6, yBase);
  for (let i = 0; i <= N; i++) path.lineTo(xAt(i / N, 1), yAt(i / N));
  for (let i = N; i >= 0; i--) path.lineTo(xAt(i / N, -1), yAt(i / N));
  path.closePath();

  g.save();
  g.clip(path);

  // base→tip ramp
  const ramp = g.createLinearGradient(0, yBase, 0, yTip);
  ramp.addColorStop(0, style.ramp[0]);
  ramp.addColorStop(0.22, style.ramp[1]);
  ramp.addColorStop(0.55, style.ramp[2]);
  ramp.addColorStop(0.82, style.ramp[3]);
  ramp.addColorStop(1, style.ramp[4]);
  g.fillStyle = ramp;
  g.fillRect(cellX, 0, CELL_W, CELL_H);

  // lateral shading — the petal curls, its flanks fall into shadow
  const lat = g.createLinearGradient(cellX, 0, cellX + CELL_W, 0);
  lat.addColorStop(0, "rgba(20, 4, 16, 0.28)");
  lat.addColorStop(0.28, "rgba(20, 4, 16, 0)");
  lat.addColorStop(0.72, "rgba(20, 4, 16, 0)");
  lat.addColorStop(1, "rgba(20, 4, 16, 0.28)");
  g.fillStyle = lat;
  g.fillRect(cellX, 0, CELL_W, CELL_H);

  // veins: fan from the throat, wandering, branching near the tip
  const veins = rng.int(style.veinCount[0], style.veinCount[1]);
  g.strokeStyle = style.vein;
  g.lineCap = "round";
  for (let i = 0; i < veins; i++) {
    const f = veins === 1 ? 0.5 : i / (veins - 1);
    const spread = (f - 0.5) * 2; // -1..1
    const tEnd = rng.range(0.75, 0.98);
    const wander = rng.range(-0.12, 0.12);
    g.globalAlpha = style.veinAlpha * rng.range(0.6, 1);
    g.lineWidth = rng.range(1.6, 2.8);
    g.beginPath();
    g.moveTo(cx + spread * style.baseHalf * CELL_W * 0.4, yBase - 2);
    const midT = tEnd * 0.55;
    g.quadraticCurveTo(
      cx + spread * half(midT, Math.sign(spread) || 1) * 0.72 + wander * CELL_W * 0.2,
      yAt(midT),
      cx + spread * half(tEnd, Math.sign(spread) || 1) * 0.88,
      yAt(tEnd),
    );
    g.stroke();
    // fine branch
    if (rng.next() < 0.55) {
      g.lineWidth = 1.1;
      g.globalAlpha = style.veinAlpha * 0.55;
      const bT = rng.range(0.55, 0.8);
      g.beginPath();
      g.moveTo(cx + spread * half(bT, 1) * 0.8, yAt(bT));
      g.lineTo(cx + spread * half(bT + 0.12, 1) * 1.0 + rng.range(-6, 6), yAt(Math.min(0.97, bT + 0.14)));
      g.stroke();
    }
  }
  g.globalAlpha = 1;

  // central crease
  g.strokeStyle = style.vein;
  g.globalAlpha = style.veinAlpha * 0.7;
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(cx, yBase);
  g.quadraticCurveTo(cx + skew * CELL_W * 0.25, yAt(0.5), cx + skew * CELL_W * 0.5, yAt(0.92));
  g.stroke();
  g.globalAlpha = 1;

  // organic mottling
  for (let i = 0; i < 260; i++) {
    const t = rng.next();
    const side = rng.range(-0.92, 0.92);
    const x = cx + side * half(t, Math.sign(side) || 1);
    const y = yAt(t);
    const light = rng.next() > 0.45;
    g.fillStyle = light
      ? `rgba(255, 240, 250, ${rng.range(0.02, 0.06)})`
      : `rgba(10, 2, 10, ${rng.range(0.025, 0.07)})`;
    g.beginPath();
    g.arc(x, y, rng.range(1, 3.4), 0, Math.PI * 2);
    g.fill();
  }

  g.restore();

  // luminous rim along the silhouette
  g.save();
  g.strokeStyle = style.edgeRim;
  g.globalAlpha = style.rimAlpha;
  g.lineWidth = 2.2;
  g.stroke(path);
  g.restore();
}

/* ------------------------------------------------------------------ */
/* atlas assembly + registry                                            */
/* ------------------------------------------------------------------ */

const cache = new Map<AtlasSpecies, PetalAtlas>();

export function getPetalAtlas(species: AtlasSpecies): PetalAtlas {
  const hit = cache.get(species);
  if (hit) return hit;

  const style = STYLES[species];
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext("2d")!;

  for (let i = 0; i < 4; i++) {
    paintPetal(g, style, i * CELL_W, createRng(hashSeed(`${style.seed}-petal-${i}`)));
  }

  // center-disc artwork, canvas bottom-left 256²
  g.save();
  g.translate(0, SIZE - 256);
  style.center(g, createRng(hashSeed(`${style.seed}-center`)));
  g.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  const atlas: PetalAtlas = { texture };
  cache.set(species, atlas);
  return atlas;
}
