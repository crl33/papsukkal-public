/**
 * Sanity for the wind model COPIED from V1 (tag v1-procedural) — the copy
 * must preserve V1's behavior: deterministic, spatial, bounded, stable.
 */
import { describe, expect, it } from "vitest";
import { WindField } from "../../src/wind/WindField";
import { MECHANICS, PlantSim } from "../../src/wind/PlantSim";
import { layers } from "../../src/config/layers";

describe("copied wind model", () => {
  it("is deterministic for a given seed", () => {
    const a = new WindField({ seed: 1337 });
    const b = new WindField({ seed: 1337 });
    const o1 = { x: 0, z: 0, gust: 0 };
    const o2 = { x: 0, z: 0, gust: 0 };
    for (let t = 0; t < 30; t += 0.37) {
      a.sample(-0.17, -1.15, t, o1);
      b.sample(-0.17, -1.15, t, o2);
      expect(o1.x).toBe(o2.x);
      expect(o1.gust).toBe(o2.gust);
    }
  });

  it("keeps deflection bounded and finite over a long run", () => {
    const sim = new PlantSim(new WindField({ seed: 1337 }), 8);
    sim.addPlant(-0.17, -1.15, 0.61, MECHANICS.cosmosHero, 7010);
    sim.advanceTo(600);
    const b = Math.hypot(sim.output[0], sim.output[1]);
    expect(Number.isFinite(b)).toBe(true);
    expect(b).toBeLessThanOrEqual(MECHANICS.cosmosHero.maxBendFrac * 0.61 * 1.35 + 1e-9);
  });

  it("timestep independence survives the copy", () => {
    const mk = () => {
      const s = new PlantSim(new WindField({ seed: 1337 }), 8);
      s.addPlant(-0.17, -1.15, 0.61, MECHANICS.cosmosHero, 7010);
      return s;
    };
    const a = mk();
    const b = mk();
    for (let i = 0; i < 300; i++) a.update(1 / 30);
    for (let i = 0; i < 1200; i++) b.update(1 / 120);
    expect(Math.abs(a.output[0] - b.output[0])).toBeLessThan(1e-6);
  });
});

describe("layer manifest", () => {
  it("rects are within the image and rigs are valid", () => {
    for (const l of layers) {
      const [x, y, w, h] = l.rect;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(1.0001);
      expect(y + h).toBeLessThanOrEqual(1.0001);
      if (l.rig) {
        expect(MECHANICS[l.rig.mechanics]).toBeDefined();
        // root and head inside the layer rect — deformation must be local
        for (const p of [l.rig.root, l.rig.head]) {
          expect(p[0]).toBeGreaterThanOrEqual(x);
          expect(p[0]).toBeLessThanOrEqual(x + w);
          expect(p[1]).toBeGreaterThanOrEqual(y);
          expect(p[1]).toBeLessThanOrEqual(y + h);
        }
      }
    }
  });

  it("has unique ids and orders", () => {
    expect(new Set(layers.map((l) => l.id)).size).toBe(layers.length);
    expect(new Set(layers.map((l) => l.order)).size).toBe(layers.length);
  });
});
