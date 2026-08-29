import { describe, expect, it } from "vitest";
import { PlantSim, MECHANICS } from "../../src/scene/wind/PlantSim";
import { WindField } from "../../src/scene/wind/WindField";

function buildSim(seed = 1337): PlantSim {
  const sim = new PlantSim(new WindField({ seed }), 64);
  sim.addPlant(-0.5, -1.2, 0.6, MECHANICS.cosmosHero, 101);
  sim.addPlant(0.3, -1.4, 0.4, MECHANICS.daisySmall, 102);
  sim.addPlant(0.0, -0.9, 0.3, MECHANICS.microSprig, 103);
  sim.addPlant(0.8, -2.0, 0.8, MECHANICS.heavyBloom, 104);
  return sim;
}

describe("PlantSim", () => {
  it("is deterministic: advanceTo reproduces states exactly", () => {
    const a = buildSim();
    const b = buildSim();
    a.advanceTo(12.5);
    b.advanceTo(12.5);
    expect(Array.from(a.output)).toEqual(Array.from(b.output));
  });

  it("is timestep-independent: 30fps vs 120fps frames converge", () => {
    const a = buildSim();
    const b = buildSim();
    for (let i = 0; i < 300; i++) a.update(1 / 30); // 10s in 30fps frames
    for (let i = 0; i < 1200; i++) b.update(1 / 120); // 10s in 120fps frames
    for (let i = 0; i < 4 * 4; i++) {
      expect(Math.abs(a.output[i] - b.output[i])).toBeLessThan(1e-6);
    }
  });

  it("keeps deflection bounded and finite over a long run", () => {
    const sim = buildSim();
    sim.advanceTo(900);
    for (let p = 0; p < 4; p++) {
      const bx = sim.output[p * 4];
      const bz = sim.output[p * 4 + 1];
      expect(Number.isFinite(bx)).toBe(true);
      expect(Number.isFinite(bz)).toBe(true);
      // hard cap: maxBendFrac * height * 1.35 slack
      const heights = [0.6, 0.4, 0.3, 0.8];
      const fracs = [
        MECHANICS.cosmosHero.maxBendFrac,
        MECHANICS.daisySmall.maxBendFrac,
        MECHANICS.microSprig.maxBendFrac,
        MECHANICS.heavyBloom.maxBendFrac,
      ];
      expect(Math.hypot(bx, bz)).toBeLessThanOrEqual(fracs[p] * heights[p] * 1.35 + 1e-9);
      // head nod clamps
      expect(Math.abs(sim.output[p * 4 + 2])).toBeLessThanOrEqual(0.22);
      expect(Math.abs(sim.output[p * 4 + 3])).toBeLessThanOrEqual(0.22);
    }
  });

  it("plants actually respond to wind (non-static)", () => {
    const sim = buildSim();
    sim.advanceTo(6);
    const early = Array.from(sim.output);
    sim.advanceTo(9);
    const later = Array.from(sim.output);
    let moved = 0;
    for (let i = 0; i < early.length; i += 4) {
      if (Math.abs(early[i] - later[i]) > 1e-4) moved++;
    }
    expect(moved).toBeGreaterThanOrEqual(3);
  });

  it("neighboring plants do not move identically", () => {
    const sim = new PlantSim(new WindField({ seed: 5 }), 8);
    // two plants of the same species, close together
    sim.addPlant(0.0, -1.2, 0.5, MECHANICS.daisySmall, 1);
    sim.addPlant(0.08, -1.2, 0.5, MECHANICS.daisySmall, 2);
    sim.advanceTo(14);
    const d = Math.hypot(sim.output[0] - sim.output[4], sim.output[1] - sim.output[5]);
    expect(d).toBeGreaterThan(1e-4);
  });

  it("larger/heavier species react more slowly than tiny sprigs", () => {
    // natural frequency ordering is encoded in mechanics — verify config sanity
    expect(MECHANICS.heavyBloom.freq).toBeLessThan(MECHANICS.microSprig.freq);
    expect(MECHANICS.cosmosHero.freq).toBeLessThan(MECHANICS.daisySmall.freq);
  });

  it("reduced wind intensity produces a much stiller meadow", () => {
    const windy = buildSim();
    windy.advanceTo(20);
    const calm = new PlantSim(new WindField({ seed: 1337, intensity: 0.12 }), 64);
    calm.addPlant(-0.5, -1.2, 0.6, MECHANICS.cosmosHero, 101);
    calm.advanceTo(20);
    const windyMag = Math.hypot(windy.output[0], windy.output[1]);
    const calmMag = Math.hypot(calm.output[0], calm.output[1]);
    expect(calmMag).toBeLessThan(windyMag);
  });
});
