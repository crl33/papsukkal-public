import { describe, expect, it } from "vitest";
import { WindField } from "../../src/scene/wind/WindField";

describe("WindField", () => {
  it("is deterministic for a given seed", () => {
    const a = new WindField({ seed: 42 });
    const b = new WindField({ seed: 42 });
    const out1 = { x: 0, z: 0, gust: 0 };
    const out2 = { x: 0, z: 0, gust: 0 };
    for (let i = 0; i < 200; i++) {
      const x = Math.sin(i) * 3;
      const z = Math.cos(i * 0.7) * 3;
      const t = i * 0.37;
      a.sample(x, z, t, out1);
      b.sample(x, z, t, out2);
      expect(out1.x).toBe(out2.x);
      expect(out1.z).toBe(out2.z);
      expect(out1.gust).toBe(out2.gust);
    }
  });

  it("differs across seeds", () => {
    const a = new WindField({ seed: 1 });
    const b = new WindField({ seed: 2 });
    const out1 = { x: 0, z: 0, gust: 0 };
    const out2 = { x: 0, z: 0, gust: 0 };
    a.sample(1, -1.5, 10, out1);
    b.sample(1, -1.5, 10, out2);
    expect(out1.x).not.toBe(out2.x);
  });

  it("produces finite bounded velocities over long horizons", () => {
    const w = new WindField({ seed: 7 });
    const out = { x: 0, z: 0, gust: 0 };
    let max = 0;
    for (let t = 0; t < 3600; t += 0.21) {
      for (const [x, z] of [[-2, -1], [0, -1.2], [2, -3], [5, -8]] as const) {
        w.sample(x, z, t, out);
        expect(Number.isFinite(out.x)).toBe(true);
        expect(Number.isFinite(out.z)).toBe(true);
        max = Math.max(max, Math.hypot(out.x, out.z));
      }
    }
    // gentle meadow breeze: peak wind stays well under storm speeds
    expect(max).toBeLessThan(4);
    expect(max).toBeGreaterThan(0.3);
  });

  it("is spatial: distant points see different wind at the same instant", () => {
    const w = new WindField({ seed: 9 });
    const a = { x: 0, z: 0, gust: 0 };
    const b = { x: 0, z: 0, gust: 0 };
    let differing = 0;
    for (let t = 0; t < 60; t += 1.3) {
      w.sample(-3, -1, t, a);
      w.sample(3, -1, t, b);
      if (Math.abs(a.x - b.x) > 0.02 || Math.abs(a.gust - b.gust) > 0.02) differing++;
    }
    expect(differing).toBeGreaterThan(20);
  });

  it("gust structures travel downwind over time", () => {
    const w = new WindField({ seed: 4 });
    const out = { x: 0, z: 0, gust: 0 };
    // find a strong gust moment at an upwind point, then verify correlation
    // appears downwind shortly after (coarse check over many events)
    const upwind: number[] = [];
    const downwind: number[] = [];
    for (let t = 0; t < 240; t += 0.1) {
      w.sample(-2, -1.5, t, out);
      upwind.push(out.gust);
      w.sample(2, -1.5, t, out);
      downwind.push(out.gust);
    }
    const corr = (lagSteps: number) => {
      let s = 0;
      let n = 0;
      for (let i = 0; i + lagSteps < upwind.length; i++) {
        s += upwind[i] * downwind[i + lagSteps];
        n++;
      }
      return s / n;
    };
    // correlation at a positive travel lag should beat zero-lag correlation
    const zeroLag = corr(0);
    let best = zeroLag;
    let bestLag = 0;
    for (let lag = 5; lag < 80; lag += 5) {
      const c = corr(lag);
      if (c > best) {
        best = c;
        bestLag = lag;
      }
    }
    expect(bestLag).toBeGreaterThan(0);
  });

  it("intensity scales the field", () => {
    const w = new WindField({ seed: 11, intensity: 1 });
    const out = { x: 0, z: 0, gust: 0 };
    w.sample(0.5, -1, 20, out);
    const full = Math.hypot(out.x, out.z);
    w.intensity = 0.1;
    w.sample(0.5, -1, 20, out);
    const calm = Math.hypot(out.x, out.z);
    expect(calm).toBeLessThan(full * 0.2 + 1e-9);
  });
});
