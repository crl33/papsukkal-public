# Architecture

A real-time cinematic reconstruction of the master reference photograph
(see [visual-reference.md](./visual-reference.md)) — a wildflower meadow with
an extremely shallow depth of field, brought to life by a physically-modeled
breeze. Vanilla Three.js + TypeScript + Vite; no framework in the render path.

```
index.html                     landing markup + overlay typography (static)
src/
  main.ts                      bootstrap; dev-only overlay via DEV-guarded import
  app/App.ts                   renderer, locked camera, loop, responsive framing,
                               deterministic capture mode, reduced-motion
  config/
    cameraConfig.ts            THE camera numbers + screen→world projection math
    composition.ts             art-directed placements (deterministic)
    palette.ts                 color anchors extracted from the reference
    quality.ts                 quality tiers (pixel ratio, density, DOF res)
  scene/
    MeadowScene.ts             assembles heroes, instanced systems, sprites
    environment.ts             world-anchored backdrop shader + ground
    flowers/
      GeomBuilder.ts           indexed geometry accumulator w/ custom attributes
      species.ts               procedural botanical builders (all seeded)
    vegetation/
      InstancedPlants.ts       instanced secondary vegetation + per-instance sim
      BokehSprites.ts          deep-background impostors (poppy rings, blobs)
    shaders/
      vegetationMaterial.ts    the one vegetation shader family (bend/flutter)
    wind/
      WindField.ts             spatial-temporal wind W(x,z,t), pure + seeded
      PlantSim.ts              per-plant damped oscillators, fixed 120Hz substeps
    postprocessing/
      composer.ts              chain: render → DOF → tonemap+grade
      CinematicDofPass.ts      custom CoC-driven blur-pyramid depth of field
  dev/compare.ts               DEV-ONLY reference comparison overlay
  utils/prng.ts, noise.ts      seeded mulberry32, simplex/value noise
scripts/
  shots.mjs                    deterministic multi-viewport screenshot capture
  motion-probe.mjs             stroboscopic motion frames + stability probe
  perf-probe.mjs               FPS / draw-call measurement
  video-probe.mjs              25s live-playback recording for motion QA
tests/
  unit/                        wind, sim, prng (vitest)
  e2e/smoke.spec.ts            render/animate/reduced-motion/responsive (playwright)
```

## The camera is the composition

`cameraConfig.ts` locks a photographic camera: 22° vertical FOV, 0.52 m above
the soil, level pitch, at the origin looking down −Z. `placeFromScreen(nx, ny,
depth)` inverts that projection, so `composition.ts` authors every subject in
the *reference photograph's normalized pixel coordinates* plus a camera
distance — the rendered frame matches the photo's layout by construction.

The camera never moves. No orbit, no parallax, no drift: the plants move, the
photograph's point of view is authoritative (spec invariant D). Responsive
framing only adjusts FOV: portrait viewports widen the vertical FOV just
enough to keep the hero cluster's horizontal extent in frame.

## Depth of field (`CinematicDofPass`)

The reference needs foreground blur discs around 10–15% of frame width —
beyond what single-kernel gather DOF does cleanly, so the pass is custom:

1. **Prefilter** to 1/2 res; write near-field CoC into alpha.
2. **Blur pyramid** A(1/2) → B(1/2) → C(1/4) → D(1/8), Kawase iterations,
   each level continuing from the previous (progressively creamy, huge radii).
3. **Composite** per pixel by circle of confusion computed from the real
   depth buffer with a saturating physical curve `c ∝ |d − f| / d`, blending
   between sharp/A/B/C/D. Near CoC rides the pyramid's alpha, so foreground
   blur *dilates and spills* over the sharp midground like a real lens.
   The far field caps at level C (distant flowers stay *structured* bokeh
   discs rather than fog, with only the deepest layer blending partway to
   D); the creamiest D level is otherwise reserved for the near field —
   matching how real lenses render foreground defocus creamier than
   background.

Because CoC comes from scene depth, anything that moves through the focus
plane sharpens or softens by itself — the DOF is structural, not painted.

Tone mapping is ACES filmic (postprocessing `ToneMappingEffect`), followed by
a custom grade effect: teal-navy shadow bias, highlight-protected saturation,
vignette, fine grain.

## Wind model

**Shared spatial wind field + individual plant mechanics** (invariant G).

`WindField.sample(x, z, t)` is a pure seeded function combining:

- **Base flow** whose direction meanders slowly (value noise on t).
- **Travelling gusts**: two channels of 1D ridge noise advected along the
  wind direction at gust speed — a front physically crosses the meadow, so
  upwind plants load before downwind plants. Cross-wind noise breaks up
  straight fronts. (Verified by the lag-correlation unit test.)
- **Medium turbulence**: advected 2D simplex FBM plus a direction-perturbing
  term, so wind wiggles in angle as well as magnitude.

There is no `sin(time)` vegetation anywhere (invariant F): all periodic-ish
texture comes from noise, and the only wave primitives (GPU petal flutter)
sum smooth triangle waves at three incommensurate frequencies with per-plant
and per-vertex phases — the composite never visibly repeats.

## Plant mechanics (`PlantSim`)

Every plant — hero, instanced filler, background impostor — is a damped
oscillator anchored at its root:

```
F  = drag · (wind − 0.6·v)          # relative-velocity drag: moving stems shed load
a  = F·k − k(1 + (|x|/max)⁴·3)·x − c·v   # progressive stiffening near max bend
```

integrated with semi-implicit Euler at a fixed 120 Hz substep + accumulator,
so 30/60/120 fps displays produce identical trajectories (unit-tested).
A second oscillator driven by the stem-tip *acceleration* produces the
flower-head lag/nod (pitch/roll), clamped to ±0.22 rad.

Species mechanics presets (frequency, damping ratio, drag, max bend, head
gain) live in `MECHANICS`; every plant gets ±12% seeded variation so no two
share a natural frequency — synchronization is impossible by construction.

Per frame the sim writes `[bendX, bendZ, headPitch, headRoll]` per plant;
heroes consume it as uniforms, instanced systems as instanced attributes.

## GPU deformation (`vegetationMaterial.ts`)

- **Primary bend**: smooth root-fixed envelope on the stem-height parameter,
  displacing XZ then re-normalizing each vertex's distance from the root, so
  stems arc instead of stretch (re-implemented from GPU Gems 3 ch. 16 —
  see CREDITS). Roots cannot slide: the envelope is zero at s=0.
- **Rigid heads**: head vertices rotate as one body around the bent stem
  tip; the head frame comes from sampling the bent spine at two heights
  (adapted from inkwell-webgpu-flowers), then head pitch/roll lag applies.
- **Micro flutter**: petal/leaf shimmer along vertex normals, amplitude
  scaled by the local gust value, phases de-synchronized as above.

## Rendering tiers

- **Heroes** (~38 meshes): individually built geometry, unique art
  direction, per-mesh materials (one shared shader program).
- **Instanced systems**: wiry tangle stems (curved/branching, nodding
  buds), feathery filigree clumps, mid-distance soft blooms, foliage
  tufts — one draw call each, per-instance bend/gust/tint attributes.
  Scatter follows hand-authored screen-space density zones
  (`composition.tangleZones`/`featherZones`/`bgField`) transcribed from the
  reference's distribution, projected to continuous depth through the
  locked camera.
- **Background impostors** (`BokehSprites`): flat discs with real depth;
  the DOF turns them into authentic bokeh (defocused-poppy rings, soft
  blobs). Used only beyond ~2 m where blur destroys interior detail.
- **Extreme foreground**: real low-poly flower geometry on wind-driven
  stems at 0.3–0.6 m — extreme defocus paints them; their silhouettes
  breathe with the breeze.

Quality tiers (`quality.ts`) scale pixel ratio, DOF resolution and filler
density — never the hero composition.

## Determinism

Everything random flows through seeded mulberry32. `?det=1&t=<seconds>`
advances the simulation to an exact time and freezes — screenshots are
reproducible to the pixel; `window.__advanceTo(t)` steps further for motion
probes. `?seed=` re-rolls the wind; the composition itself never re-rolls.

## Accessibility

`prefers-reduced-motion` keeps the full scene, composition and DOF, and
reduces the wind field's intensity to a near-still 12% — the static frame is
first-class. The scene container carries a descriptive `aria-label`; overlay
text keeps contrast against the dark meadow with subtle text shadows.
