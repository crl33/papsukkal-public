---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/scripts/
---

# Measurement tools

The dev-only instruments that make "closer to the reference" checkable. Two
comparison tools plus three probes. None of them ship — they live in `scripts/`
and are run by hand or in the art-direction loop.

## Why this shape

Art-direction iterations were oscillating: changes were made because the render
"looked too dark", then reversed the next pass. Two separate misdiagnoses (stems
too bright; foreground blur radius too small) each cost several rounds and were
both wrong — the first was actually a too-dark *background*, the second a
compositing error. These tools exist so a claim about the image can be checked
instead of argued.

## Shape

- `silhouette.mjs <region>` — crops the same rect from the reference and the
  render and emits four views: `pair` (side by side), `gray` (desaturated
  structure), `edges` (reference edges in magenta over render edges in green),
  `mass` (heavily blurred colour distribution). Regions are named, not
  coordinates: `hero`, `cosmos2`, `orangeUR`, `foreground`, `background`,
  `midground`, `full`.
- `measure.mjs` — band statistics (mean / p50 / p95 / max luminance and teal
  coverage) for the `top`, `mid` and `low` bands, reference vs render.
- `shots.mjs` — deterministic capture at the reference aspect plus the
  responsive matrix; fails on console errors.
- `motion-probe.mjs` / `video-probe.mjs` / `perf-probe.mjs` — strobe frames with
  a NaN/bounds check at long sim times, a 25s recording, and fps/draw-call counts.

Citations: `versions/v1-procedural/scripts/silhouette.mjs:1`,
`versions/v1-procedural/scripts/measure.mjs:1`,
`versions/v1-procedural/scripts/shots.mjs:1`

## Connected to

- **owns:** the `shots/` output tree (gitignored)
- **owned-by:** the art-direction loop — `../../processes/compare-against-reference.md`
- **joins:** `../v1-scene/colour-grade.md` and `../v1-scene/environment.md` (what the band
  metric actually measures), `../v2-layers/deformation-shader.md` (its debug modes are the
  V2 equivalent inspection surface)
- **looks-like-but-is-not:** the test gates. `npm test` / `test:e2e` prove
  correctness; these tools inform taste. Passing tests says nothing about
  whether the frame looks like the reference.

## If you change this

- **Hits:** the numbers quoted throughout `agent-workspace/` — band targets in
  `10-reference-analysis/palette-and-tone.md` and every entry in
  `30-experiments/` are stated in these tools' units. Changing a metric's
  definition invalidates the recorded history, so add a new metric rather than
  redefining one.
- **Does not hit:** the render. These are read-only observers — no scene, shader
  or asset depends on them, and deleting them would change no pixel.

## Surfaces

| Surface | Role |
|---|---|
| agents doing visual work | reads (runs them) |
| `30-experiments/` entries | records their output |
| production build | none — dev-only, never bundled |

## See

- Source: `versions/v1-procedural/scripts/`
- How to run: `agent-workspace/20-visual-gates/how-to-run.md`
