import { describe, expect, it } from "vitest";
import type { BufferAttribute } from "three";
import {
  buildBud,
  buildCosmos,
  buildDaisy,
  buildFeatherClump,
  buildFoliageTuft,
  buildForegroundMass,
  buildMaroonBloom,
  buildMicroSprig,
  buildMidFlowerHead,
  buildWiryStem,
  type PlantBuild,
} from "../../src/scene/flowers/species";

const BUILDERS: [string, () => PlantBuild][] = [
  ["cosmos", () => buildCosmos(101, 0.6, 0.11, [72, -16, 10], 1)],
  ["cosmos low detail", () => buildCosmos(101, 0.6, 0.11, [72, -16, 10], 0.8)],
  ["daisy white", () => buildDaisy(103, 0.55, 0.035, [74, 6, 0], "white")],
  ["daisy orange", () => buildDaisy(106, 0.62, 0.07, [76, -10, 4], "orange")],
  ["bud", () => buildBud(111, 0.75, 0.014)],
  ["maroon bloom", () => buildMaroonBloom(110, 0.9, 0.11)],
  ["red sprig", () => buildMicroSprig(120, 0.45, 0.05, "red")],
  ["blue sprig", () => buildMicroSprig(130, 0.35, 0.045, "blue")],
  ["violet sprig", () => buildMicroSprig(136, 0.3, 0.05, "violet")],
  ["mid flower head", () => buildMidFlowerHead(4242)],
  ["foliage tuft", () => buildFoliageTuft(5151)],
  ["foreground mass", () => buildForegroundMass(140, 0.45, 0.05, "#a3141f")],
  ["cosmos violet", () => buildCosmos(102, 0.55, 0.075, [64, 18, -6], 1, "violet")],
  ["wiry stem", () => buildWiryStem(9001)],
  ["wiry stem hooked", () => buildWiryStem(9003)],
  ["feather clump", () => buildFeatherClump(9101)],
];

describe("species builders", () => {
  for (const [name, build] of BUILDERS) {
    it(`${name}: same seed → identical geometry (deterministic)`, () => {
      const a = build().builder.build();
      const b = build().builder.build();
      for (const attr of ["position", "aColor", "aData"]) {
        const aa = a.getAttribute(attr) as BufferAttribute;
        const bb = b.getAttribute(attr) as BufferAttribute;
        expect(aa.count).toBe(bb.count);
        expect(Array.from(aa.array as Float32Array)).toEqual(Array.from(bb.array as Float32Array));
      }
    });

    it(`${name}: finite, sane, indexed geometry`, () => {
      const { builder, headPivotY } = build();
      const g = builder.build();
      expect(headPivotY).toBeGreaterThan(0);
      const pos = g.getAttribute("position") as BufferAttribute;
      const nrm = g.getAttribute("normal") as BufferAttribute;
      const data = g.getAttribute("aData") as BufferAttribute;
      expect(pos.count).toBeGreaterThan(10);
      const posArr = pos.array as Float32Array;
      const nrmArr = nrm.array as Float32Array;
      for (let i = 0; i < posArr.length; i++) {
        expect(Number.isFinite(posArr[i])).toBe(true);
        expect(Number.isFinite(nrmArr[i])).toBe(true);
      }
      // valid index range
      const index = g.getIndex()!;
      for (let i = 0; i < index.count; i++) {
        expect(index.getX(i)).toBeLessThan(pos.count);
      }
      // aData sanity: s in [0,1], head flag 0/1
      const d = data.array as Float32Array;
      for (let i = 0; i < data.count; i++) {
        expect(d[i * 4]).toBeGreaterThanOrEqual(0);
        expect(d[i * 4]).toBeLessThanOrEqual(1);
        expect(d[i * 4 + 1] === 0 || d[i * 4 + 1] === 1).toBe(true);
      }
    });
  }

  it("roots stay anchored: no bend weight at the stem base", () => {
    // vertices at the very bottom of a stem must have s ≈ 0 so the GPU
    // envelope keeps them fixed (invariant: roots never slide)
    const g = buildCosmos(101, 0.6, 0.11, [72, -16, 10], 1).builder.build();
    const pos = g.getAttribute("position") as BufferAttribute;
    const data = g.getAttribute("aData") as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0.01 && Math.abs(pos.getX(i)) < 0.02 && Math.abs(pos.getZ(i)) < 0.02) {
        expect(data.getX(i)).toBeLessThan(0.05);
      }
    }
  });
});
