---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v2-reference-driven/tests/e2e/fidelity.spec.ts
---

# Dev gates — the tests that must not regress

Five test files carrying the invariants neither version may lose: V2 must still *be* the photograph and its decomposition must not ghost, clip or overrun; V1's wind must stay frame-rate-independent and bounded, and its composition config must stay structurally valid.

## Why this shape

The two versions are guarded asymmetrically because only one has a checkable target. V2 aims at a specific committed image, so it can be diffed pixel-for-pixel and its offline decomposition can be tested numerically. V1 synthesises everything, has no committed baseline (see `processes/compare-against-reference.md`), so its automated gates can only assert physics and "a real frame came out". Reading V1's suite as a look gate is the standing mistake. The thresholds below are the contract — they are tight on purpose, and a passing run at a loosened number is not the same guarantee.

## Shape

- **ZERO-MOTION (V2 e2e).** `/?wind=0&bare=1&det=1&t=0`, screenshot resized to 1242×822, compared to `public/reference/reference.jpg`: mean |diff| < 3.5 of 255 **and** fraction of pixels off by >40 under 0.004, with zero console errors. Failure means a cutout, the plate, or the cover-fit framing has drifted — not that the wind is wrong. V2 renders with `NoToneMapping` precisely so the photo passes through ungraded (`App.ts:50`).
- **Liveness (V2 e2e).** Frames must differ between `t=6` and `__advanceTo(8.5)`, and over 1.5 s of live mode. These exist because the pixel gate alone can be satisfied by freezing everything.
- **Reduced motion (V2 e2e).** Same diff under emulated `reduce`, looser bound (mean < 6): stillness must still be the artwork, never a blank fallback.
- **GHOST (V2 unit, per QC region).** Inside each flower's core disc the plate's chroma must collapse (< `max(12, 0.35 × ref)`) *and* its gradient energy stay under 0.3 of the reference's — the fill must be structureless. Failure = petal shapes left in the plate; the flower bends and its twin stays behind.
- **COVERAGE (V2 unit).** > 99.5 % of strongly flower-coloured core pixels are alpha ≥ 240 in the cutout. Failure = part of the flower (typically dark petals) stayed glued to the plate and tears at the edge as the layer moves.
- **MARGIN (V2 unit).** `MOTION_MARGIN_PX` (18) must exceed `LayerMesh.MAX_BEND_IMG` (0.01) × 1242 ≈ 12.4 px. Failure = displacement can pull a layer past the reconstructed region and expose unfilled photograph.
- **V1 timestep independence.** 300 × (1/30 s) and 1200 × (1/120 s) agree within 1e-6. Failure = someone integrated with raw frame dt; the artwork becomes display-dependent.
- **V1 bounded deflection.** After 900 s: finite, |bend| ≤ `maxBendFrac × height × 1.35`, head nod ≤ 0.22 rad. Failure = a stiffness or damping edit that blows up hours into a session, which no short run would show.
- **V1 e2e.** Deterministic frame has luma in 0.02–0.6 and saturation > 0.05 (not black, not white, not grey), repeated across five viewports; reduced motion keeps the scene intact with `wind.intensity < 0.2`.
- **V1 composition validity (V1 unit).** Every placement id unique, every seed unique (a duplicate seed silently produces a twin plant), and each placement in range: `screen` both ∈ [0,1], `depth` strictly inside `cameraConfig.near`/`far`, `sizeFrac` ∈ (0, 0.3), `facing` finite. Structural, not aesthetic — it says nothing about whether the arrangement reads.

Both suites run from a clean clone: V2's unit gates read tracked assets under `public/reference/layers/` (37 files). Playwright boots each dev server itself — V1 on 5183, V2 on 5193. There is no CI; these run when someone runs them (`npm run test:v1`, `test:v2`, `npm run test:e2e` inside a version).

Citations: `versions/v2-reference-driven/tests/e2e/fidelity.spec.ts:30`, `versions/v2-reference-driven/tests/e2e/fidelity.spec.ts:53`, `versions/v2-reference-driven/tests/e2e/fidelity.spec.ts:58`, `versions/v2-reference-driven/tests/e2e/fidelity.spec.ts:94`, `versions/v2-reference-driven/src/app/App.ts:50`, `versions/v2-reference-driven/tests/unit/plate.test.ts:63`, `versions/v2-reference-driven/tests/unit/plate.test.ts:68`, `versions/v2-reference-driven/tests/unit/plate.test.ts:92`, `versions/v2-reference-driven/tests/unit/plate.test.ts:96`, `versions/v2-reference-driven/tools/masks.mjs:34`, `versions/v2-reference-driven/src/layers/LayerMesh.ts:44`, `versions/v1-procedural/tests/unit/plantSim.test.ts:23`, `versions/v1-procedural/tests/unit/plantSim.test.ts:49`, `versions/v1-procedural/tests/e2e/smoke.spec.ts:56`, `versions/v1-procedural/tests/e2e/smoke.spec.ts:86`, `versions/v1-procedural/tests/unit/composition.test.ts:8`, `versions/v1-procedural/tests/unit/composition.test.ts:13`, `versions/v1-procedural/tests/unit/composition.test.ts:16-30`, `versions/v1-procedural/playwright.config.ts:13`, `versions/v2-reference-driven/playwright.config.ts:7`

## Connected to

- **owns:** the numeric thresholds (3.5 / 0.004 / 6 / 0.35 / 0.3 / 0.995 / 18 px / 1e-6 / 1.35 / 0.22)
- **owned-by:** `pipeline` — the offline asset build produces what half these gates inspect
- **joins:** `objects/pipeline/asset-build.md`, `objects/v2-layers/layer-mesh.md`, `objects/v2-layers/mask-specs.md`, `objects/wind/plant-oscillator.md`
- **looks-like-but-is-not:** `processes/compare-against-reference.md` — V1's *human* comparison loop, no assertions, no exit code that matters

## If you change this

- **Hits:** any edit to V2's plate/cutout generation is judged by GHOST and COVERAGE with these exact numbers — a loosened mask radius surfaces first as coverage below 0.995. Raising `LayerMesh.MAX_BEND_IMG` past 18/1242 fails MARGIN by design; raise `MOTION_MARGIN_PX` and regenerate assets in the same change. Touching V1's `SUBSTEP` or accumulator hits the timestep-independence test. Changing V2's cover-fit framing hits ZERO-MOTION, because the comparison resizes the shot to the full 1242×822 plate.
- **Does not hit:** V1's *look*. Palette, DOF curves and grade can all move a long way without failing anything — V1's e2e only asserts the frame is neither black nor white and is colourful. Composition is the near-miss: rearranging placements is unjudged aesthetically, but `versions/v1-procedural/tests/unit/composition.test.ts` still fails on a duplicated id or seed (copy-paste a placement and forget the seed) or an out-of-range screen/depth/`sizeFrac`. Nor do V1 wind edits touch V2's gates: V2 keeps a copied wind model with a provenance header (`versions/v2-reference-driven/src/wind/PlantSim.ts:1`), so V1's `PlantSim` moves no V2 pixel. And ZERO-MOTION tests nothing about the wind model itself — `?wind=0` pins intensity to 0 (`versions/v2-reference-driven/src/app/App.ts:47`), so a completely broken oscillator passes it; the liveness tests are what catch that.

## Surfaces

| Surface | Role |
|---|---|
| `npm run test:v1` / `test:v2` (root) | runs the unit gates |
| `npm run test:e2e` (per version) | runs the pixel and browser gates; boots its own dev server |
| `public/reference/layers/*` | read by V2's unit gates (tracked, required) |
| `tools/masks.mjs` | supplies QC regions and `MOTION_MARGIN_PX` to the tests |

## See

- Source: `versions/v2-reference-driven/tests/e2e/fidelity.spec.ts`, `versions/v2-reference-driven/tests/unit/plate.test.ts`, `versions/v1-procedural/tests/unit/plantSim.test.ts`, `versions/v1-procedural/tests/unit/composition.test.ts`, `versions/v1-procedural/tests/e2e/smoke.spec.ts`
