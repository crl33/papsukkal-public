/**
 * Adaptive quality tiers. Tiers scale cost, never composition:
 * hero flowers and the focal aesthetic survive every tier.
 */
export interface QualityTier {
  name: "high" | "medium" | "low";
  maxPixelRatio: number;
  dofResolutionScale: number;
  vegetationDensity: number;
  heroDetail: number;
}

export const QUALITY_TIERS: Record<QualityTier["name"], QualityTier> = {
  high: { name: "high", maxPixelRatio: 2, dofResolutionScale: 1, vegetationDensity: 1, heroDetail: 1 },
  medium: { name: "medium", maxPixelRatio: 1.5, dofResolutionScale: 0.75, vegetationDensity: 0.65, heroDetail: 1 },
  low: { name: "low", maxPixelRatio: 1, dofResolutionScale: 0.5, vegetationDensity: 0.4, heroDetail: 0.8 },
};

export function pickInitialTier(): QualityTier {
  const params = new URLSearchParams(location.search);
  const forced = params.get("quality");
  if (forced && Object.hasOwn(QUALITY_TIERS, forced)) {
    return QUALITY_TIERS[forced as QualityTier["name"]];
  }
  // heuristic first guess; App additionally drops resolution at runtime if
  // sustained frame times prove the guess too optimistic
  const dpr = window.devicePixelRatio ?? 1;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mobile = /Mobi|Android/i.test(navigator.userAgent);
  if (mobile || cores <= 4) return QUALITY_TIERS.medium;
  if (dpr > 2.2) return QUALITY_TIERS.medium;
  return QUALITY_TIERS.high;
}
