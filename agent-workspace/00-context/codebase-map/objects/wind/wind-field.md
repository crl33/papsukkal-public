---
type: object
cluster: wind
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/wind/WindField.ts
---

# Wind field

"The breeze" as the air itself — `WindField`, a pure function W(x, z, t) returning a velocity plus a gust envelope; it knows nothing about plants.

## Why this shape

The field carries no simulation state, so a sample at t depends only on (x, z, t) and the seed — that is what makes it unit-testable without a renderer, what makes `advanceTo()` screenshots reproducible, and what let V2 copy the file wholesale instead of importing it. The one hard-won detail is advection: gusts and turbulence are offset along a **fixed** mean heading (0.35 rad), not along the meandering `direction(t)`, because an offset proportional to t·cosθ(t) differentiates to a term in t·θ′ — sampling velocity grows without bound and the field degrades into flicker after minutes (`WindField.ts:104-109`). The meander survives, but only as an angle added at the end (`:117`), where it cannot accumulate. Gusts are ridge-shaped rather than sinusoidal so the meadow is mostly calm with occasional travelling crests (`:130-134`) — a sine would make every plant breathe in unison.

## Shape

- Three bands: base flow (`baseSpeed` 0.32 m/s), two advected ridge-noise gust channels at different scales × cross-wind modulation, and a 2-octave advected simplex FBM turbulence that nudges both magnitude and angle.
- Defaults: seed 1337 (never exercised — every caller in the repo passes one), `gustStrength` 1.05, `gustSpeed` 1.35, `intensity` 1 — five independent noise streams derived by XOR from the one seed.
- `sample()` writes into a caller-owned `out` object (no allocation in the hot loop) and returns `{x, z, gust}`; `gust` is the scalar the GPU shimmer rides on.
- The only mutable state is a per-instant trig memo keyed on `t` — valid only because `direction()` is pure in t, and hit constantly because every plant is sampled at the same substep instant.
- `intensity` is the live-mutable knob: reduced-motion sets 0.12.

Citations: `versions/v1-procedural/src/scene/wind/WindField.ts:13`, `versions/v1-procedural/src/scene/wind/WindField.ts:57`, `versions/v1-procedural/src/scene/wind/WindField.ts:61`, `versions/v1-procedural/src/scene/wind/WindField.ts:69`, `versions/v1-procedural/src/scene/wind/WindField.ts:80`, `versions/v1-procedural/src/scene/wind/WindField.ts:97`, `versions/v1-procedural/src/scene/wind/WindField.ts:108`, `versions/v1-procedural/src/scene/wind/WindField.ts:119`, `versions/v1-procedural/src/scene/wind/WindField.ts:127`, `versions/v1-procedural/src/app/App.ts:66`

## Connected to

- **owns:** the gust envelope — in V1 it scales every shimmer amplitude, as the `iGust` attribute and the `uGust` uniform (`versions/v1-procedural/src/scene/vegetation/InstancedPlants.ts:85`, `versions/v1-procedural/src/scene/shaders/vegetationMaterial.ts:103`). In V2 nothing consumes it: `PlantSim` writes `gustOut` and no shader reads it (`versions/v2-reference-driven/src/wind/PlantSim.ts:167`)
- **owned-by:** nothing — it is constructed by each version's app shell (`versions/v1-procedural/src/app/App.ts:66`, `versions/v2-reference-driven/src/app/App.ts:59`)
- **joins:** `wind/plant-oscillator.md` — `PlantSim` is its only caller in either version (`versions/v1-procedural/src/scene/wind/PlantSim.ts:156`)
- **looks-like-but-is-not:** `versions/v2-reference-driven/src/wind/WindField.ts` is a **copy**, not a re-export — a separate object, and not byte-identical: below the provenance header (`versions/v2-reference-driven/src/wind/WindField.ts:1-8`) the one difference is the noise import, rewritten `"../../utils/noise"` → `"../utils/noise"` (`versions/v1-procedural/src/scene/wind/WindField.ts:16` vs `versions/v2-reference-driven/src/wind/WindField.ts:24`). Re-sync by porting the diff; copying bytes across breaks the V2 build.

## If you change this

- **Hits:** every plant in *this version* at once — `PlantSim` samples the field per plant per 120 Hz substep, so a `gustStrength`/`gustSpeed`/`baseSpeed` edit re-times all bend — and in V1 all GPU micro-flutter too, since gust feeds `uGust`/`iGust` there; V2 has no shimmer to re-time. It also moves the pinned gates: bounded-velocity (`max < 4` over a 3600 s sweep) and the downwind-travel correlation test (`versions/v1-procedural/tests/unit/windField.test.ts:45`, `:95`). What it does *not* move is the seed: the constructor's `?? 1337` is dead code, because both shells pass one explicitly (`versions/v1-procedural/src/app/App.ts:65`, `versions/v2-reference-driven/src/config/layers.ts:281`). To re-seed a recorded screenshot you edit those, not the default.
- **Does not hit:** the *other* version. V2 holds its own copy; editing V1's file leaves V2's meadow identical, and vice versa — you must edit both deliberately. It also does not touch geometry (no mesh vertex is built from wind; bend arrives as a shader attribute at `versions/v1-procedural/src/scene/MeadowScene.ts:401`), nor `CinematicDofPass`, nor the colour grade, nor composition — plant roots are placements, and the field only ever reads their coordinates.

## Surfaces

| Surface | Role |
|---|---|
| `PlantSim.step` | reads — one `sample()` per plant per substep |
| V1 app shell | constructs it; writes `intensity` on reduced-motion change |
| V2 app shell | constructs its own copy with `WIND_SEED` |
| V1 vegetation shader | reads `gust` as shimmer amplitude — `iGust` attribute / `uGust` uniform |
| V2 layer shader | reads no gust at all — `createLayerMaterial` declares neither uniform nor attribute (`versions/v2-reference-driven/src/shaders/layerMaterial.ts:110`); V2's `gustOut` is a dead output |

## See

- Source: `versions/v1-procedural/src/scene/wind/WindField.ts`
- Copy: `versions/v2-reference-driven/src/wind/WindField.ts`
- Gates: `versions/v1-procedural/tests/unit/windField.test.ts`
