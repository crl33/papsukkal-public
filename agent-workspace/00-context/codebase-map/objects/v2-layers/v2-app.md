---
type: object
cluster: v2-layers
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v2-reference-driven/src/app/App.ts
---

# V2 app shell

`App` — V2's whole runtime: an orthographic camera in image space, the layer
textures, the copied breeze, and the frame loop. "The app" and `App` are the
same thing here.

## Why this shape

V2's contract is that appearance *is* the photograph — with `?wind=0` the
composite must be essentially the reference, to a mean absolute error under 3.5
of 255 (`fidelity.spec.ts:53`). Two decisions follow from that and nothing else.

**Image-space ortho.** The camera spans x 0→1, y 0→−1 (`App.ts:56`), so a
layer's manifest `rect` is literally its place on screen — no world units, no
projection to reason about. Framing then replicates CSS `object-fit: cover`
exactly (`App.ts:150`): a centred sub-rect at the image's native aspect, cropping
top/bottom on wide viewports and left/right on tall ones. The dev reference
overlay is a plain `<img>` with `object-fit:cover` (`debug.ts:20`); identical
math is what makes the overlay and the render align pixel-for-pixel, which is
what makes the difference view (key `6`) and the fidelity gate meaningful rather
than a comparison of two different crops. The e2e viewport is 1242×822 — the
image aspect — so cover-fit degenerates to the whole frame there.

**No colour management, deliberately.** Textures are tagged `NoColorSpace`
(`App.ts:89`). The layer fragment shader is a raw passthrough — it samples and
writes, no lighting maths (`layerMaterial.ts:85`). Tag a texture `SRGBColorSpace`
and three decodes it to linear on sample, but this shader never re-encodes on
the way out, so those darkened linear values would be shown as if they were
sRGB: double-dark. Undecoded in, unconverted out, and the photograph's bytes
reach the canvas intact.

## Shape

- `OrthographicCamera(0, 1, 0, -1, -10, 10)`, z = 1; `handleResize` writes
  left/right/top/bottom only (`App.ts:56`, `App.ts:162`).
- `NoToneMapping`; renderer `outputColorSpace = SRGBColorSpace`; pixel ratio
  capped at 2 (`App.ts:50`).
- Intensity resolution, in order: `?wind=<n>` wins; else `det` mode pins 1; else
  reduced-motion gives 0.12; else 1 (`App.ts:42`). The reduced-motion listener
  is installed only outside det mode and only when `wind` was absent
  (`App.ts:116`) — a deterministic capture must not depend on live media-query
  state.
- `?det=1&t=N` freezes the clock, renders one frame, and exposes
  `window.__advanceTo(t)`; resize re-renders instead of relying on the loop
  (`App.ts:40`, `App.ts:129`, `App.ts:113`).
- Each `bgFile` becomes a synthetic load def at `order − 0.5` — the static patch
  sits just beneath its mover (`App.ts:63`); meshes are then sorted by `order`
  (`App.ts:127`).
- Texture `onError` logs and calls `done()` so the remaining layers still
  assemble — a missing cutout must not produce a black screen (`App.ts:100`).
- `syncBends` feeds `output[o]`, `[o+1]` and the head-lag rotation `[o+3]` into
  each `LayerMesh` (`App.ts:178`).

Citations: `versions/v2-reference-driven/src/app/App.ts:56`, `versions/v2-reference-driven/src/app/App.ts:89`, `versions/v2-reference-driven/src/app/App.ts:42`, `versions/v2-reference-driven/src/app/App.ts:63`, `versions/v2-reference-driven/src/app/App.ts:100`, `versions/v2-reference-driven/src/app/App.ts:150`, `versions/v2-reference-driven/src/dev/debug.ts:20`, `versions/v2-reference-driven/tests/e2e/fidelity.spec.ts:53`

## Connected to

- **owns:** the camera, the renderer, the texture loads, the loop, and the
  wind→layer wiring.
- **owned-by:** `src/main.ts:11` — constructs it and sets `__papsukkalReady`.
- **joins:** `v2-layers/layer-manifest.md`, `v2-layers/layer-mesh.md`,
  `wind/wind-field.md` + `wind/plant-oscillator.md` (V2's copies).
- **looks-like-but-is-not:** not V1's app shell. There is **no** DOF pass, no
  orbit, no camera drift here — V2's blur is baked into the photograph, and the
  composition is locked by the photograph itself.

## If you change this

- **Hits:** the zero-motion fidelity gate, immediately, for any change to
  `colorSpace`, tone mapping or the framing maths (`fidelity.spec.ts:53`). The
  dev reference overlay and the difference view stop aligning if `handleResize`
  stops being cover-fit. Removing the `bgFile` expansion at `App.ts:63` unloads
  every static patch, so the plate's inpainted fill shows through wherever a
  flower's silhouette was. Dropping the det-mode intensity pin makes
  `npm run shots`, `versions/v2-reference-driven/scripts/ghost-probe.mjs` and the e2e captures depend on the
  runner's reduced-motion setting.
- **Does not hit:** the deformation itself. Bend envelope, head disc and the
  displacement clamp live in `layerMaterial.ts:50` and `LayerMesh.ts:44`; the app
  only forwards simulator output. Nor does it hit the offline assets — the
  cutouts, patches and plate are fixed files produced by
  `processes/prepare-assets.md`, and no runtime setting can change what is in
  them.

## Surfaces

| Surface | Role |
|---|---|
| `src/main.ts` | writes — constructs `App`, flags readiness |
| `src/dev/debug.ts` | reads — `app.layerMeshes`, material uniforms (DEV only) |
| `tests/e2e/fidelity.spec.ts` | reads — `?wind=0`, `?det=1&t=`, `__advanceTo` |
| `versions/v2-reference-driven/scripts/shots.mjs`, `versions/v2-reference-driven/scripts/ghost-probe.mjs` | reads — det-mode captures |

## See

- Source: `versions/v2-reference-driven/src/app/App.ts`
