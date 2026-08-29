---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/config/composition.ts
---

# Composition

The art direction as data — a table of `Placement` records transcribed from the
reference photograph, plus the density zones that scatter everything else.

## Why this shape

The frame has to be reproducible, not merely plausible: the same flowers in the
same places on every reload, on every machine. So the art-directed subjects are a
hand-authored table and everything else is seeded noise — two populations, one
frozen, one re-rollable. Positions are in reference-photo screen space (`nx`, `ny`,
y down), not metres, because that is the space the photo was measured in
(`versions/v1-procedural/docs/visual-reference.md:13`) and the space the locked camera inverts back to
world. `sizeFrac` is a fraction of frame width for the same reason: a head keeps
its apparent size when pushed to a different depth, no manual re-scaling.

## Shape

- `Placement`: `id`, `species`, `screen: [nx, ny]`, `depth` (m), `sizeFrac`
  (head diameter ÷ frame width at that depth), `focusRole`, optional `tint`,
  optional `facing: [pitch, yaw, roll]` (default `[14,0,0]`), `seed`.
- Five arrays concatenated into `allPlacements` — `heroes`, `redClusters`,
  `blueSprigs`, `foreground`, `background`. `MeadowScene` imports only the
  concatenation; the sub-arrays are editorial grouping.
- `focusRole` is load-bearing, not a label: it picks wind mechanics for bokeh
  masses, selects the petal atlas, sets hero-only geometry detail, and routes
  background bokeh to sprite impostors instead of real geometry.
- `tint` doubles as a variant selector — `palette.violet` switches a cosmos to the
  violet atlas, `palette.yellow` an orange daisy to yellow. It changes artwork,
  not just colour.
- Scatter: `SCATTER_SEED = 0xa11ce`, `tangleZones` (8 weighted ellipses),
  `featherZones` (4), `bgField` (8 clusters carrying depth/size/colour/kind ranges).
  `MeadowScene` derives five independent streams by XOR (`^0x77ee` bg field,
  `^0x3c3c` back foliage, `^0x55aa` mid flowers, `^0x1234` tufts, plain for stems).
- **Hero screen placements are frozen.** Orientation is not: commit 0b26008 was a
  full art-direction pass that pitched heads oblique (e.g. cosmos-hero
  `[72,-16,10] → [30,-22,9]`) and retuned foreground `sizeFrac`/`tint` — and did
  not move a single `screen` pair. It re-aimed by *eye*, not by `focusRole`:
  five `facing` values changed — heroes cosmos-hero, cosmos-2, orange-ur, and
  supports orange-lr and bloom-maroon — while hero daisy-center kept `[74,6,0]`
  (`:78`) and hero red-c1 still carries no `facing` at all (`:177`), so it renders
  at the `[14,0,0]` default.

Citations: `versions/v1-procedural/src/config/composition.ts:7`, `versions/v1-procedural/src/config/composition.ts:25`, `versions/v1-procedural/src/config/composition.ts:49`, `versions/v1-procedural/src/config/composition.ts:78`, `versions/v1-procedural/src/config/composition.ts:177`, `versions/v1-procedural/src/config/composition.ts:263`, `versions/v1-procedural/src/config/composition.ts:271`, `versions/v1-procedural/src/config/composition.ts:289`, `versions/v1-procedural/src/config/composition.ts:322`, `versions/v1-procedural/src/scene/MeadowScene.ts:64`, `versions/v1-procedural/src/scene/MeadowScene.ts:82`, `versions/v1-procedural/src/scene/MeadowScene.ts:83`, `versions/v1-procedural/src/scene/MeadowScene.ts:108`, `versions/v1-procedural/src/scene/MeadowScene.ts:192`, `versions/v1-procedural/src/scene/MeadowScene.ts:337`

## Connected to

- **owns:** what the frame contains and where — identity, depth, size, tilt and
  shape seed of every non-random plant.
- **owned-by:** the locked camera (`placeFromScreen`), without which these numbers
  mean nothing; and `versions/v1-procedural/docs/visual-reference.md:35-74`, the decomposition they transcribe.
- **joins:** `MeadowScene` (sole consumer, `:103`); species builders (`:191`);
  `PlantSim` mechanics (`:47`); `palette.ts` for named tints.
- **looks-like-but-is-not:** V2's `LayerRig` table. Same job, different currency —
  rects of *photo pixels* (1242×822) with per-layer wind mapping, not world
  placements. It hand-copies V1 world coordinates into `windPos`
  (`versions/v2-reference-driven/src/config/layers.ts:58`) and imports nothing.

## If you change this

- **Hits:** move a subject and the mid-flower keep-clear discs stay behind — five
  screen coordinates are duplicated as literals in `MeadowScene.ts:337-343`, so
  background blooms will grow through the face of whatever moved. The two lists
  already disagree: four discs track heroes, the fifth `[0.42,0.20]` is *support*
  bloom-maroon (composition `:143-149`), and hero red-c1 at `[0.34,0.50]`
  (composition `:177`) has no disc at all — nothing keeps the mid field off it.
  Reusing a `seed` silently produces twin plants; the unit gate catches it
  (`tests/unit/composition.test.ts:11`), as it does out-of-range `screen`, `depth`
  or `sizeFrac > 0.3`. Adding a `SpeciesId` breaks the two exhaustive switches
  loudly (`mechanicsFor`, `buildPlacement`) and `atlasFor` silently — it has a
  `default: return null`, so the new species renders untextured. Changing
  `SCATTER_SEED` re-rolls all five filler streams at once and none of the
  art-directed placements.
- **Does not hit:** the lens or the breeze. Editing `screen`, `sizeFrac`, `facing` or
  `tint` cannot change what is in focus — blur is a pure function of `depth` through
  the DOF's depth buffer, and `depth` is the only field the lens reads. Wind
  mechanics are chosen by `species`/`focusRole`, never by position, so sliding a
  flower changes where it samples the field, not how it answers. Nor does lowering
  the quality tier drop art-directed placements: `vegetationDensity` scales only
  scatter counts; `allPlacements` is always built in full.

## Surfaces

| Surface | Role |
|---|---|
| `MeadowScene` constructor | reads `allPlacements` — builds every mesh/sprite/sim entry |
| `MeadowScene` scatter passes | read `SCATTER_SEED`, `tangleZones`, `featherZones`, `bgField` |
| `tests/unit/composition.test.ts` | asserts unique ids/seeds and valid ranges |
| `versions/v1-procedural/scripts/measure.mjs`, `silhouette.mjs` | compare rendered regions to the reference in this same screen space |

## See

- Source: `versions/v1-procedural/src/config/composition.ts`
- Consumer: `versions/v1-procedural/src/scene/MeadowScene.ts:88-287`
- Provenance: `versions/v1-procedural/docs/visual-reference.md:35`
