---
type: process
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/app/App.ts
consumes: [wall clock (rAF), WindField, PlantSim state, MeadowScene meshes]
produces: [one composited canvas frame, updated sim.time, quality-downgrade latch]
---

# render-frame — wall clock to canvas (V1)

One V1 frame: elapsed wall time becomes whole 120 Hz simulation substeps, the resulting per-plant bend is pushed into GPU uniforms and instanced attributes, then the scene is rendered, defocused, tone-mapped and graded.

## Input → Movement → Output

In: milliseconds since the last frame, from `renderer.setAnimationLoop`. Movement: the delta is banked in an accumulator and spent in fixed `1/120 s` steps of damped-oscillator integration, whose output array is copied — not recomputed — into GPU state keyed by each plant's sim index. Out: `composer.render()` walks RenderPass → `CinematicDofPass` → ACES tone map + grade onto the canvas.

## Why this shape

The simulation is deliberately decoupled from the display. A stem is a damped spring; integrating it with raw frame dt makes a 30 Hz laptop and a 120 Hz monitor two different artworks, and a stiff plant explodes on the first long frame. So the loop clamps the delta twice and spends it in fixed substeps (`PlantSim.ts:48`, `PlantSim.ts:126`), and `syncToGpu` is handed **sim time, not wall time** (`App.ts:150`) — including the grade's grain seed (`composer.ts:88`), which is what makes `?det=1&t=` captures bit-reproducible. DOF sits before the grade because it reads the real depth buffer (`composer.ts:6`): blur first, grade the blurred image, never the reverse.

## Steps

1. `setAnimationLoop(() => this.tick())` in live mode; det mode never enters the loop and renders once — `App.ts:86`, `App.ts:105`.
2. `dt` = wall delta, clamped to 0.25 s — `App.ts:147`.
3. `sim.update(dt)` re-clamps to `MAX_FRAME_DT = 1/15` (the effective clamp) and drains the accumulator in `SUBSTEP = 1/120` steps — `PlantSim.ts:49`, `PlantSim.ts:126`.
4. Each substep integrates stem + head oscillators semi-implicitly; `writeOutput` packs stride-4 `[bendX, bendZ, pitch, roll]` with the hard cap and nod clamp — `PlantSim.ts:144`, `PlantSim.ts:206`, `PlantSim.ts:219`.
5. `meadow.syncToGpu(sim.time)` fans that one array out three ways: hero uniforms `uBend/uGust/uTime` (`MeadowScene.ts:399`), instanced attributes + `needsUpdate` (`InstancedPlants.ts:93`), bokeh sprite bends (`BokehSprites.ts:131`).
6. Grain time set from sim time — `App.ts:151`, `composer.ts:88`.
7. `composer.render()`: RenderPass → DOF → `EffectPass(tone, grade)` — `App.ts:183`, `composer.ts:107`.
8. `watchPerformance` EMA-vs-frame-floor; 90 consecutive slow frames latch a permanent pixel-ratio/post-buffer downgrade — `App.ts:165`.

Because time advances only in whole substeps, `sim.time` trails the wall clock by the accumulator remainder (< 8.3 ms); everything downstream lives on that clock.

## If you change this

- **Hits:** editing `SUBSTEP` or the accumulator changes every plant's trajectory and breaks `plantSim.test.ts:23` (30 fps vs 120 fps agreement). Passing wall time instead of `sim.time` to `syncToGpu`/`setGrainTime` de-determinises `?det=1` and therefore `versions/v1-procedural/scripts/shots.mjs` and every silhouette comparison. Reordering the composer passes changes DOF from depth-aware to a grade-space smear. Adding a plant type means adding a sim slot **and** a sync path — `syncToGpu` only touches the three collections it knows (`MeadowScene.ts:399`–`407`).
- **Does not hit:** V2's loop or V2's pixel gate — V2 keeps its own copy of the wind model (`versions/v2-reference-driven/src/wind/PlantSim.ts:1`) and has no runtime DOF. Composition: placements are resolved once in the `MeadowScene` constructor (`MeadowScene.ts:103`), so loop timing never moves a flower on screen. The camera: locked (`App.ts:61`); only resize touches it. Quality *content*: the runtime downgrade lowers pixel ratio and post buffers only — `vegetationDensity` and `heroDetail` are read once at construction (`quality.ts:14`), so a downgraded session is not a thinner meadow.

## Surfaces

| Surface | Role |
|---|---|
| Browser rAF | drives `tick` |
| `versions/v1-procedural/scripts/shots.mjs` | reads the det branch (`?det=1&t=`) instead of the loop |
| `tests/e2e/smoke.spec.ts` | re-renders synchronously and samples the canvas |
| GPU materials | written every frame (uniforms + instanced attributes) |

## See

- Objects: `objects/v1-scene/v1-app.md`, `objects/wind/plant-oscillator.md`, `objects/v1-scene/cinematic-dof.md`
- Source: `versions/v1-procedural/src/app/App.ts`, `versions/v1-procedural/src/scene/MeadowScene.ts`, `versions/v1-procedural/src/scene/postprocessing/composer.ts`
