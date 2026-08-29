---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/config/quality.ts
---

# Quality tiers

Three cost tiers (`high` / `medium` / `low`) picked once at startup, plus a runtime watchdog in `App` that can drop render resolution one time if the guess was too optimistic.

## Why this shape

The rule the tiers exist to enforce is that **cost scales, composition never does**. A weak device gets fewer pixels, a cheaper DOF buffer and thinner filler vegetation — it does not get a different photograph. So `heroDetail` stays `1` at medium and only eases to `0.8` at low, and the watchdog's single lever is pixel ratio, not plants. Two hardening decisions follow: the `?quality=` override is checked with `Object.hasOwn`, so `?quality=toString` cannot walk the prototype chain into a bogus "tier" object with undefined numbers; and the watchdog compares frame time against a **rolling decaying minimum of the display's own cadence**, not a fixed 60 Hz assumption, because a healthy 30 Hz monitor or a throttled low-power display would otherwise be diagnosed as a failing GPU. Hidden tabs are skipped entirely for the same reason — background throttling is not a performance signal.

## Shape

- `maxPixelRatio` 2 / 1.5 / 1 · `dofResolutionScale` 1 / 0.75 / 0.5 · `vegetationDensity` 1 / 0.65 / 0.4 · `heroDetail` 1 / 1 / 0.8.
- Initial pick: explicit `?quality=` (hasOwn-guarded) → else mobile UA or ≤4 cores → medium → else DPR > 2.2 → medium → else high.
- Watchdog state on `App`: `frameEma` (α = 0.05), `frameFloor` (decaying min, `min(floor × 1.002 + 0.02, ms)`), `slowFrames`, `downgraded` latch.
- Trip condition: `frameEma > max(24, frameFloor × 1.7)` sustained for **90** frames → pixel ratio clamped to 1, renderer and post chain resized. One-way; the latch is also honoured on resize.
- Guards: skipped when already `downgraded`, in deterministic capture mode (`?det=1`), or `document.hidden`; per-frame `ms` clamped to 100.

Citations: `versions/v1-procedural/src/config/quality.ts:1-4`, `:13-17`, `:19-33`, `:22`, `versions/v1-procedural/src/app/App.ts:34-39`, `:55`, `:72-74`, `:139-140`, `:156-180`, `versions/v1-procedural/tests/unit/quality.test.ts:21-26`

## Connected to

- **owns:** the cost knobs and the one-way runtime downgrade.
- **owned-by:** `App`, which picks the tier in its constructor and runs the watchdog from `tick()`.
- **joins:** `createPostChain` → `new CinematicDofPass(quality.dofResolutionScale)` (`composer.ts:109`); `MeadowScene`, which multiplies filler/bg-field counts by `vegetationDensity` (`MeadowScene.ts:171`, `:233`, `:261`, `:297`, `:329`, `:379`) and applies `heroDetail` only to `focusRole === "hero"` placements (`:193`).
- **looks-like-but-is-not:** not V2's quality handling — V2 has no runtime DOF to scale, so this tier vocabulary does not transfer.

## If you change this

- **Hits:** adding or renaming a tier means both the `QualityTier["name"]` union and the `QUALITY_TIERS` record, or `?quality=` and `pickInitialTier` disagree. Retuning `vegetationDensity` changes plant **counts**, which are consumed once in the `MeadowScene` constructor — so it changes what gets built at load, and nothing at all afterwards. Loosening the watchdog threshold below `frameFloor × 1.7`, or the 90-frame dwell, re-opens the 30 Hz false-downgrade this design closes. Removing the `Object.hasOwn` guard reintroduces the prototype-key hole that `quality.test.ts` pins.
- **Does not hit:** the **frame's composition**. Nothing here touches `cameraConfig` or the placements; `App.handleResize` does read `maxPixelRatio` — through the `downgraded` latch — but only to re-cap the DPR (`versions/v1-procedural/src/app/App.ts:139-140`). The responsive FOV widening above it is driven by viewport aspect alone, so a low-tier phone sees the same framing at fewer pixels. It also does not touch the simulation: `PlantSim` is constructed with 2048 slots regardless of tier (`App.ts:70`), and the watchdog never removes plants or disables DOF — it only clamps pixel ratio. Lowering `dofResolutionScale` changes the blur's *resolution*, not its shape: `focusDistance` and `deadZone` live in `CinematicDofPass`.

## Surfaces

| Surface | Role |
|---|---|
| `App` constructor | reads — pixel ratio, DOF scale, tier handed to `MeadowScene` |
| `App.watchPerformance` | writes — one-way pixel-ratio downgrade, respected by `handleResize` |
| `MeadowScene` | reads — `vegetationDensity` at build time, `heroDetail` for heroes |
| `composer.createPostChain` | reads — `dofResolutionScale` into `CinematicDofPass` |
| `?quality=` URL param | writes — forced tier, `Object.hasOwn`-guarded |
| `tests/unit/quality.test.ts` | reads — pins override, prototype-key rejection, heuristics |

## See

- Source: `versions/v1-procedural/src/config/quality.ts`
- Watchdog: `versions/v1-procedural/src/app/App.ts`
- Consumers: `versions/v1-procedural/src/scene/MeadowScene.ts`, `versions/v1-procedural/src/scene/postprocessing/composer.ts`
