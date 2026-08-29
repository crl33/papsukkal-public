import { describe, expect, it } from "vitest";
import type { WebGLRenderTarget } from "three";
import { CinematicDofPass } from "../../src/scene/postprocessing/CinematicDofPass";

type Internals = {
  rtPre: WebGLRenderTarget;
  rtA: WebGLRenderTarget;
  rtB: WebGLRenderTarget;
  rtC: WebGLRenderTarget;
  rtD: WebGLRenderTarget;
};

describe("CinematicDofPass sizing", () => {
  it("builds the 1/2, 1/4, 1/8 pyramid from the composer size", () => {
    const pass = new CinematicDofPass();
    pass.setSize(1920, 1080);
    const p = pass as unknown as Internals;
    expect([p.rtPre.width, p.rtPre.height]).toEqual([960, 540]);
    expect([p.rtA.width, p.rtA.height]).toEqual([960, 540]);
    expect([p.rtC.width, p.rtC.height]).toEqual([480, 270]);
    expect([p.rtD.width, p.rtD.height]).toEqual([240, 135]);
  });

  it("applies the quality resolution scale to every level", () => {
    const pass = new CinematicDofPass(0.5);
    pass.setSize(1920, 1080);
    const p = pass as unknown as Internals;
    expect([p.rtPre.width, p.rtPre.height]).toEqual([480, 270]);
    expect([p.rtC.width, p.rtC.height]).toEqual([240, 135]);
    expect([p.rtD.width, p.rtD.height]).toEqual([120, 67]);
  });

  it("resizes targets in place — no reallocation churn during drags", () => {
    const pass = new CinematicDofPass();
    pass.setSize(1280, 720);
    const p = pass as unknown as Internals;
    const before = [p.rtPre, p.rtA, p.rtB, p.rtC, p.rtD];
    pass.setSize(1280, 720); // same size: no-op
    pass.setSize(1920, 1080);
    const after = [p.rtPre, p.rtA, p.rtB, p.rtC, p.rtD];
    for (let i = 0; i < before.length; i++) expect(after[i]).toBe(before[i]);
    expect(p.rtPre.width).toBe(960);
  });

  it("never allocates a zero-sized target", () => {
    const pass = new CinematicDofPass(0.5);
    pass.setSize(4, 4);
    const p = pass as unknown as Internals;
    expect(p.rtD.width).toBeGreaterThanOrEqual(1);
    expect(p.rtD.height).toBeGreaterThanOrEqual(1);
  });
});
