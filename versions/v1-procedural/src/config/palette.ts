/**
 * Art-directed palette extracted from the master reference photograph.
 * See docs/visual-reference.md §5. Colors are authored in sRGB hex and
 * converted at material build time.
 */
export const palette = {
  // atmosphere
  bgDeep: "#071b26",
  bgNavy: "#0a2233",
  bgTeal: "#284a44",
  cyanGap: "#3fa9c9",
  cyanGapDim: "#2a7fa0",

  // foliage
  foliageTealDark: "#1d443e",
  foliageTeal: "#2a5f55",
  foliageTealMid: "#3d7d6c",
  foliageTealLight: "#5aa88d",
  stemCyan: "#357063",
  shadowNavy: "#0a1f2e",

  // petals
  magenta: "#c2258f",
  magentaHi: "#e04fb0",
  magentaDeep: "#8e1766",
  violet: "#7a3bd4",
  violetHi: "#9b59e8",
  red: "#d81f2a",
  crimson: "#b3121f",
  maroon: "#5c0e14",
  cobalt: "#2244dd",
  cobaltHi: "#3a5bff",
  blueViolet: "#5b45e0",
  orange: "#ee7d0e",
  yellow: "#ffc832",
  white: "#f2efe6",
  daisyCenter: "#e8b820",
  daisyCenterNavy: "#111c3a",
} as const;

export type PaletteKey = keyof typeof palette;
