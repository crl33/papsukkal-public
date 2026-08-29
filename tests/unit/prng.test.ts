import { describe, expect, it } from "vitest";
import { createRng, hashSeed } from "../../src/utils/prng";
import { createSimplex2, createValueNoise1 } from "../../src/utils/noise";

describe("prng/noise", () => {
  it("mulberry32 reproduces sequences per seed", () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it("hashSeed is stable", () => {
    expect(hashSeed("papsukkal")).toBe(hashSeed("papsukkal"));
    expect(hashSeed("a")).not.toBe(hashSeed("b"));
  });

  it("simplex2 stays within [-1, 1] and is continuous", () => {
    const n = createSimplex2(77);
    let prev = n(0, 0);
    for (let i = 1; i < 2000; i++) {
      const v = n(i * 0.01, i * 0.007);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.abs(v - prev)).toBeLessThan(0.2); // small step → small change
      prev = v;
    }
  });

  it("value noise 1D is smooth and bounded", () => {
    const n = createValueNoise1(3);
    let prev = n(0);
    for (let i = 1; i < 3000; i++) {
      const v = n(i * 0.02);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      expect(Math.abs(v - prev)).toBeLessThan(0.1);
      prev = v;
    }
  });
});
