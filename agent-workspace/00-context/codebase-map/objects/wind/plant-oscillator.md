---
type: object
cluster: wind
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/wind/PlantSim.ts
---

# Plant oscillator

How one plant answers the breeze — `PlantSim`, a flat array of damped stem oscillators (each with a second head oscillator behind it) forced by the shared `WindField`.

## Why this shape

Wind never sets a pose here; it applies force, the stem stores energy, the head lags, damping settles it — that is the whole difference between vegetation in airflow and geometry modulated by a wave (`PlantSim.ts:1-7`). Two constraints shape everything else. First, a spring integrated at the display's frame rate behaves differently at 30 and 120 fps, so integration runs at a fixed 120 Hz substep drained from an accumulator, with a `MAX_FRAME_DT` clamp so a tab-switch pause cannot explode it; a unit test pins 30 fps and 120 fps runs to within 1e-6 (`:126-131`, `versions/v1-procedural/tests/unit/plantSim.test.ts:23-31`). Second, identical plants moving identically reads as a screensaver, so every registration re-rolls the preset by ±12% from its own seed — no two plants share a natural frequency, and synchronisation becomes impossible (`:93`). State lives in packed `Float32Array`s (S=10 params, D=8 dynamics per plant) because this loop runs over every instance every substep.

## Shape

- `MECHANICS`: eight species presets (`cosmosHero` … `backgroundStalk`) keyed by name; heavier heads get lower `freq` and more lag, and a test asserts that ordering as config sanity.
- Output is one `Float32Array`, **stride 4: [bendX m, bendZ m, headPitch rad, headRoll rad]** — the contract the vegetation shader's `iBend` attribute is declared against.
- Head lag is a second oscillator forced by the *stem-tip acceleration* (`-ax`), then cross-wired on write (hz→X channel, −hx→Z channel) so the head tips within its plane of motion.
- Two limits, both soft-then-hard: progressive stiffening near `maxBend` in the step, plus an absolute clamp at `maxBend × 1.35` and `±0.22 rad` head nod on write.
- Capacity is fixed at construction — 2048 in V1, 64 in V2 — and overflow throws.
- `advanceTo()` is the deterministic seek used by screenshot and gate runs.

Citations: `versions/v1-procedural/src/scene/wind/PlantSim.ts:37`, `:48`, `:51-53`, `:57`, `:91`, `:93`, `:109`, `:119`, `:126`, `:136`, `:166`, `:170`, `:181`, `:218`, `:226-231`, `versions/v1-procedural/tests/unit/plantSim.test.ts:81`

## Connected to

- **owns:** `output` and `gustOut` — the only wind data the GPU ever sees
- **owned-by:** each version's app shell, which builds it around one `WindField` (`versions/v1-procedural/src/app/App.ts:70`, `versions/v2-reference-driven/src/app/App.ts:60`)
- **joins:** `wind/wind-field.md` (forcing), `v1-scene/vegetation-material.md` via `InstancedPlants.sync` (`versions/v1-procedural/src/scene/vegetation/InstancedPlants.ts:96-101`) and hero uniforms (`versions/v1-procedural/src/scene/MeadowScene.ts:401`), `v2-layers/deformation-shader.md` via `LayerMesh.setBend`
- **looks-like-but-is-not:** `versions/v2-reference-driven/src/wind/PlantSim.ts` is a copy with one deliberate behavioural change — V1 seeds a small rest-curvature so procedural plants are not all perfectly vertical (`PlantSim.ts:116-120`); V2 **zeroes it**, because the photograph already encodes each plant's rest pose and any offset at wind=0 would displace reference pixels and fail the static-fidelity gate (`versions/v2-reference-driven/src/wind/PlantSim.ts:124-129`)

## If you change this

- **Hits:** every plant in *this version* simultaneously — a `MECHANICS` edit re-times whole species, and every consumer copies blindly from `output` by index. Changing the stride or the meaning of a channel breaks four call sites at once: `InstancedPlants.sync`, the hero `uBend` set, `BokehSprites.syncBends` — which copies all four channels at stride 4 and is called unconditionally from `syncToGpu` (`versions/v1-procedural/src/scene/vegetation/BokehSprites.ts:131-141`, `versions/v1-procedural/src/scene/MeadowScene.ts:407`) — and V2's `syncBends`. Touching `SUBSTEP` or the integrator invalidates every recorded screenshot and trips the timestep-independence and bounded-deflection gates. Widening `maxBendFrac` past the `×1.35` clamp silently does nothing.
- **Does not hit:** the wind itself — `PlantSim` only reads `WindField`, so plants going stiller is not the breeze weakening. It does not reshape geometry either: meshes are built once and bend is applied per-vertex in the shader from a root-fixed envelope, so silhouettes, the petal atlas, DOF and the colour grade are untouched. And it does not reach the other version: V2's identical-looking `MECHANICS` table is a separate copy — renaming a preset there additionally breaks the layer manifest, which names presets as strings (`versions/v2-reference-driven/tests/unit/wind.test.ts:56`).

## Surfaces

| Surface | Role |
|---|---|
| `WindField.sample` | read by it — one sample per plant per substep |
| `InstancedPlants.sync` | reads `output` + `gustOut` into instance attributes |
| `MeadowScene.syncToGpu` | reads all four channels into hero `uBend`/`uGust` |
| `BokehSprites.syncBends` | reads all four channels into the bokeh sprites' `iBend` attribute |
| V2 `App.syncBends` | reads channels 0, 1, 3 only — V2 ignores `headPitch` |
| V1/V2 unit gates | pin determinism, timestep independence, bounds |

## See

- Source: `versions/v1-procedural/src/scene/wind/PlantSim.ts`
- Copy (rest-curvature zeroed): `versions/v2-reference-driven/src/wind/PlantSim.ts`
- Gates: `versions/v1-procedural/tests/unit/plantSim.test.ts`, `versions/v2-reference-driven/tests/unit/wind.test.ts`
