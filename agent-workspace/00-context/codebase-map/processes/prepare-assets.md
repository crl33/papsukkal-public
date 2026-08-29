---
type: process
cluster: pipeline
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v2-reference-driven/tools/prepare-assets.mjs
consumes:
  - objects/v2-layers/mask-specs.md
  - versions/v2-reference-driven/public/reference/reference.jpg
produces:
  - objects/v2-layers/layer-manifest.md (the files it names)
  - versions/v2-reference-driven/public/reference/layers/plate.jpg
  - versions/v2-reference-driven/public/reference/layers/plate-mask.png
---

# prepare-assets — cutting the photograph into movable parts

`npm run assets`: one photograph in, a clean background plate plus a moving
cutout and a static patch per layer out. Deterministic, sharp only, no AI
(`prepare-assets.mjs:23`).

## Input → Movement → Output

Input: `public/reference/reference.jpg` and the hand-authored specs in
`tools/masks.mjs`. Movement: each spec is rasterised into a silhouette and a
tight mask, the difference between them becomes a static background patch, and
the union of all silhouettes — grown by the motion margin — is diffusion
inpainted out of the photograph. Output: `<id>.png`, `<id>-bg.png`,
`<id>-mask.png`, `plate.jpg` and the full-frame `plate-mask.png` that drove the
fill, under `public/reference/layers/`, all committed.

## Why this shape

The obvious shortcut is one mask per flower and a plate hole to match. It fails
twice. A single generous mask makes the mover carry the background between the
petals, so the meadow sways with the flower. A hole that matches the mask
exactly means the first sway exposes un-reconstructed pixels — the flower's own
leftovers — and the flower ghosts. Hence: tight cutout, static patch, and a hole
expanded by `MOTION_MARGIN_PX` which is required to exceed the runtime
displacement clamp (`prepare-assets.mjs:10`, gated at `plate.test.ts:96`). The
inpaint is restoration, not invention: behind these flowers the world is already
defocused, so a diffusion fill is indistinguishable from what was there
(`prepare-assets.mjs:214`).

## Steps

1. Load the reference once as raw RGBA and keep it as the pixel authority
   (`prepare-assets.mjs:35`).
2. Silhouette: rasterise `layer.svg` to a hard plane (`prepare-assets.mjs:49`),
   blur by `feather ?? 2`, then `fadeAndWindow` — the `fadeOut` ramp dissolves
   the stem's lower end and an 8 px rect window keeps feather off a hard crop
   edge; edges that coincide with the image border are left alone, the frame is
   not a seam (`prepare-assets.mjs:137`, `prepare-assets.mjs:88`,
   `prepare-assets.mjs:106`).
3. Tight: structural SVG shapes, unioned with un-gated chroma scored only where
   the *hard* silhouette is present; scores ramp from the threshold to full
   opacity at ×8 (`prepare-assets.mjs:152`, `prepare-assets.mjs:78`).
4. Close pinholes between petal pixels with two passes of 3×3 max-dilate, feather
   by `tightFeather ?? 1.4`, then clamp per-pixel to the silhouette so the mover
   can never exceed its own hole (`prepare-assets.mjs:161`,
   `prepare-assets.mjs:59`, `prepare-assets.mjs:167`).
5. Patch = `silhouette · (255 − tightWide)`, where `tightWide` is the tight mask
   dilated again and blurred — the extra ring is deliberately ceded to the plate
   fill so the cutout's soft edge has somewhere to sit. A patch with fewer than
   200 meaningful pixels is discarded (`prepare-assets.mjs:170`).
6. Write cutouts cropped to the layer rect, RGB straight from the reference and
   alpha from the mask; `-bg` for the patch, plus a full-frame `-mask.png` for
   debugging (`prepare-assets.mjs:186`, `prepare-assets.mjs:207`, `prepare-assets.mjs:313`).
7. Accumulate the silhouette union, expand it with `blur(MOTION_MARGIN_PX / 2)`
   and remap ×2.2 so the core saturates to full replacement while the boundary
   keeps a wide shoulder — a hard edge would read as a tonal arc when a sway
   exposes it (`prepare-assets.mjs:309`, `prepare-assets.mjs:319`). That mask is
   also written out as `plate-mask.png` before it is consumed — committed, loaded
   by nothing at runtime, and the one artefact that shows exactly where the
   photograph stopped being the photograph (`prepare-assets.mjs:331-333`).
8. Plate: quarter-res copy, iterative 4-neighbour diffusion fill with an
   800-iteration guard, 60 smoothing sweeps, upsample to full frame, `blur(6)`
   for bokeh, composite over the reference by the plate mask's alpha, write JPEG
   q95 with 4:4:4 chroma (`prepare-assets.mjs:220`, `prepare-assets.mjs:244`,
   `prepare-assets.mjs:272`, `prepare-assets.mjs:288`, `prepare-assets.mjs:301`).

**Gotcha — channel promotion.** sharp will silently promote a 1-channel raw
buffer through `blur`/`resize`, so every single-plane read-back goes via
`toPlane`, which strides by `info.channels` rather than assuming 1;
`buildPlate` repeats the same defence for the downsized mask. Index a blurred
mask buffer directly and you get a mask smeared across the wrong stride
(`prepare-assets.mjs:40`, `prepare-assets.mjs:231`).

## If you change this

- **Hits:** every file under `public/reference/layers/` — they are committed
  build products, and the runtime loads them by name from
  `src/config/layers.ts`. The acceptance gates run against the *generated*
  assets, so a change here is judged by `tests/unit/plate.test.ts:40` (no ghost
  chroma or petal structure in the plate cores) and `:71` (≥99.5 % of strong
  flower pixels near-opaque in the cutout). Raising `MOTION_MARGIN_PX` past what
  the inpaint can plausibly fill widens the reconstructed band across the whole
  frame, since the margin is applied to the union, not per layer.
- **Does not hit:** the manifest. This script never writes
  `src/config/layers.ts` — adding a spec to `masks.mjs` produces PNGs that
  nothing loads until the manifest gains a matching entry with its own `rect`,
  `order` and `rig`. It also does not run on the public site (dev-time only,
  `prepare-assets.mjs:2`), and it is V2-only — V1 synthesises its pixels and has
  no asset build of this kind.

## Surfaces

| Surface | Role |
|---|---|
| `package.json` (`assets` script) | entry point — `node tools/prepare-assets.mjs` |
| `tools/masks.mjs` | input — specs, `MOTION_MARGIN_PX`, frame size |
| `public/reference/layers/` | output — cutouts, patches, per-layer masks, plate, plate mask |
| `tests/unit/plate.test.ts` | verifies the output, not the code |

## See

- Objects: `objects/v2-layers/mask-specs.md`, `objects/v2-layers/layer-manifest.md`,
  `objects/pipeline/dev-gates.md`
- Source: `versions/v2-reference-driven/tools/prepare-assets.mjs`
