---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts
---

# Vegetation material

The one shader family that moves and lights every plant in V1 — `createVegetationMaterial`, a single `ShaderMaterial` whose two `defines` (`INSTANCED_BEND`, `USE_PETAL_MAP`) cover heroes, instanced filler, and painted-atlas petals alike.

## Why this shape

A meadow is thousands of plants that must all agree on how wind reads. If each species carried its own shader, the bend would drift between them and the frame would stop looking like one photograph of one gust. So the deformation lives in exactly one vertex shader and the *only* per-plant inputs are four bend numbers plus a gust scalar — supplied as uniforms on per-mesh placements, as instanced attributes for filler. The choice that makes this survive is the **root-fixed envelope plus per-vertex length renormalisation**: displacement is scaled by `bendEnvelope(s)` so it vanishes at the root, then the displaced offset is renormalised back to its original length so the stem *arcs* rather than stretches (`vegetationMaterial.ts:148`). Without the renormalisation a strong gust visibly grows the plant and its root slides out of the soil — the one artefact that instantly breaks a photographic read. Flower heads get the opposite treatment: they are rigid bodies, oriented from two samples of the already-bent spine (`:132`), because a petal disc that shears with the envelope looks like melting plastic.

## Shape

- Vertex attribute contract, authored by `GeomBuilder`: `aData = (s along stem 0..1, isHead, flutterWeight, phase)`, `aColor`, `aTexFlag` (`vegetationMaterial.ts:19`, `flowers/GeomBuilder.ts:9`).
- Per-frame inputs: `uBend`/`uGust` (per-mesh path) or `iBend`/`iGust`/`iTint` (instanced path); `uTime` for flutter only.
- Bend envelope `s*s*(0.4 + 0.6*s)` — monotonic, zero at the root (`:64`). The Crysis `q*q - q` form above it is **live but unreturned** code, not a comment (`:61`–`:62`): it compiles, computes `f`, and nothing uses it, because it is not root-fixed. Do not go looking for a `//` block.
- Head frame: pivot at `uHeadPivotY`, orientation `rotFromTo(oldUp, newUp)` from spine samples at s=1.0 and s=0.9, then secondary nod `rotAxis` by `bend.z`/`bend.w` (`:126`–`:147`).
- Micro flutter: three `stw` triangle waves at 1.975 / 0.793 / 2.633 Hz — incommensurate so the loop never repeats — phased by root position and `aData.w`, scaled by `uMicroAmp` (default 0.0045) and gust (`:159`–`:163`).
- Atlas path is gated per-vertex by `aTexFlag`, with a hard alpha cutout at 0.45 and `DoubleSide` (`:219`, `:323`).
- Shading stack, all in one fragment pass: wrap diffuse (wrap 0.65) + hemisphere, underside albedo multiply on back faces, thickness transmission, wide specular (exponent 14), then world-Y soil occlusion `smoothstep(0.14, 0.6, y)` that is itself faded out by camera distance (`:280`–`:285`), then a haze mix toward `uAtmCol` whose range differs for heads vs stems (`:292`–`:295`).

Citations: `versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts:19`, `:64`, `:126`, `:132`, `:148`, `:152`, `:159`, `:219`, `:232`, `:255`, `:280`, `:285`, `:292`, `:319`, `versions/v1-procedural/src/scene/flowers/GeomBuilder.ts:9`, `versions/v1-procedural/src/scene/flowers/GeomBuilder.ts:150`

## Connected to

- **owns:** the vertex-deformation contract every plant obeys; the petal fragment model (underside, transmission, specular); the per-plant haze and soil occlusion.
- **owned-by:** `MeadowScene` builds a material per *geometry* placement — hero, support and background alike, everything that is not a softBokeh/poppyBokeh impostor — and pushes `uBend`/`uGust`/`uTime` for each one every frame (`MeadowScene.ts:103`, `:125`, `:399`). The array it stores them in is called `heroes`; that is a misnomer, not the map's pinned `focusRole: "hero"`. `InstancedPlants` builds one shared instanced material and writes the attribute buffers (`InstancedPlants.ts:52`, `:79`).
- **joins:** `PlantSim.output` (the four bend numbers) and `PlantSim.gustOut` — this shader is their only consumer for geometry plants; `GeomBuilder` for `aData`/`aColor`/`aTexFlag`; `getPetalAtlas` for `uMap`.
- **looks-like-but-is-not:** `BokehSprites` has its *own* shader with its own `iBend`/`iTint` attributes and its own `uAtmCol` (`vegetation/BokehSprites.ts:30`, `:102`) — the shader bodies share attribute *names* only. It does import one thing from here, though: the `srgb` helper (`versions/v1-procedural/src/scene/vegetation/BokehSprites.ts:18`), which this file also exports to `MeadowScene`, `environment` and `flowers/species` (`:36`). `srgb` is a colour-space utility that happens to live here, not part of the shader contract. V2's `deformation-shader` is a separate lineage entirely — it bends a photograph, not a stem.

## If you change this

- **Hits:** every geometry plant in V1 at once — every per-mesh placement (hero, support and background), instanced filler, atlas petals — because both consumers call the same factory. Changing `bendEnvelope` or the renormalisation changes how *hard* a given `PlantSim` output reads, so wind tuning done in `PlantSim`/`WindField` is silently re-scaled: the sim numbers stay identical and the picture changes. Changing the `aData`/`aTexFlag` semantics breaks `GeomBuilder.vertex` and every species builder that fills `VertexData`. Changing the alpha cutout threshold or `DoubleSide` changes petal silhouettes and therefore what the DOF pass sees as near-field coverage. Changing `uAtmCol` / the head-vs-stem haze ranges changes the depth read that `environment.ts` and `BokehSprites` were tuned *against*, so the background will no longer match.
- **Does not hit:** **the background bokeh field.** The obvious assumption is "one vegetation shader, so it moves everything" — but `focusRole: "background"` softBokeh/poppyBokeh placements are impostor sprites drawn by `BokehSprites`, which compiles none of this file's GLSL; they will keep their old look and their old bend response. The one exception is `srgb` (`:36`): it *is* imported by `BokehSprites`, `MeadowScene`, `environment` and `flowers/species`, so touching that function recolours the whole scene, bokeh included. Also **not** the DOF or the grade: blur and colour are post passes reading the composited frame, so darkening a petal underside here does not change any circle of confusion. And **not V2** — the version-separation rule forbids the import, and V2's plants are photograph layers.

## Surfaces

| Surface | Role |
|---|---|
| `MeadowScene.syncToGpu` | writes `uBend` / `uGust` / `uTime` per geometry placement, per frame (its `heroes` array holds all of them) |
| `InstancedPlants.sync` | writes `iBend` / `iGust` buffers + `uTime` for a whole instanced system |
| `GeomBuilder` | writes the `aData` / `aColor` / `aTexFlag` attributes this shader reads |
| `petalTextures.getPetalAtlas` | supplies `uMap` when a species has painted artwork |

## See

- Source: `versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts`
- Attribute producer: `versions/v1-procedural/src/scene/flowers/GeomBuilder.ts`
- Consumers: `versions/v1-procedural/src/scene/MeadowScene.ts`, `versions/v1-procedural/src/scene/vegetation/InstancedPlants.ts`
- Credits for the borrowed techniques: `versions/v1-procedural/docs/CREDITS.md`
