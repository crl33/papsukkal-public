import { afterEach, describe, expect, it, vi } from "vitest";
import { pickInitialTier, QUALITY_TIERS } from "../../src/config/quality";

function stubEnv(search: string, opts: { dpr?: number; cores?: number; ua?: string } = {}) {
  vi.stubGlobal("location", { search });
  vi.stubGlobal("window", { devicePixelRatio: opts.dpr ?? 1 });
  vi.stubGlobal("navigator", {
    hardwareConcurrency: opts.cores ?? 8,
    userAgent: opts.ua ?? "Mozilla/5.0 (Macintosh)",
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("pickInitialTier", () => {
  it("honors an explicit tier override", () => {
    stubEnv("?quality=low");
    expect(pickInitialTier()).toBe(QUALITY_TIERS.low);
  });

  it("ignores prototype-chain keys like ?quality=toString", () => {
    stubEnv("?quality=toString");
    const tier = pickInitialTier();
    expect(["high", "medium", "low"]).toContain(tier.name);
    expect(Number.isFinite(tier.maxPixelRatio)).toBe(true);
  });

  it("mobile user agents get the medium tier", () => {
    stubEnv("", { ua: "Mozilla/5.0 (Linux; Android 15) Mobile", cores: 8 });
    expect(pickInitialTier().name).toBe("medium");
  });

  it("capable desktops get the high tier", () => {
    stubEnv("", { cores: 10, dpr: 2 });
    expect(pickInitialTier().name).toBe("high");
  });
});
