---
type: object
cluster: v2-layers
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v2-reference-driven/tools/masks.mjs
---

# Mask specs — silhouette, tight, patch

The hand-authored decomposition of the reference photograph: `riggedLayers`, one
entry per moving unit, each carrying **two** masks — the generous silhouette and
the tight flower-only cutout.

## Why this shape

One mask cannot answer two different questions. The plate needs a *generous*
hole (reconstruct everything the flower could ever uncover); the moving cutout
needs a *tight* one (move the flower, not the meadow behind it). Give the mover
the generous mask and the background inside the silhouette sways with the
flower — the world visibly drags along in the breeze. So the silhouette's job is
the plate hole plus the extent of a **static patch**, and `patch = silhouette −
dilated tight` is the true background between and around the petals, drawn just
under the mover and never moved (`masks.mjs:5`, `masks.mjs:15`). At rest, plate
+ patch + tight reassembles the photograph.

Colour keying alone could not produce the tight mask. A value gate (the obvious
"is it bright and saturated" test) throws away dark petals and the near-black
calyx, and *any* flower pixel left un-extracted stays in the plate — where it
becomes a ghost the moment the flower sways off it. So the chroma metrics are
un-gated (`masks.mjs:11`, `prepare-assets.mjs:78`) and everything chroma
structurally cannot see — stem corridor, disc centre, calyx — is drawn as
structural SVG inside `tight.svg` (`masks.mjs:12`).

## Shape

- Source frame `1242×822`; all values in source pixels (`masks.mjs:29`).
- `MOTION_MARGIN_PX = 18` — the plate reconstruction's overshoot; must exceed
  the runtime clamp `LayerMesh.MAX_BEND_IMG` (0.01 img ≈ 12.4 px) (`masks.mjs:34`,
  `LayerMesh.ts:44`).
- Per layer: `rect` (normalized crop), `svg` (silhouette), `tight {key,
  threshold, svg}`, `fadeOut {y0,y1}`, `feather`, `tightFeather`.
- Calibrated `tight.key` metrics — `magenta: max(R−G+0.45(B−G), 2.2(B−G))`,
  `orange: R−B+0.3(G−B)`, `white: value ≥ 150 and max−min ≤ 70` (`masks.mjs:23`,
  implemented at `prepare-assets.mjs:78`). White is the one keyed metric that
  *is* value-gated — it has to be, white is defined by luminance.
- Layers with no `tight` (`fg-*` blur masses, `bud-pair`) get `tight ===
  silhouette` and no patch: they carry no meaningful background
  (`masks.mjs:20`, `prepare-assets.mjs:147`).
- `qcRegions` — five cores the gate tests probe for ghosts and coverage
  (`masks.mjs:293`).

Citations: `versions/v2-reference-driven/tools/masks.mjs:5`, `versions/v2-reference-driven/tools/masks.mjs:15`, `versions/v2-reference-driven/tools/masks.mjs:23`, `versions/v2-reference-driven/tools/masks.mjs:34`, `versions/v2-reference-driven/tools/masks.mjs:293`, `versions/v2-reference-driven/tools/prepare-assets.mjs:78`, `versions/v2-reference-driven/src/layers/LayerMesh.ts:44`

## Connected to

- **owns:** the geometry and colour thresholds of every V2 cutout, patch and plate hole.
- **owned-by:** `processes/prepare-assets.md` — the only thing that executes these specs.
- **joins:** `v2-layers/layer-manifest.md` (`src/config/layers.ts`) — same layer
  ids, same `rect` values, kept in sync **by hand**; `pipeline/dev-gates.md`
  (`tests/unit/plate.test.ts:20` imports this file directly).
- **looks-like-but-is-not:** not a runtime module. Nothing under `src/` imports
  `masks.mjs`; the browser only ever sees the PNGs it produced.

## If you change this

- **Hits:** the committed assets under `public/reference/layers/` go stale until
  `npm run assets` is re-run. A changed `svg` also changes the silhouette union
  and therefore `plate.jpg` for *every* layer (`prepare-assets.mjs:309`). A
  changed `rect` must be mirrored into `src/config/layers.ts` — the two files
  hold the same numbers with no shared source, and the cutout PNG is cropped to
  the mask rect while the mesh is built from the manifest rect
  (`prepare-assets.mjs:186`, `layers.ts:105`). Dropping a `tight` block silently
  promotes the layer to a whole-silhouette mover with no `-bg` patch — the
  background drags. Threshold changes are policed by the coverage/ghost gates
  (`plate.test.ts:40`, `plate.test.ts:71`).
- **Does not hit:** the rig. Where a layer bends — `root`, `head`, `headRadius`,
  `bendScale` — lives in `src/config/layers.ts:20`, not here; a tighter mask
  changes which pixels move, never how far. Also does not touch the deformation
  shader, and never V1 (V2 owns its own copy of everything shared).

## Surfaces

| Surface | Role |
|---|---|
| `tools/prepare-assets.mjs` | reads — executes every spec |
| `tests/unit/plate.test.ts` | reads — `qcRegions`, `riggedLayers`, `MOTION_MARGIN_PX` |
| `src/config/layers.ts` | hand-kept mirror of ids and rects (no import) |

## See

- Source: `versions/v2-reference-driven/tools/masks.mjs`
- Process: `processes/prepare-assets.md`
