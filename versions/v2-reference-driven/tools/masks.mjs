/**
 * Mask geometry for the reference decomposition — hand-authored from close
 * study of the photograph (all values in source pixels, 1242×822).
 *
 * TWO MASKS PER MOVING UNIT:
 *
 *  SILHOUETTE (generous)  →  the plate reconstruction hole (+ margin) and
 *                            the extent of the static background patch
 *  TIGHT (flower-only)    →  the MOVING cutout: only the flower's own
 *                            pixels — petals (chroma, no value gate, so
 *                            dark petals are included), plus structural
 *                            SVG shapes for what chroma cannot see (stem
 *                            corridor, center, near-black calyx)
 *
 * The static patch = silhouette minus (dilated) tight: the true background
 * between and around the petals. It never moves — only the flower and its
 * stem sway, the world around them stays put. At rest,
 * plate + patch + tight reassembles the photograph.
 *
 * Soft blur masses (fg-*) and the already-thin bud corridors use
 * tight === silhouette (no patch): they carry no meaningful background.
 *
 * tight.key metrics (calibrated on reference pixels):
 *   magenta: max(R−G+0.45(B−G), 2.2·(B−G))   dark petals ≈ 60–150, bg < 0
 *   orange:  R−B+0.3·(G−B)                    petals ≈ 180–240, bg < 0
 *   white:   value ≥ 150 and max−min ≤ 70
 */

export const IMG_W = 1242;
export const IMG_H = 822;

/** Plate reconstruction extends this far beyond each silhouette; the
 * runtime displacement clamp (LayerMesh.MAX_BEND_IMG) must stay below it. */
export const MOTION_MARGIN_PX = 18;

export const riggedLayers = [
  {
    id: "hero-cosmos",
    rect: [0.115, 0.145, 0.28, 0.535],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="305" cy="238" rx="124" ry="110" fill="white"/>
        <ellipse cx="298" cy="318" rx="72" ry="52" fill="white"/>
        <path d="M 312 300 C 316 336 322 372 328 404 C 333 430 338 448 344 462"
              fill="none" stroke="white" stroke-width="17" stroke-linecap="round"/>
      </svg>
    `,
    tight: {
      key: "magenta",
      threshold: 40,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
          <ellipse cx="307" cy="237" rx="48" ry="44" fill="white"/>
          <ellipse cx="312" cy="286" rx="24" ry="26" fill="white"/>
          <path d="M 312 300 C 316 336 322 372 328 404 C 333 430 338 448 344 462"
                fill="none" stroke="white" stroke-width="13" stroke-linecap="round"/>
        </svg>
      `,
    },
    fadeOut: { y0: 436, y1: 464 },
    feather: 2,
  },
  {
    id: "cosmos-2",
    rect: [0.395, 0.27, 0.175, 0.4],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="588" cy="306" rx="76" ry="70" fill="white"/>
        <ellipse cx="583" cy="352" rx="48" ry="38" fill="white"/>
        <path d="M 583 352 C 576 392 566 432 556 468 C 550 490 546 504 543 516"
              fill="none" stroke="white" stroke-width="14" stroke-linecap="round"/>
      </svg>
    `,
    tight: {
      key: "magenta",
      threshold: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
          <ellipse cx="590" cy="310" rx="30" ry="26" fill="white"/>
          <ellipse cx="585" cy="345" rx="20" ry="18" fill="white"/>
          <path d="M 583 352 C 576 392 566 432 556 468 C 550 490 546 504 543 516"
                fill="none" stroke="white" stroke-width="11" stroke-linecap="round"/>
        </svg>
      `,
    },
    fadeOut: { y0: 494, y1: 520 },
    feather: 2,
  },
  {
    id: "daisy-white",
    rect: [0.505, 0.29, 0.085, 0.155],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="677" cy="275" rx="38" ry="36" fill="white"/>
        <path d="M 676 300 C 674 316 672 330 671 346"
              fill="none" stroke="white" stroke-width="10" stroke-linecap="round"/>
      </svg>
    `,
    tight: {
      key: "white",
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
          <circle cx="677" cy="276" r="11" fill="white"/>
          <path d="M 676 300 C 674 316 672 330 671 346"
                fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/>
        </svg>
      `,
    },
    fadeOut: { y0: 332, y1: 350 },
    feather: 1.6,
  },
  {
    id: "orange-ur",
    rect: [0.77, 0.2, 0.135, 0.235],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="1029" cy="222" rx="74" ry="66" fill="white"/>
        <path d="M 1026 262 C 1020 300 1012 330 1004 362"
              fill="none" stroke="white" stroke-width="13" stroke-linecap="round"/>
      </svg>
    `,
    tight: {
      key: "orange",
      threshold: 55,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
          <ellipse cx="1029" cy="222" rx="21" ry="19" fill="white"/>
          <ellipse cx="1026" cy="256" rx="15" ry="13" fill="white"/>
          <path d="M 1026 262 C 1020 300 1012 330 1004 362"
                fill="none" stroke="white" stroke-width="11" stroke-linecap="round"/>
        </svg>
      `,
    },
    fadeOut: { y0: 340, y1: 366 },
    feather: 2,
  },
  {
    id: "orange-lr",
    rect: [0.815, 0.53, 0.125, 0.2],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="1087" cy="491" rx="66" ry="60" fill="white"/>
        <path d="M 1084 522 C 1078 550 1072 572 1066 594"
              fill="none" stroke="white" stroke-width="13" stroke-linecap="round"/>
      </svg>
    `,
    tight: {
      key: "orange",
      threshold: 45,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
          <ellipse cx="1087" cy="491" rx="20" ry="18" fill="white"/>
          <ellipse cx="1084" cy="516" rx="14" ry="12" fill="white"/>
          <path d="M 1084 522 C 1078 550 1072 572 1066 594"
                fill="none" stroke="white" stroke-width="11" stroke-linecap="round"/>
        </svg>
      `,
    },
    fadeOut: { y0: 572, y1: 598 },
    feather: 2,
  },
  /* ---- broadened participation: clusters, accents, nodding buds ---- */
  {
    id: "red-spray",
    rect: [0.27, 0.385, 0.235, 0.32],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="447" cy="400" rx="85" ry="60" fill="white"/>
        <ellipse cx="432" cy="470" rx="62" ry="58" fill="white"/>
        <ellipse cx="470" cy="520" rx="60" ry="45" fill="white"/>
      </svg>
    `,
    // only the scarlet blossoms sway; the tangle they grow through stays put
    tight: { key: "magenta", threshold: 36 },
    feather: 6,
    tightFeather: 1.4,
  },
  {
    id: "daisy-pair",
    rect: [0.585, 0.405, 0.08, 0.175],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <circle cx="789" cy="366" r="24" fill="white"/>
        <circle cx="764" cy="411" r="21" fill="white"/>
        <path d="M 789 388 C 787 402 785 416 783 430" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/>
        <path d="M 764 430 C 762 440 761 450 760 460" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/>
      </svg>
    `,
    tight: {
      key: "white",
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
          <circle cx="789" cy="366" r="8" fill="white"/>
          <circle cx="764" cy="411" r="7" fill="white"/>
          <path d="M 789 388 C 787 402 785 416 783 430" fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/>
          <path d="M 764 430 C 762 440 761 450 760 460" fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/>
        </svg>
      `,
    },
    fadeOut: { y0: 448, y1: 470 },
    feather: 1.8,
  },
  {
    id: "yellow-edge",
    rect: [0.672, 0.352, 0.115, 0.15],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="894" cy="333" rx="50" ry="32" fill="white"/>
        <ellipse cx="868" cy="342" rx="36" ry="26" fill="white"/>
        <path d="M 880 352 C 876 368 872 384 868 400" fill="none" stroke="white" stroke-width="10" stroke-linecap="round"/>
      </svg>
    `,
    // this little cluster is yellow-orange AND crimson — R−B catches both
    tight: {
      key: "orange",
      threshold: 70,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
          <ellipse cx="884" cy="336" rx="26" ry="16" fill="white"/>
          <path d="M 880 352 C 876 368 872 384 868 400" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/>
        </svg>
      `,
    },
    fadeOut: { y0: 386, y1: 406 },
    feather: 2.2,
  },
  {
    id: "bud-pair",
    rect: [0.47, 0.13, 0.08, 0.41],
    // already a tight structure: thin corridors + bud discs; no patch needed
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <circle cx="615" cy="128" r="14" fill="white"/>
        <circle cx="646" cy="144" r="12" fill="white"/>
        <path d="M 617 140 C 622 220 628 300 634 380 C 636 402 638 414 640 424" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/>
        <path d="M 647 155 C 652 230 656 300 660 372" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/>
      </svg>
    `,
    fadeOut: { y0: 400, y1: 428 },
    feather: 1.8,
  },
  {
    id: "violet-c",
    rect: [0.45, 0.695, 0.125, 0.185],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="628" cy="640" rx="55" ry="45" fill="white"/>
      </svg>
    `,
    // soft violet blossoms over dark tangle: sway the violet only
    tight: { key: "magenta", threshold: 40 },
    feather: 10,
    tightFeather: 4,
  },
  /* ---- extreme-foreground blur masses: soft ellipses, heavy feather ---- */
  {
    id: "fg-red-left",
    rect: [0.112, 0.428, 0.242, 0.268],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="290" cy="463" rx="112" ry="72" fill="white"/>
      </svg>
    `,
    feather: 12,
  },
  {
    id: "fg-crimson-c",
    rect: [0.42, 0.655, 0.3, 0.295],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="714" cy="660" rx="132" ry="78" fill="white"/>
      </svg>
    `,
    feather: 14,
  },
  {
    id: "fg-yellow-br",
    rect: [0.685, 0.72, 0.257, 0.28],
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMG_W}" height="${IMG_H}">
        <ellipse cx="1010" cy="715" rx="115" ry="75" fill="white"/>
      </svg>
    `,
    feather: 14,
  },
];

/**
 * Quality-check regions (tests/unit/plate.test.ts): plate must hold no
 * flower remnant here (ghost) and the TIGHT cutout must cover every strong
 * flower pixel here (coverage).
 */
export const qcRegions = [
  { id: "hero-cosmos", core: { cx: 305, cy: 238, r: 88 }, metric: "magenta" },
  { id: "cosmos-2", core: { cx: 588, cy: 306, r: 52 }, metric: "magenta" },
  { id: "orange-ur", core: { cx: 1029, cy: 222, r: 50 }, metric: "orange" },
  { id: "orange-lr", core: { cx: 1087, cy: 491, r: 44 }, metric: "orange" },
  { id: "red-spray", core: { cx: 442, cy: 428, r: 38 }, metric: "magenta" },
];
