/**
 * Art-directed palette extracted from the master reference photograph.
 * See docs/visual-reference.md §5. Colors are authored in sRGB hex and
 * converted at material build time.
 */
export const palette = {
  // atmosphere
  bgDeep: "#071b26",
  bgNavy: "#0a2233",
  bgTeal: "#123c4a",
  cyanGap: "#3fa9c9",
  cyanGapDim: "#2a7fa0",

  // foliage
  foliageTealDark: "#14464f",
  foliageTeal: "#1b5f63",
  foliageTealMid: "#2a7d7a",
  foliageTealLight: "#3fa08e",
  stemCyan: "#226360",
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
