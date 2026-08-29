---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/flowers/species.ts
---

# Species builders

`species.ts` — the deterministic, seed-in / geometry-out functions that give
every V1 plant its botanical shape ("the flowers" in conversation).

## Why this shape

Two decisions carry the file. First, a petal is a **curved card**, not a modelled
blade: the geometry is a small `nu×nv` grid and the actual silhouette — ragged
tips, lobes, veins — comes from the painted atlas alpha, which stays sharp at
any zoom for a handful of vertices. Second, hero heads are **cups, not discs**.
The composition pitches heads 24–74° off frontal, and a flat radial rosette
seen obliquely reads as a mathematical asterisk. So petals *rise* out of the
receptacle plane and flare on their outer half, which makes the far petals stand
up around the bowl while the near ones foreshorten into a rim. The per-petal
jitter (length, roll, curl, atlas cell, mirroring, luminance) is there for one
reason: 15 identical petals read as a stamped pattern.

## Shape

- Live builders: `buildCosmos:503`, `buildDaisy:596`, `buildBud:629`,
  `buildMaroonBloom:658`, `buildMicroSprig:692`, `buildMidFlowerHead:844`,
  `buildWiryStem:879`, `buildFeatherClump:1026`, `buildFoliageTuft:1074`,
  `buildForegroundMass:1112`. Shared parts: `addStem:32`, `addTexturedPetals:276`,
  `addTexturedCenter:359`, `addBlob:440`, `addLeaf:464`, `headSection:492`.
- Cup morphology, all in `addTexturedPetals`: `elevation` lifts the petal out of
  the plane and shortens its radial reach by `cos(elev + flare·u)`; `flare` adds
  rise over the outer half; `aoBase` is structural throat darkening ramping to 1
  at the tip; `elevJitter` keeps the whorl uneven (`:291-332`).
- Cosmos is two whorls: outer rim `elevation 0.34 / flare 0.46 / aoBase 0.46`,
  inner standing petals `0.62 / 0.30 / 0.38`, receptacle sitting low in the cup
  (`:526-567`). `buildForegroundMass` wraps the same call in a 1.35–1.85× X
  stretch so a near-lens head projects as an elongated smear (`:1134-1140`).
- Card width is `width / 0.88` because the painted petal spans ~88% of its atlas
  cell (`:283-284`); every such vertex carries `tex: 1`. Convention: root at
  origin, stem +Y, head pivot at the returned `headPivotY`.

Citations: `versions/v1-procedural/src/scene/flowers/species.ts:276-353`,
`versions/v1-procedural/src/scene/flowers/species.ts:503-594`,
`versions/v1-procedural/src/scene/flowers/species.ts:1112-1166`,
`versions/v1-procedural/src/scene/flowers/petalTextures.ts:14-15`,
`versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts:216-219`

## Retired, still exported

`addPetalRing:106`, `addIrregularPetals:177`, `addNaturalCenter:387` and
`addCenterDome:420` have **zero call sites** in the tree — verified by grep over
`*.ts`; the only surviving mentions are their own definitions. They were the
pre-atlas generation, where silhouette came from geometry. See
`repo/retired-petal-builders.md`.

## Connected to

- **owns:** the rest pose of every V1 plant — proportions, whorls, tangle shapes
- **owned-by:** `MeadowScene` (heroes, `buildPlacement`) and `InstancedPlants` (variants)
- **joins:** `GeomBuilder` (writes through it), `petalTextures` (`PETAL_CELLS`,
  `CENTER_CELL`), `palette`, `prng` (seeded determinism)
- **looks-like-but-is-not:** not the flower's *look*. Colour ramps, veins and the
  silhouette are painted in `petalTextures.ts`; this file only shapes and maps
  the card the artwork lands on.

## If you change this

- **Hits:** the atlas pairing. `addTexturedPetals` always emits atlas UVs and
  `tex: 1`, but the alpha discard only exists when the mesh's material got a
  texture — so adding textured petals to a species that `atlasFor` maps to
  `null` (`MeadowScene.ts:71-86`) yields visible rectangles. Changing a builder's
  `headPivotY` hits the material built for it (`MeadowScene.ts:126`). A new
  species means the `SpeciesId` union plus three switches, and only two of them
  tell you: `mechanicsFor` (`MeadowScene.ts:47-68`) and `buildPlacement`
  (`MeadowScene.ts:194-216`) have no `default`, so under `strict: true` the
  missing case is a compile error. `atlasFor` ends in `default: return null`
  (`MeadowScene.ts:83-84`) — a new species compiles clean and silently gets no
  atlas, which is exactly the rectangles failure above. Vertex counts scale with
  `heroDetail` through `nu` (`:536`), and the unit gate re-runs every builder for
  determinism and finiteness.
- **Does not hit:** motion. `elevation`, `flare`, `aoBase`, `arch`, `curl` are
  rest-pose geometry and albedo only; bend comes from `PlantSim` through `aData`
  — the one exception is the `flutter` argument, which is a motion weight. It
  also does not hit the petal artwork (repaint that in `petalTextures.ts`), and
  it does not hit V2, which grows no geometry from seeds.

## Surfaces

| Surface | Role |
|---|---|
| `MeadowScene.buildPlacement` | reads — hero and foreground geometry |
| `MeadowScene` filler layers | reads — one build per instanced variant |
| `tests/unit/species.test.ts` | reads — 16 builder configs, determinism + sanity |

## See

- Source: `versions/v1-procedural/src/scene/flowers/species.ts`
- Neighbours: `v1-scene/geometry-builder.md`, `v1-scene/petal-atlas.md`,
  `repo/retired-petal-builders.md`
