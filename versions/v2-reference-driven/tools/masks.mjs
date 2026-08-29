/**
 * Mask geometry for the reference decomposition — hand-authored from close
 * study of the photograph (all values in source pixels, 1242×822).
 *
 * Each rigged layer's mask = (SVG shapes) ∪ (chroma key inside its ROI),
 * dilated and feathered by prepare-assets.mjs. This is restoration-grade
 * data: it selects existing pixels, it never invents appearance.
 */

export const IMG_W = 1242;
export const IMG_H = 822;

export const heroCosmos = {
  id: "hero-cosmos",
  /** crop rect in normalized image coords [x, y, w, h] — must match src/config/layers.ts */
  rect: [0.115, 0.145, 0.28, 0.535],
  /**
   * SVG shapes rasterized into the mask: the stem corridor (chroma can't
   * key a teal stem off teal foliage) and the dark flower center (chroma
   * can't key near-black navy).
   */
  svg: `
    <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
      <path d="M 318 296 C 322 340 330 380 337 420 C 341 437 345 448 349 458"
            fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/>
      <ellipse cx="307" cy="237" rx="48" ry="44" fill="white"/>
    </svg>
  `,
  /** chroma-key ROI (ellipse, px): only pixels inside are keyed. */
  roi: { cx: 307, cy: 237, rx: 134, ry: 124 },
  /**
   * magenta-ness metric threshold: m = (R−G) + 0.45·(B−G), 0..255 scale.
   * Petals score 150+; teal foliage scores negative.
   */
  chromaThreshold: 55,
  /** below this max-RGB value a much higher chroma score is required —
   * separates bright magenta petals from the dark maroon poppy nearby. */
  valueGate: { minValue: 115, darkThreshold: 110 },
  /** fade the mask to zero over this y-range (px) — the stem slips behind
   * the red foreground mass here; the anchor sits at the fade so the seam
   * never moves. */
  fadeOut: { y0: 430, y1: 460 },
};

export const riggedLayers = [heroCosmos];
