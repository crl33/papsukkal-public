# V2 — Reference-Driven Living Photograph

The reference photograph (`public/reference/reference.jpg`, 1242×822) is the
appearance source. Nothing at runtime generates appearance: the engineering
problem is *moving the existing artwork convincingly*, not recreating it.

```
SOURCE REFERENCE
      ↓  tools/prepare-assets.mjs  (offline, sharp, deterministic, no AI)
layered RGBA assets  (public/reference/layers/)
      ↓
subdivided textured meshes  (src/layers/LayerMesh.ts)
      ↓  vertex-shader deformation  (src/shaders/layerMaterial.ts)
V1's breeze model  (src/wind/ — COPIED from tag v1-procedural)
      ↓
real-time compositing  (ortho camera, painter's order)
      =
the photograph, quietly alive
```

## The zero-motion invariant (the most important rule)

With `?wind=0` the composite must look essentially identical to the
reference. This is enforced, not aspirational: the e2e gate
(`tests/e2e/fidelity.spec.ts`) screenshots the page and pixel-compares
against `reference.jpg` — current baseline **mean |diff| ≈ 2/255 with
0.2% of pixels off by >40**. The residue is the feathered mask borders.
Motion is added *on top of* the artwork; it never replaces it. Two more
unit-level guarantees run against the generated assets: the GHOST test
(each moving flower's core region in the plate must have collapsed chroma
AND structureless gradient energy — no petal shapes left behind) and the
COVERAGE test (every strong flower pixel must be near-opaque in its
cutout — the moving layer carries the whole flower).

## Decomposition (offline)

`tools/masks.mjs` hand-authors each layer's selection from close study of
the photograph; `tools/prepare-assets.mjs` builds:

- **Cutouts** — one generous hand-authored SVG SILHOUETTE per moving
  unit, enclosing the ENTIRE visible structure: every petal (bright and
  dark), center, calyx, and the full visible stem, feathered and faded
  where the structure slips behind foreground blur, softly windowed to
  its crop rect. Color keying was abandoned: it under-covers the dark
  parts of a flower, and any un-extracted pixel left in the plate becomes
  a ghost the moment the flower sways. Foreground blur masses use soft
  ellipses with heavy feather.
- **Background plate** — the reference with every cutout region EXPANDED
  by an ~18px motion margin (wider than the runtime displacement clamp)
  and filled by iterative neighbor-diffusion at ¼ resolution, smoothed,
  upsampled, blurred to the local bokeh, and blended under the original
  across a wide soft shoulder so the reconstruction boundary can never
  read as a tonal edge. Restoration, not redesign — and a sway can only
  ever reveal reconstructed background, never leftover flower.

A unit test enforces exact rect parity between `tools/masks.mjs` and
`src/config/layers.ts` (a mismatch stretches a layer's texture — caught the
hard way).

## Runtime

- **Layers** (`src/config/layers.ts`): plate + 13 coherent moving units —
  both cosmos, the white daisy and its accent pair, both orange daisies,
  the yellow edge-on bloom, the nodding bud-stem pair, the red
  micro-bloom spray, the violet cluster, and three foreground blur
  masses — in painter's order under an orthographic camera in image space
  with CSS-`object-fit: cover` framing semantics. The composition is
  locked. Every moving unit is a full botanical silhouette (head, petals,
  center, stem to its occlusion point); the runtime clamps displacement
  (~16px soft-tanh) below the plate's reconstruction margin (~18px), so a
  sway can only ever reveal reconstructed background.
- **Deformation** (`src/shaders/layerMaterial.ts`): per-vertex weight
  `W = max(env(t), headW)` where `t` is progress along the root→head axis,
  `env` is V1's root-fixed bend envelope `t²(0.4+0.6t)`, and `headW` is a
  smooth disc around the head center — the root never moves, the stem bends
  progressively, the head travels rigidly with a small aspect-corrected
  rotation. No whole-image UV wobble anywhere.
- **Wind** (`src/wind/`): `WindField` + `PlantSim` copied verbatim from V1
  (tag `v1-procedural`, commit 15283c4; provenance headers in each file).
  One documented behavioral change: V1's seeded rest-curvature is zeroed —
  the photograph already encodes every plant's rest pose, so the sim must
  be exactly zero at rest. Each layer registers one oscillator at the same
  V1-world coordinates its flower occupied in the procedural meadow, so
  gust fronts cross the photograph with V1's spatial timing. Wind maps to
  image space via per-layer `bendScale` at roughly a third of the physical
  amplitude — quietly alive, not a storm.
- **Photographic DOF is preserved, not recreated**: the baked blur in the
  source does all optical work (spec §17). There is no runtime DOF, no
  tone mapping, no grade — textures pass through undecoded
  (`NoColorSpace`) so the photograph's bytes reach the canvas faithfully.

## What deliberately does NOT move

The distant background and midfield tangle stay still. Their blur hides
nothing, their motion risks texture-stretch artifacts, and the perceptual
weight of the breeze lives in the focused flowers and near field
(spec §16). Candidate for a later pass: the maroon bloom top-center
(needs the bud stems in front of it separated first).

## Dev modes (DEV-only, never ship)

Keys `1` reference / `2` static / `3` animated / `4` plate / `5` layers /
`6` difference blend / `7` alpha-mask view / `8` deformation-weight
heatmap / `9`,`o` forced ±max-deflection pose (the ghost-hunting view) /
`0` off; `?wind=0` hard-static; `?det=1&t=N` + `window.__advanceTo`
deterministic capture; `?bare=1` hides all chrome for pixel tests.

## Performance

14 draw calls, one texture per layer (plate ~1MP, cutouts small), no
per-frame allocations; the oscillator sim is 13 plants at 120 Hz
substeps. Cost is a small fraction of V1's procedural meadow.
