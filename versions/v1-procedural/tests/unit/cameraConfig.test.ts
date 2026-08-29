import { describe, expect, it } from "vitest";
import { cameraConfig, frameWidthAt, halfHeightAt, placeFromScreen } from "../../src/config/cameraConfig";

const DEG = Math.PI / 180;

describe("cameraConfig projection — these numbers ARE the composition", () => {
  it("placeFromScreen inverts the pinhole projection exactly", () => {
    for (const nx of [0, 0.25, 0.5, 0.75, 1]) {
      for (const ny of [0, 0.25, 0.5, 0.75, 1]) {
        for (const depth of [0.42, 1.18, 3.4]) {
          const [x, y, z] = placeFromScreen(nx, ny, depth);
          expect(z).toBeCloseTo(-depth, 12);
          const hh = depth * Math.tan((cameraConfig.fovY / 2) * DEG);
          const ndcX = x / (hh * cameraConfig.refAspect);
          const ndcY = (y - cameraConfig.height) / hh;
          expect(ndcX).toBeCloseTo(2 * nx - 1, 9);
          expect(ndcY).toBeCloseTo(1 - 2 * ny, 9);
        }
      }
    }
  });

  it("screen center at the focus distance sits on the camera axis at eye height", () => {
    const [x, y, z] = placeFromScreen(0.5, 0.5, cameraConfig.focusDistance);
    expect(x).toBeCloseTo(0, 12);
    expect(y).toBeCloseTo(cameraConfig.height, 12);
    expect(z).toBeCloseTo(-cameraConfig.focusDistance, 12);
  });

  it("frame dimensions scale linearly with depth", () => {
    expect(frameWidthAt(2)).toBeCloseTo(frameWidthAt(1) * 2, 9);
    expect(halfHeightAt(3)).toBeCloseTo(halfHeightAt(1) * 3, 9);
    expect(frameWidthAt(1)).toBeCloseTo(2 * halfHeightAt(1) * cameraConfig.refAspect, 12);
  });
});
