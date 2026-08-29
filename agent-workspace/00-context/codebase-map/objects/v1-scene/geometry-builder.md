---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/flowers/GeomBuilder.ts
---

# Geometry builder

`GeomBuilder` — the vertex accumulator every V1 species is built through, and
the write side of the vertex-attribute contract the vegetation shader reads.

## Why this shape

V1 bends thousands of plants in one draw call, so the GPU has to be told, per
vertex and at build time, everything the CPU will not recompute: how far up the
plant this vertex sits, whether it belongs to the rigid head, how much it
flutters and what phase de-synchronises it. That payload is `aData`. Get it
wrong and nothing errors — the plant simply moves wrong: petals shear off the
head, a bloom detaches from its stalk, a root slides. This class exists so that
contract has exactly one writer.

## Shape

- `aData = (s along stem 0..1, isHead, flutter weight, phase)`, plus `aColor`
  (albedo) and `aTexFlag` (1 = sample the species petal atlas, uv meaningful).
- Reader: `isHead > 0.5` rotates the vertex rigidly about `uHeadPivotY` and
  ignores `s`; otherwise `s` drives the bend envelope. `flutter` and `phase`
  drive micro-shimmer — and `flutter` is *overloaded*, also flattening blossom
  shading and exempting blossoms from soil occlusion in the fragment stage.
- `s` is whole-plant normalized height, not local: `section()` transforms
  positions and normals only, never `aData`. A builder that lifts geometry with
  a matrix must still compute `s` in plant space itself.
- `section()` **clones** the matrix before running the callback, so nested
  builders may reuse a scratch matrix (`GeomBuilder.ts:129-130`).
- `grid()` fills normals by finite difference only where the callback left them
  at zero (`:109`); `finishGridNormals` exposes that for hand-pushed grids, and
  assumes the exact `base + iu*(nv+1) + iv` vertex order.

Citations: `versions/v1-procedural/src/scene/flowers/GeomBuilder.ts:31-39`,
`versions/v1-procedural/src/scene/flowers/GeomBuilder.ts:94-141`,
`versions/v1-procedural/src/scene/flowers/GeomBuilder.ts:143-154`,
`versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts:120-163`,
`versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts:241-243`,
`versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts:279-281`

## The scratch-matrix bug class

`species.ts` shares one module-level `Matrix4` (`species.ts:20`) and nests
sections three deep: `headSection` sets it (`:495`), `buildForegroundMass`
overwrites it with a stretch (`:1139`), and `addTexturedPetals` overwrites it
again per petal (`:310`) — all inside the outer sections. This only works
because `section()` copies. Drop the clone and the outer transforms are
silently replaced by the innermost one: heads detach from stems, foreground
masses lose their elongation, and no test fails — the geometry is still finite,
indexed and deterministic, just wrong.

## Connected to

- **owns:** `position`/`normal`/`uv`/`aColor`/`aData`/`aTexFlag` on every V1 plant geometry
- **owned-by:** `species.ts` — the only caller
- **joins:** `vegetationMaterial` (the reader), `petalTextures` (uv cells for `aTexFlag=1`)
- **looks-like-but-is-not:** not a mesh helper. It is a GPU contract with a
  fluent API; `build()` is the only place attribute names are decided.

## If you change this

- **Hits:** the shader, immediately — rename or reorder `aData` channels and
  every `VertexData` literal in `species.ts` plus the `attribute vec4 aData`
  declaration must move together. A new channel needs both a `setAttribute` in
  `build()` and a declaration in the vertex program. The unit gate asserts
  `s ∈ [0,1]` and `head ∈ {0,1}` on every builder, and that root vertices carry
  `s < 0.05` (`tests/unit/species.test.ts:68-88`).
- **Does not hit:** `PlantSim`. `aData` is per-vertex; the sim is per-plant and
  knows nothing below the root. It also does not hit DOF or the grade (both
  post-projection), and it does not hit V2 — V2 has no per-vertex payload at
  all: a `LayerMesh` is a stock `PlaneGeometry` with only three.js's built-in
  `position`/`uv`, and the whole deformation rides on CPU-set uniforms
  (`uRoot`/`uHead`/`uHeadR`/`uBend`/`uRot`), so there is no attribute contract
  on that side to break (`versions/v2-reference-driven/src/layers/LayerMesh.ts:23`,
  `versions/v2-reference-driven/src/shaders/layerMaterial.ts:33-37`). Winding
  changes do not make faces vanish either: the material is `DoubleSide`; they
  swap which face gets the dark
  petal-underside treatment.

## Surfaces

| Surface | Role |
|---|---|
| `species.ts` builders | write — every vertex in V1 |
| `vegetationMaterial` (VERT/FRAG) | reads `aData`, `aColor`, `aTexFlag`, `uv` |
| `tests/unit/species.test.ts` | reads — attribute sanity + determinism gate |

## See

- Source: `versions/v1-procedural/src/scene/flowers/GeomBuilder.ts`
- Neighbours: `v1-scene/species-builders.md`, `v1-scene/vegetation-material.md`
