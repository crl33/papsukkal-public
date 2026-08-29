---
type: object
cluster: v2-layers
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v2-reference-driven/src/layers/LayerMesh.ts
---

# Layer mesh

One photograph layer as drawable geometry — the `LayerMesh` class that turns a `LayerDef` into a plane in image space and is the single place where simulated metres of deflection become bounded image-space displacement.

## Why this shape

Two constraints meet here. First, a bend has to *look* like a stem bending, which needs vertices to interpolate the deformation curve — hence a dense grid for rigged layers and a bare quad for everything else; subdividing the full-frame plate would be thousands of wasted vertices for geometry that never moves (`LayerMesh.ts:20-23`). Second, and this is the real reason the class owns constants at all: a moving cutout slides off the pixels it used to cover, and what it uncovers must always be *reconstructed* plate, never leftover flower. That makes displacement a safety budget, not a taste knob. `MAX_BEND_IMG` is an absolute ceiling that the offline `MOTION_MARGIN_PX = 18` must exceed (`masks.mjs:32-34`), and a unit test pins the inequality so the two numbers can never drift apart in separate commits (`plate.test.ts:96-100`). 0.01 img × 1242 px ≈ 12.4 px of travel against 18 px of reconstruction. The clamps are `tanh`-shaped rather than hard `min` so a strong gust saturates gracefully instead of pinning flat and popping (`LayerMesh.ts:58-64`).

## Shape

- Geometry: `PlaneGeometry(w, h, segX, segY)` with `seg = max(24, round(extent * 260))` when rigged, `1` when not; translated into image space with a y-flip (`LayerMesh.ts:20-25`).
- `renderOrder = def.order`, `frustumCulled = false` — the manifest's painter order is the whole occlusion story (`LayerMesh.ts:36-37`).
- `MAX_BEND_IMG = 0.01`, `MAX_ROT = 0.05` — static, deliberately public so the test can read them (`LayerMesh.ts:44-45`).
- `setBend(bendX, bendZ, headLagRot)`: horizontal sway from `bendX`, a whisper of vertical from `bendZ` at 0.22× (depth deflection reads as a slight rise/dip at this camera angle), both scaled by `rig.bendScale`, then soft-clamped as a vector so the *magnitude* is capped, not each axis (`LayerMesh.ts:49-65`).
- Rotation is driven by the **simulated head-lag channel**, not by the bend: App passes `sim.output[o+3]`, the secondary oscillator forced by stem-tip acceleration (`App.ts:184`, `PlantSim.ts:189-201`, `:236-239`). That is what makes a head visibly trail the stem and settle, rather than tilting in lockstep with it (`LayerMesh.ts:66-69`).
- `forceBend` is the test/debug bypass — no clamp, no rig lookup (`LayerMesh.ts:72-76`). The ghost-hunting poses call it at 0.013 (≈16 px), deliberately *past* the runtime ceiling but still inside the 18 px margin (`debug.ts:43`, `versions/v2-reference-driven/scripts/ghost-probe.mjs:13`).

Citations: `versions/v2-reference-driven/src/layers/LayerMesh.ts:20-25`, `:36-37`, `:40-45`, `:49-70`, `:72-76`, `versions/v2-reference-driven/tools/masks.mjs:32-34`, `versions/v2-reference-driven/tests/unit/plate.test.ts:96-100`, `versions/v2-reference-driven/src/app/App.ts:184`, `versions/v2-reference-driven/src/wind/PlantSim.ts:189-201`, `:236-239`, `versions/v2-reference-driven/src/dev/debug.ts:43`

## Connected to

- **owns:** the material instance and its `uRoot`/`uHead`/`uHeadR`/`uBend`/`uRot` uniforms (`LayerMesh.ts:27-33`).
- **owned-by:** `v2-layers/layer-manifest.md` (every construction input) and `v2-layers/v2-app.md` (constructs it, calls `setBend` each frame).
- **joins:** `wind/plant-oscillator.md` (consumes `output[o]`, `[o+1]`, `[o+3]`), `../../processes/prepare-assets.md` (the margin on the other side of the invariant), `pipeline/dev-gates.md` (the margin test).
- **looks-like-but-is-not:** V1's `vegetation-material.md`. V1 clamps bend on the GPU per-vertex inside one shared shader; here the clamp is CPU-side, per layer, and exists for a decomposition reason V1 does not have.

## If you change this

- **Hits:** raising `MAX_BEND_IMG` above 18/1242 ≈ 0.0145 fails `plate.test.ts:96-100` — and the fix is never to weaken the test: raise `MOTION_MARGIN_PX` in `tools/masks.mjs` **and re-run the asset build**, because the margin is baked into `plate.jpg` at generation time (`prepare-assets.mjs:318-322`). Lowering it is safe but silent: the test only bounds the clamp from above, and the debug/probe poses call `forceBend`, which skips the clamp entirely — 0.013 (≈16 px, already 30 % past the 0.01 ceiling, still under the 18 px margin) stays put whatever the constant says (`LayerMesh.ts:72-76`, `debug.ts:43`). A lower ceiling therefore widens that gap: the ghost check keeps hunting seams at a deflection the runtime can no longer reach, while the visible sway shrinks toward nothing. Move the pose with the constant. Dropping the segment counts shows up as faceting along the bend on wide layers. Changing the `0.22` vertical factor or the `* 4` rotation gain retunes every rigged layer at once — these are global multipliers sitting upstream of per-layer `bendScale`/`rotGain`.
- **Does not hit:** the zero-motion gate. At rest every input is exactly zero, the length guard short-circuits and `tanh(0) = 0`, so no clamp value can displace a pixel at `wind=0` (`LayerMesh.ts:58-69`). It also does not hit the simulation: this clamp is display-side and never feeds back, so a plant's stored energy, settling time and `maxBendFrac` cap are untouched (`PlantSim.ts:222-230`) — clamping harder makes the motion smaller, not calmer. And it does not touch static layers: `setBend` early-returns without a rig (`LayerMesh.ts:51`), so the plate and the `-bg` patches are unreachable from here no matter what the constants say.

## Surfaces

| Surface | Role |
|---|---|
| `src/app/App.ts` | writes — constructs each mesh, pushes sim output every frame |
| `src/dev/debug.ts` | writes — `forceBend` pose, per-mesh visibility, `uDebugMode` |
| `versions/v2-reference-driven/scripts/ghost-probe.mjs` | writes — forced pose for seam/ghost capture |
| `tests/unit/plate.test.ts` | reads — `MAX_BEND_IMG` for the margin invariant |

## See

- Source: `versions/v2-reference-driven/src/layers/LayerMesh.ts`
- Counterpart constant: `versions/v2-reference-driven/tools/masks.mjs:34`
