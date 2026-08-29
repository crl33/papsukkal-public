---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/flowers/petalTextures.ts
---

# Petal atlas

V1's flower artwork: one seeded, deterministically painted 1024² canvas per species — 4 petal variants plus a centre disc — built at startup by `getPetalAtlas`.

## Why this shape

V1's premise is that no pixel is imported, so the botanical detail had to be *painted in code* rather than shipped as PNGs; the atlas is original artwork whose source is the paint routine, and it stays byte-reproducible because every stroke draws from a seeded PRNG keyed to a species string. The second decision is where the petal's outline lives: the mesh is a plain curved card, and the **painted alpha** carries the ragged, lobed, serrated silhouette, which the vegetation shader cuts out by discard. That buys real petal edges at any zoom for a fraction of the vertices a mesh outline would need — and it is why silhouette work is a *paint* change, not a geometry change. `PETAL_CELLS`/`CENTER_CELL` are extracted as bare numbers precisely so the geometry builders (and the node-environment unit tests, which have no DOM) can compute UVs without ever touching a canvas.

## Shape

- Seven species keys: `cosmosMagenta`, `cosmosViolet`, `daisyWhite`, `daisyOrange`, `daisyYellow`, `maroonRuffle`, `softNeutral` (near-white artwork, tinted per instance at runtime).
- 1024² atlas; four 256×512 petal cells across the top (base at cell bottom, tip up), a 256² centre disc bottom-left.
- Per species: a 5-stop base→tip `ramp`, vein colour/alpha/count, `maxHalf`/`baseHalf` width profile, a `tip` character (`teeth`/`round`/`broad`/`ruffle`/`oval`), edge rim, and a centre painter.
- Module-level `Map` cache keyed by species — one texture shared by every mesh of that species.
- The shader's cutout threshold is `alpha < 0.45` → `discard`.

Citations: `versions/v1-procedural/src/scene/flowers/petalTextures.ts:14-18`, `:23-30`, `:46-51`, `:54`, `:156-263`, `:250`, `:286-318`, `:324-331`, `:416-444`, `versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts:216-220`, `versions/v1-procedural/src/scene/MeadowScene.ts:128`, `versions/v1-procedural/src/scene/MeadowScene.ts:370`

## Connected to

- **owns:** the painted albedo + alpha silhouette of every textured petal and flower centre in V1.
- **owned-by:** `MeadowScene`, by two independent paths. Per placement: `atlasFor` maps a `Placement` to a species key and the texture goes into that plant's own material (`MeadowScene.ts:71-86`, `:128`). Directly: `addMidFlowers` asks for `getPetalAtlas("softNeutral").texture` and hands it to one `InstancedPlants` system — ~75 × `vegetationDensity` mid-field blooms in a single draw call, one shared neutral atlas coloured by per-instance tint (`MeadowScene.ts:326-372`). `softNeutral` is therefore the one key with two callers; the other six arrive only through `atlasFor`.
- **joins:** species builders read `PETAL_CELLS` to assign per-petal UVs and `CENTER_CELL` for the dome (`species.ts:306`, `:377`); the vegetation shader performs the cutout and the underside darkening under `USE_PETAL_MAP`.
- **looks-like-but-is-not:** not V2's photograph. V2 imports nothing from here — its petals *are* reference pixels, not painted ones.

## If you change this

- **Hits:** a `ramp`, `vein` or centre painter edit repaints that species **everywhere** in the frame at once — the cache hands one texture to every mesh with that key, so `cosmosMagenta` moves every magenta cosmos including the hero — though in the current composition that is exactly **one** mesh, `cosmos-hero` (`composition.ts:51`): the only other cosmos, `cosmos-2` (`composition.ts:61`), carries `tint: palette.violet` and so `atlasFor` (`MeadowScene.ts:74`) routes it to `cosmosViolet`. Editing the ramp is therefore a hero-only change today, and there is no per-instance override to reach for: the `iTint` path (`vegetationMaterial.ts:100-108`) applies only to instanced meshes, and the hero is a plain `Mesh`. Repainting `softNeutral` is the widest single edit: it is both the foreground `softBokeh` atlas and the mid-field instanced band, so it moves near-lens masses and the whole 2.35–4 m field at once. Changing `maxHalf`/`baseHalf`/`tip` changes the *visible* petal outline (it is alpha), and pushing coverage near the `0.45` cutoff makes edges crumble or harden. Changing `SIZE`, `CELL_W`/`CELL_H` or the cell layout desynchronises `PETAL_CELLS`/`CENTER_CELL`, which silently mis-maps every petal UV in `species.ts`. Adding a species key forces a matching arm in `atlasFor`, or the flower renders untextured.
- **Does not hit:** **geometry**. A narrower painted silhouette does not make the petal card smaller — the card's grid, curl, arch, cup and length live in `species.ts`, and the vertex count, wind flutter attributes and structural AO are unchanged. The species determinism gate in `tests/unit/species.test.ts` therefore does not move when you repaint. It also does not touch the bokeh sprites or the background flower field: `atlasFor` returns `null` for `poppyBokeh` and background `softBokeh`, which paint themselves elsewhere. Do not read that as "nothing distant is textured" — the instanced mid-field band from `addMidFlowers` sits in front of it and *is* on the atlas.

## Surfaces

| Surface | Role |
|---|---|
| `MeadowScene` (per placement) | reads — `atlasFor` resolves species → atlas, passes `texture` as the material `map` |
| `MeadowScene.addMidFlowers` | reads — takes `softNeutral` straight from `getPetalAtlas`, one atlas for the whole instanced mid-field |
| `species.ts` builders | read — `PETAL_CELLS` / `CENTER_CELL` UV constants only, DOM-free |
| `vegetationMaterial` | reads — samples `uMap`, discards below alpha `0.45` |
| `tests/unit/species.test.ts` | reads — runs the builders headless (vitest, node env) |

## See

- Source: `versions/v1-procedural/src/scene/flowers/petalTextures.ts`
- Consumers: `versions/v1-procedural/src/scene/flowers/species.ts`, `versions/v1-procedural/src/scene/MeadowScene.ts`
- Cutout: `versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts`
