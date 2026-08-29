import { describe, expect, it } from "vitest";
import { allPlacements } from "../../src/config/composition";
import { cameraConfig } from "../../src/config/cameraConfig";

describe("composition config validity — seeds and ids are load-bearing", () => {
  it("has unique placement ids", () => {
    const ids = allPlacements.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique seeds (duplicates silently produce twin plants)", () => {
    const seeds = allPlacements.map((p) => p.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it("keeps every placement within valid ranges", () => {
    for (const p of allPlacements) {
      expect(p.screen[0], p.id).toBeGreaterThanOrEqual(0);
      expect(p.screen[0], p.id).toBeLessThanOrEqual(1);
      expect(p.screen[1], p.id).toBeGreaterThanOrEqual(0);
      expect(p.screen[1], p.id).toBeLessThanOrEqual(1);
      expect(p.depth, p.id).toBeGreaterThan(cameraConfig.near);
      expect(p.depth, p.id).toBeLessThan(cameraConfig.far);
      expect(p.sizeFrac, p.id).toBeGreaterThan(0);
      expect(p.sizeFrac, p.id).toBeLessThan(0.3);
      if (p.facing) {
        for (const a of p.facing) expect(Number.isFinite(a), p.id).toBe(true);
      }
    }
  });
});
