/**
 * Mask geometry for the reference decomposition — hand-authored from close
 * study of the photograph (all values in source pixels, 1242×822).
 *
 * Each rigged layer's mask = (SVG shapes) ∪ (chroma key inside its ROI),
 * dilated and feathered by prepare-assets.mjs. Foreground blur masses use
 * pure soft SVG ellipses with heavy feather (soft-on-soft: no keying
 * needed). This is restoration-grade data: it selects existing pixels, it
 * never invents appearance.
 *
 * key kinds: "magenta" (R−G + 0.45·(B−G)), "orange" (R−B + 0.3·(G−B)),
 * "white" (bright + low saturation), null (SVG shapes only).
 */

export const IMG_W = 1242;
export const IMG_H = 822;

export const riggedLayers = [
  {
    id: "hero-cosmos",
    rect: [0.115, 0.145, 0.28, 0.535],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <path d="M 318 296 C 322 340 330 380 337 420 C 341 437 345 448 349 458"
              fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/>
        <ellipse cx="307" cy="237" rx="48" ry="44" fill="white"/>
      </svg>
    `,
    roi: { cx: 307, cy: 237, rx: 134, ry: 124 },
    key: "magenta",
    chromaThreshold: 55,
    valueGate: { minValue: 115, darkThreshold: 110 },
    fadeOut: { y0: 430, y1: 460 },
    feather: 1.6,
  },
  {
    id: "cosmos-2",
    rect: [0.395, 0.27, 0.175, 0.4],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <path d="M 585 352 C 578 392 568 430 556 468 C 550 488 546 502 543 514"
              fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/>
        <ellipse cx="590" cy="310" rx="34" ry="30" fill="white"/>
      </svg>
    `,
    roi: { cx: 588, cy: 306, rx: 92, ry: 84 },
    key: "magenta",
    chromaThreshold: 52,
    valueGate: { minValue: 105, darkThreshold: 105 },
    fadeOut: { y0: 492, y1: 518 },
    feather: 1.6,
  },
  {
    id: "daisy-white",
    rect: [0.505, 0.29, 0.085, 0.155],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <path d="M 676 300 C 674 316 672 330 671 344"
              fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>
        <circle cx="677" cy="276" r="10" fill="white"/>
      </svg>
    `,
    roi: { cx: 677, cy: 275, rx: 42, ry: 40 },
    key: "white",
    whiteGate: { minValue: 150, maxChromaSpread: 70 },
    fadeOut: { y0: 332, y1: 350 },
    feather: 1.4,
  },
  {
    id: "orange-ur",
    rect: [0.77, 0.2, 0.135, 0.235],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <path d="M 1026 262 C 1020 300 1012 330 1004 362"
              fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/>
        <ellipse cx="1030" cy="224" rx="20" ry="18" fill="white"/>
      </svg>
    `,
    roi: { cx: 1029, cy: 222, rx: 76, ry: 68 },
    key: "orange",
    chromaThreshold: 70,
    fadeOut: { y0: 340, y1: 366 },
    feather: 1.6,
  },
  {
    id: "orange-lr",
    rect: [0.815, 0.53, 0.125, 0.2],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <path d="M 1084 522 C 1078 550 1072 572 1066 592"
              fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/>
        <ellipse cx="1087" cy="492" rx="19" ry="17" fill="white"/>
      </svg>
    `,
    roi: { cx: 1087, cy: 491, rx: 70, ry: 62 },
    key: "orange",
    chromaThreshold: 70,
    fadeOut: { y0: 572, y1: 596 },
    feather: 1.6,
  },
  /* ---- extreme-foreground blur masses: soft ellipses, heavy feather ---- */
  {
    id: "fg-red-left",
    rect: [0.13, 0.44, 0.21, 0.24],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="290" cy="463" rx="112" ry="72" fill="white"/>
      </svg>
    `,
    roi: null,
    key: null,
    feather: 12,
  },
  {
    id: "fg-crimson-c",
    rect: [0.475, 0.68, 0.245, 0.27],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="714" cy="660" rx="132" ry="78" fill="white"/>
      </svg>
    `,
    roi: null,
    key: null,
    feather: 14,
  },
  {
    id: "fg-yellow-br",
    rect: [0.7, 0.72, 0.23, 0.28],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="1010" cy="715" rx="115" ry="75" fill="white"/>
      </svg>
    `,
    roi: null,
    key: null,
    feather: 14,
  },
];
