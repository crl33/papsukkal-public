# The gates — what each one proves

Run the gate that covers what you touched. Thresholds are targets, not pass/fail
lines, except where marked **hard**.

## A — Thumbnail silhouette

`silhouette.mjs full` → `gray.png`. Desaturated, at thumbnail size, the major
flower silhouettes and the foreground/background masses should resemble the
reference's.

Proves: the composition reads correctly independent of colour.

## B — Hero morphology

`silhouette.mjs hero` → `pair.png` + `edges.png`. The hero must read as an
**oblique macro-photographed bowl**, not a frontal CG disc: roughly 2:1 wider
than tall, dark rim arc of near-petal undersides, far petals standing, receptacle
a foreshortened wedge.

Proves: hero flowers have real volumetric morphology. This is the gate that
caught the flowers looking like "flower icons".

## C — Foreground character

`silhouette.mjs foreground`. The bottom band must contain **elongated, cropped,
organic** defocus — not round colour blobs.

Proves: the near-field geometry is oblique flower heads, not sprites.

## D — Colour-mass distribution

`node scripts/measure.mjs`, and `silhouette.mjs full` → `mass.png`. Compare the
band means against `../10-reference-analysis/palette-and-tone.md`:

| Band | Target mean |
|---|---|
| top | 71.6 |
| mid | 54.5 |
| low | 26.8 |

Proves: the vertical luminance ramp matches, and there are no giant synthetic
stage-light areas.

**Caution:** this metric is gameable. A flat uniform wash scores well on mean
while looking dead. Always pair it with Gate A or a look at the frame.

## E — Midground texture

`silhouette.mjs midground` → `gray.png`. In greyscale the midground must read as
**organic botanical tangle**, not a forest of high-contrast straight lines.

Proves: stems are botanical filaments, not wireframe. This gate caught a real
bug — stems rendering as *dashed* lines from per-vertex noise shading.

## F — Zero-motion fidelity (V2 only) — **hard**

`npm run test:e2e` in `versions/v2-reference-driven/`. With `?wind=0` the
composite is pixel-compared against the reference photograph.

Thresholds: mean |diff| < 3.5/255 and fewer than 0.4% of pixels off by >40.
Current: **≈2.2 mean**. If this fails, fix the decomposition before touching
animation — a V2 that does not reproduce the photo at rest is not V2.

## G — No-ghost decomposition (V2 only) — **hard**

`npm test` in `versions/v2-reference-driven/`. Three properties:

- **ghost** — the plate must hold no flower remnant where a flower was lifted
  (chroma collapse *and* structureless gradient energy)
- **coverage** — ≥99.5% of strong flower pixels are near-opaque in the tight cutout
- **margin** — the plate's reconstruction margin exceeds the runtime displacement
  clamp, so a sway can only ever reveal reconstructed background

Proves: a moving flower cannot leave a copy of itself behind.

## H — Motion stability

`node scripts/motion-probe.mjs --times 6,9,600`. At t=600 s: no NaN, deflection
bounded, no drift. Plus `npm test` for timestep independence (30/60/120 fps
produce identical trajectories).

Proves: the breeze is stable and frame-rate independent.
