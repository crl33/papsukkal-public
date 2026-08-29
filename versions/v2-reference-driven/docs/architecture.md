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
against `reference.jpg` — current baseline **mean |diff| ≈ 1.4/255 with
0.03% of pixels off by >40**. The residue is the feathered mask borders.
Motion is added *on top of* the artwork; it never replaces it.

## Decomposition (offline)

`tools/masks.mjs` hand-authors each layer's selection from close study of
the photograph; `tools/prepare-assets.mjs` builds:

- **Cutouts** — per rigged layer, mask = SVG shapes (stem corridors, dark
  flower centers) ∪ chroma key inside an ROI ellipse (`magenta`, `orange`,
  or `white` metrics, with value gates and radial threshold falloff so
  neighbouring dark-red/soft elements stay out), dilated, feathered, and
  faded out where a stem slips behind foreground blur. Foreground blur
  masses use pure soft ellipses with heavy feather — soft-on-soft, no
  keying needed.
- **Background plate** — the reference with all masked regions filled by
  iterative neighbor-diffusion at ¼ resolution, smoothed, upsampled and
  blurred to the local bokeh, composited under the original. Restoration,
  not redesign: behind these defocused flowers the surroundings are bokeh,
  so a diffusion fill is visually indistinguishable from "what was behind",
  and only the few pixels a subtle sway can reveal ever show.

A unit test enforces exact rect parity between `tools/masks.mjs` and
`src/config/layers.ts` (a mismatch stretches a layer's texture — caught the
hard way).

## Runtime

- **Layers** (`src/config/layers.ts`): plate + 5 rigged flowers (both
  cosmos, white daisy, two orange daisies) + 3 foreground masses, drawn in
  painter's order under an orthographic camera in image space with
  CSS-`object-fit: cover` framing semantics. The composition is locked.
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
(spec §16). Candidates for a later pass: the maroon bloom top-center
(needs the bud stems in front of it separated first) and the red
micro-cluster sprays.

## Dev modes (DEV-only, never ship)

Keys `1` reference / `2` static / `3` animated / `4` plate / `5` layers /
`6` difference blend / `0` off; `?wind=0` hard-static; `?det=1&t=N` +
`window.__advanceTo` deterministic capture; `?bare=1` hides all chrome for
pixel tests.

## Performance

9 draw calls, one ~1MP texture per layer, no per-frame allocations; the
oscillator sim is 8 plants at 120 Hz substeps. Cost is a small fraction of
V1's procedural meadow.
