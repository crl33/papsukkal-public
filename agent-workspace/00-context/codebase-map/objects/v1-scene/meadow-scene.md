---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/MeadowScene.ts
---

# Meadow scene

`MeadowScene` — the assembler that turns the art-directed `Placement` list plus
the density map into the three render paths V1's frame is made of.

## Why this shape

One frame contains ~700 plants that all have to answer the same breeze, but
they do not all deserve the same cost. A hero is looked at directly: it needs
its own pose, its own painted atlas and its own oscillator, so it gets a mesh
and a material of its own. Filler vegetation is thousands of near-identical
plants that must still move *individually* — hence one geometry per variant,
per-instance bend attributes. The far field is defocused past the point where
geometry is legible, so it degrades to camera-facing sprites. The split is a
cost decision, not a taxonomy: everything, sprite included, registers in the
same `PlantSim` so one wind field drives the whole frame.

Placement is authored in normalized *reference-photo* coordinates and projected
back through the locked camera (`placeFromScreen`). That is why the density
sampler works in screen space: the reference tells you where vegetation looks
dense, not where it stands in metres.

## Shape

- Three paths: background bokeh → `SpriteSpec` (`MeadowScene.ts:108`); everything
  else → geometry mesh + own `ShaderMaterial` (`:120-137`); filler → `InstancedPlants`.
- `sampleZone()` picks a zone weighted by `w·rx·ry` (area × weight), then a
  clamped gaussian at 0.75 of the zone radii (`:151-166`).
- Five instanced layers: wiry stems (7 variants × 23, the connective tangle),
  feather filigree (2 × 40, sharp teal threads in the focus band), mid flowers
  (75, soft colour at 2.35–4 m — trust `:347`, not the stale docstring at `:326`
  that still says 1.8–3.8 m; keep-clear discs), foliage tufts
  (100, dark floor leaf near focus), back foliage (150, scaled 2–4.6× and
  tinted 10–17× — this mass *is* the midground's luminosity).
- `syncToGpu` (`:397-408`): heroes get `uBend`/`uGust`/`uTime` uniforms; instanced
  systems copy their own bends; sprites get bends only — no time, no gust, so
  sprites never flutter.
- ~692 plants registered at the high tier against `PlantSim`'s 2048 capacity
  (`App.ts:70`); `addPlant` throws when that is exceeded (`PlantSim.ts:91`).

Citations: `versions/v1-procedural/src/scene/MeadowScene.ts:103-148`,
`versions/v1-procedural/src/scene/MeadowScene.ts:151-166`,
`versions/v1-procedural/src/scene/MeadowScene.ts:229-324`,
`versions/v1-procedural/src/scene/MeadowScene.ts:326-347`,
`versions/v1-procedural/src/scene/MeadowScene.ts:397-408`,
`versions/v1-procedural/src/scene/vegetation/InstancedPlants.ts:74`,
`versions/v1-procedural/src/app/App.ts:70-71`

## Connected to

- **owns:** the hero mesh list, the `InstancedPlants` systems, the `BokehSprites` sheet
- **owned-by:** `App` — constructs it and calls `syncToGpu` each frame (`App.ts:71`)
- **joins:** `composition` (placements, zones, bgField), `cameraConfig`
  (`placeFromScreen`/`frameWidthAt`), `species` builders, `PlantSim`, `petalTextures`
- **looks-like-but-is-not:** not the wind. It registers roots and copies sim
  output; the motion is `WindField` + `PlantSim`.

## If you change this

- **Hits:** plant budget — every new instanced layer or raised count is
  `sim.addPlant` calls, and 2048 is a throw, not a clamp. `mechanicsFor` and
  `atlasFor` are the only place a species is bound to its motion profile and its
  painted atlas: a species whose builder emits `tex:1` vertices but gets `null`
  from `atlasFor` renders as opaque rectangles, because the petal silhouette is
  the atlas alpha discard. `spriteSpecs` and `spriteSimIndices` are positionally
  parallel and `addBgField` appends to both after the placement loop — push to
  one without the other and every sprite bends with the wrong plant.
- **Does not hit:** the framing and the focus plane. Camera lock and
  `CinematicDofPass` live in `App`/the post chain; adding vegetation does not
  move focus, it only puts more geometry behind it. Nor does it touch V2, which
  has no scene graph of plants at all.

## Surfaces

| Surface | Role |
|---|---|
| `App` | constructs, then `syncToGpu(time)` per frame |
| `PlantSim` | written (root registration), then read (bend output) |
| `composition` | read — placements, tangle/feather zones, bgField |

## See

- Source: `versions/v1-procedural/src/scene/MeadowScene.ts`
- Neighbours: `v1-scene/composition.md`, `v1-scene/locked-camera.md`, `wind/plant-oscillator.md`
