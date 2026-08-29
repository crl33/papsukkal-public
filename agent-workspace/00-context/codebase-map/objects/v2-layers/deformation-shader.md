---
type: object
cluster: v2-layers
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v2-reference-driven/src/shaders/layerMaterial.ts
---

# Deformation shader

The V2 layer material (`createLayerMaterial`) — one vertex shader that bends a photograph layer around its root anchor, and a fragment shader that draws it or, in dev, x-rays it.

## Why this shape

The forbidden design is stated in the file itself: this is **explicitly not a whole-image UV wobble** (`layerMaterial.ts:18-19`). A global UV warp would drag the entire photograph — locked composition, untouched background, everything — and V2's whole claim is that the reference photograph stays the reference photograph while a few things in it move. So deformation is anchored (zero at the root, always), local (per-layer geometry, and the plate is never rigged) and *weighted* rather than uniform. The weight is a `max` of two independent notions of "should move": a stem envelope that grows along the root→head axis using V1's own curve `t²(0.4+0.6t)`, and a soft disc around the flower head. `max` rather than a blend is what keeps head and stem one continuous structure — a hard boundary between "stem bends" and "head translates" would shear at the junction, and a photographed flower has no seam there to hide it (`layerMaterial.ts:56-57`). The root guard exists because the head disc can be large enough to reach the anchor on short layers; multiplying by `smoothstep(0.0, 0.22, t)` forces `W → 0` at the root regardless of disc size, so `LayerRig.root`'s promise of "zero motion here, ever" holds for every layer, not just the tall ones (`layerMaterial.ts:53-57`).

## Shape

- `W = max(env, headW · smoothstep(0.0, 0.22, t))`, where `t` is the clamped projection of the vertex onto the root→head axis, `env = t²(0.4+0.6t)`, and `headW = 1 − smoothstep(0.3, 1.35, headD)` — a gentle ramp from 0.3× to 1.35× `headRadius`, not a hard disc (`layerMaterial.ts:47-57`). Displacement is `img += uBend * W` (`:60`).
- Head distance and head rotation are computed in **aspect-corrected space** — x is multiplied by `IMG_ASPECT` before the distance/rotation and divided out after, so the disc is round and the rotation does not shear on a 1242×822 frame (`layerMaterial.ts:51`, `:65-70`). `IMG_ASPECT` is baked into the GLSL as a literal at module load (`:30`).
- Rotation is about the **displaced** head centre `uHead + uBend`, scaled by `headW` so it fades out with the disc (`layerMaterial.ts:62-71`).
- The y-flip happens twice: world y-up → image y-down on entry, back on exit (`layerMaterial.ts:45`, `:73-74`).
- `vUv` is passed straight through, untouched (`layerMaterial.ts:42`) — the mesh moves, the sampling grid does not.
- Fragment: `uDebugMode` 0 normal · 1 alpha view · 2 deformation-weight heatmap over the layer's own alpha, red = moves fully, blue = anchored (`layerMaterial.ts:85-96`). Normal path discards near-zero alpha (`:97`).
- Material: `depthTest`/`depthWrite` off, `NoBlending` for the opaque plate and `NormalBlending` for cutouts; rig uniforms default to a degenerate head (`uHeadR = 0.001`) so an unrigged layer cannot accidentally deform (`layerMaterial.ts:102-120`).

Citations: `versions/v2-reference-driven/src/shaders/layerMaterial.ts:18-19`, `:30`, `:42`, `:45`, `:47-57`, `:60`, `:62-74`, `:85-97`, `:102-120`, `versions/v2-reference-driven/src/dev/debug.ts:86-96`

## Connected to

- **owns:** the five rig uniforms and `uDebugMode`; the on-GPU definition of "which pixels of this layer move".
- **owned-by:** `v2-layers/layer-mesh.md` — the only caller of `createLayerMaterial`, and the only writer of `uBend`/`uRot`.
- **joins:** `v2-layers/layer-manifest.md` (`root`/`head`/`headRadius` become uniforms verbatim), `wind/plant-oscillator.md` (the envelope is V1's, copied as a formula), `pipeline/measurement-tools.md` (debug modes 7/8 are how the weight field is inspected, `debug.ts:86-96`).
- **looks-like-but-is-not:** V1's `vegetation-material.md`, which shares the envelope shape but moves synthesised geometry with a per-vertex attribute contract. Also not a post-process — V2 has **no runtime DOF**; the blur you see is in the photograph.

## If you change this

- **Hits:** the weight function is the seam. Widening `headW`'s window or the root guard's `0.22` changes which photographed pixels travel — most visibly where a stem base meets its static `-bg` patch, which must stay welded. Nothing catches that automatically: the margin invariant bounds displacement *magnitude* (`LayerMesh.ts:44`), so it stays true whatever shape `W` takes, and the zero-motion e2e gate runs at `wind=0` where `uBend` is zero everywhere. Verify by eye with debug key 8 and the forced pose (keys 9/o). Note the head rotation adds travel the margin arithmetic does not model — roughly `r · uRot` inside the disc, a couple of px at current radii, eating into the 12.4 px→18 px headroom; raising `MAX_ROT` or `headRadius` spends it. If `IMG_W`/`IMG_H` ever change, the aspect literal is baked at module load and every material must be recreated, not just re-uniformed (`layerMaterial.ts:30`).
- **Does not hit:** the plate or the background patches. They are built with no rig, so `uBend` stays `(0,0)` and `setBend` never runs for them — no edit to the bend math can move the background (`LayerMesh.ts:51`, `App.ts:66-74`). It does not hit texture sampling either: `vUv` is never modulated, so this is not, and cannot become, a UV warp by accident. And the debug branches do not reach production captures — `?bare=1` skips `installDebug` entirely and `uDebugMode` defaults to 0 (`debug.ts:16`, `layerMaterial.ts:113`).

## Surfaces

| Surface | Role |
|---|---|
| `src/layers/LayerMesh.ts` | writes — creates the material, sets rig uniforms and per-frame bend/rot |
| `src/dev/debug.ts` | writes — `uDebugMode` (alpha view, weight heatmap) |
| `src/config/layers.ts` | none — upstream only: this file imports `IMG_ASPECT` from it (`layerMaterial.ts:28`); `layers.ts` imports nothing and never touches the material |

## See

- Source: `versions/v2-reference-driven/src/shaders/layerMaterial.ts`
- Inspect it: `npm run dev:v2`, keys `7` (alpha) and `8` (weights)
