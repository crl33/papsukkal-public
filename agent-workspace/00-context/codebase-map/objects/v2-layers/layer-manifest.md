---
type: object
cluster: v2-layers
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v2-reference-driven/src/config/layers.ts
---

# Layer manifest

V2's composition file — the exported `layers: LayerDef[]` that says which rectangles of the reference photograph move, in what order they stack, and how the copied V1 wind reaches each one.

## Why this shape

Nothing here generates appearance; the photograph's own pixels are authoritative and are cut offline by `tools/prepare-assets.mjs` (`layers.ts:11`). So the manifest carries only two things code cannot infer from an image: *which* pixels are a moving unit, and *how much* simulated motion that unit is allowed to express. The split into `LayerDef` (geometry + stacking) and `LayerRig` (the animation skeleton) exists because static layers — the plate, the background patches — need the first half and must never touch the second. `windPos` is the load-bearing oddity: it is a **V1 world coordinate**, not an image coordinate, so the copied wind field's gust fronts sweep V2's flowers with the same left-to-right spatial timing V1's meadow had (`layers.ts:58-60`). The far background is deliberately unrigged — its blur hides nothing, so motion there risks more than it adds (`layers.ts:54-56`).

## Shape

- `LayerDef`: `id`, `file`, optional `bgFile` (the true pixels between the petals, drawn beneath the cutout and never moved), `rect` `[x,y,w,h]` normalized, `order` (`layers.ts:37-49`).
- `LayerRig`: `root` (zero motion, ever) · `head` · `headRadius` (normalized by image **width**) · `mechanics` (key into the copied `MECHANICS` table) · `windPos` `[x, z, height]` in V1 world metres · `bendScale` (image units per metre) · `rotGain` (`layers.ts:20-35`).
- 14 entries: `plate` at order 0, plus **13 rigged moving units** — five principals, five broadened accents, three near-field blur masses (`layers.ts:62-278`). Nine carry a `bgFile`; `bud-pair` and the three `fg-*` masses do not, because their tight mask equals their silhouette (`masks.mjs:21-22`).
- `bendScale` sits near a third of physical amplitude on purpose — full mapping would be ≈1.48 img/m, the hero uses 0.5 (`layers.ts:113-115`).
- Painter's order is back→front and sparse (0, 7–16, 20–22); background patches are injected at `order - 0.5` so a patch always lands between the layer behind it and its own moving cutout without disturbing the integer scale (`App.ts:66-74`, sorted `App.ts:127`). Depth testing is off, so this ordering is the only thing deciding occlusion (`layerMaterial.ts:108`).
- `WIND_SEED = 1337`, matching V1's default personality (`layers.ts:281`).

Citations: `versions/v2-reference-driven/src/config/layers.ts:11`, `:20-35`, `:37-49`, `:54-60`, `:62-278`, `:113-115`, `:281`, `versions/v2-reference-driven/src/app/App.ts:66-74`, `:94-96`, `:127`, `versions/v2-reference-driven/tools/masks.mjs:21-22`

## Connected to

- **owns:** the `rect`/`order`/rig values every `LayerMesh` is constructed from (`LayerMesh.ts:17-33`); the `-bg` synthetic defs App derives from `bgFile`.
- **owned-by:** nothing — this is a hand-authored leaf. It is mirrored by, not derived from, `tools/masks.mjs`.
- **joins:** `wind/plant-oscillator.md` (via `mechanics` + `windPos` → `sim.addPlant`, `App.ts:94-96`), `v2-layers/mask-specs.md` (rect parity), `pipeline/asset-build.md` (produces every `file`/`bgFile`).
- **looks-like-but-is-not:** V1's `composition.md`. Both are hand-tuned placement tables, but V1's placements *create* plants; these only annotate photographed ones. And `windPos` looks like a shared reference into V1 — it is a copied number, nothing more.

## If you change this

- **Hits:** any `rect` edit must be mirrored byte-for-byte in `tools/masks.mjs` `riggedLayers` or the parity test fails (`wind.test.ts:75-82`), and the assets must be rebuilt — the crop is baked into the PNG. Adding a rigged layer requires a mask spec (`plate.test.ts:102-106`) and generated files, or App logs a load failure and renders without it (`App.ts:101-106`). **`order` is not only stacking**: it is fed into the plant seed as `7000 + def.order` (`App.ts:96`), which selects the ±12% mechanics variation (`PlantSim.ts:100-101`) — restacking a layer silently changes how it moves. Orders must stay unique (`wind.test.ts:68-71`) and must not collide with another layer's `-0.5` patch slot. `root`/`head` must stay inside `rect` (`wind.test.ts:57-63`). Changing `windPos` re-times that flower against every other one.
- **Does not hit:** the photograph. No value here produces a pixel — `bendScale`, `rotGain`, `windPos`, `headRadius` are motion-only, so they cannot regress the zero-motion fidelity gate (at wind=0 the sim outputs exactly zero; V1's random rest curvature was deliberately dropped, `PlantSim.ts:124-128`). Nor does it hit framing: cover-fit uses `IMG_ASPECT` alone, never the rects (`App.ts:150-167`). And it cannot hit V1 — `windPos` values are transcribed coordinates, not a live link into V1's meadow.

## Surfaces

| Surface | Role |
|---|---|
| `src/app/App.ts` | reads — builds meshes, registers plants, injects `-bg` defs |
| `src/layers/LayerMesh.ts` | reads — `rect`, `order`, rig → uniforms |
| `src/shaders/layerMaterial.ts` | reads — `IMG_ASPECT` only |
| `tests/unit/wind.test.ts`, `tests/unit/plate.test.ts` | reads — rect bounds, rig validity, unique ids/orders, mask parity |

## See

- Source: `versions/v2-reference-driven/src/config/layers.ts`
- Mirror: `versions/v2-reference-driven/tools/masks.mjs`
