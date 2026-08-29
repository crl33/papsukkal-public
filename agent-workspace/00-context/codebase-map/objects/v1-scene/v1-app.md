---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/app/App.ts
---

# V1 app shell — camera lock, loop, capture mode

The `App` class: renderer bootstrap, the locked photographic camera, the fixed-substep
simulation loop, and the deterministic capture mode that makes screenshots reproducible.

## Why this shape

The photograph's point of view is authoritative, so the camera is constructed once and
never moved again — no orbit, no pointer parallax, no idle drift (`App.ts:61`). Only the
FOV changes, and only to rescue the hero cluster from a narrow viewport.

Everything else here exists to make a *moving* scene *provable*. The frame is judged
against a reference image, so a human or a test must be able to ask for "the same frame"
twice. That forces three things: simulation time is the only clock any visual reads
(grain included — `composer.ts:66,88`), the integrator is substepped so 30 Hz and 120 Hz
displays land on identical state (`PlantSim.ts:48,127`), and `?det=1` *replaces* the
animation loop with one seeked frame plus `window.__advanceTo`, rather than trying to
freeze a running loop.

Reduced motion damps the wind to 0.12 instead of stopping the loop (`App.ts:64,68,83`) —
a still meadow reads as a broken page; a barely-breathing one reads as calm.

## Shape

- Constructor does everything; no `start()`. The branch at `App.ts:86` picks det-mode
  single frame vs `setAnimationLoop`.
- URL params read here: `det`, `t` (default 6), `seed` (default 1337); `quality` is read
  in `pickInitialTier` (`quality.ts:20-23`).
- Globals: `__papsukkalReady` always (`App.ts:108`), `__app` DEV-only (`App.ts:109-111`),
  `__advanceTo` det-only (`App.ts:97`).
- `PlantSim` capacity 2048 (`App.ts:70`); responsive framing keeps a 0.30 m half-extent
  in frame (`App.ts:127`); runtime downgrade is resolution-only and one-way, composition
  never changes (`App.ts:165-180`).
- `main.ts` is four lines plus an `import.meta.env.DEV` dynamic import of the compare
  overlay, so dev tooling is dead-code-eliminated from production (`main.ts:10-12`).

Citations: `versions/v1-procedural/src/app/App.ts:45`, `versions/v1-procedural/src/app/App.ts:61`, `versions/v1-procedural/src/app/App.ts:64`, `versions/v1-procedural/src/app/App.ts:70`, `versions/v1-procedural/src/app/App.ts:86`, `versions/v1-procedural/src/app/App.ts:97`, `versions/v1-procedural/src/app/App.ts:108`, `versions/v1-procedural/src/app/App.ts:127`, `versions/v1-procedural/src/app/App.ts:166`, `versions/v1-procedural/src/main.ts:10`, `versions/v1-procedural/src/dev/compare.ts:1`, `versions/v1-procedural/src/scene/wind/PlantSim.ts:48`, `versions/v1-procedural/src/scene/wind/PlantSim.ts:136`, `versions/v1-procedural/src/scene/postprocessing/composer.ts:88`, `versions/v1-procedural/src/config/cameraConfig.ts:8`

## Connected to

- **owns:** the renderer, the camera instance, the sim clock, det-mode globals
- **owned-by:** `versions/v1-procedural/src/main.ts`
- **joins:** `v1-scene/locked-camera`, `v1-scene/quality-tiers`, `v1-scene/cinematic-dof`,
  `v1-scene/colour-grade`, `wind/plant-oscillator`, `pipeline/dev-gates`
- **looks-like-but-is-not:** `v2-layers/v2-app`. Same class name, same `?det=1&t=N` and
  `__advanceTo` contract, entirely separate file — see `repo/version-separation`.

## If you change this

- **Hits:** the capture contract, and it has more consumers than the shot script.
  `__papsukkalReady` gates four scripts plus the e2e suite:
  `versions/v1-procedural/scripts/shots.mjs:45` and
  `versions/v1-procedural/scripts/motion-probe.mjs:30` (both at `?det=1&t=N`),
  `versions/v1-procedural/scripts/video-probe.mjs:14` and
  `versions/v1-procedural/scripts/perf-probe.mjs:8` (live mode, no det), and
  `smoke.spec.ts:51` / `:101`. `__advanceTo` has exactly one consumer,
  `versions/v1-procedural/scripts/motion-probe.mjs:33`; `__app` is read by
  `versions/v1-procedural/scripts/perf-probe.mjs:11` and
  `versions/v1-procedural/scripts/motion-probe.mjs:41` as well as the tests. Drop or
  rename a global and they fail *loudly*: every consumer blocks in Playwright's
  `waitForFunction`, which throws on timeout — shots and motion-probe pass an explicit
  `{ timeout: 15000 }` and await at ESM top level, so the rejection exits non-zero with a
  stack trace, and the smoke tests fail. `smoke.spec.ts:25-26` reaches through
  `window.__app.post.composer.render()`
  because `preserveDrawingBuffer` is off, and `smoke.spec.ts:83-86` reads
  `__app.wind.intensity` — so the DEV-only `__app` export is load-bearing for tests, not
  a debug nicety. Introducing `Math.random()` or `performance.now()` into any per-frame
  visual path silently breaks det reproducibility without failing a test. Touching
  `fovY`, `height` or the 0.30 m `mustSee` reframes every viewport in the responsive
  block (`smoke.spec.ts:89-108`) and invalidates committed shots.
- **Does not hit:** V2. It has its own `App` with its own det branch and `__advanceTo`
  (`versions/v2-reference-driven/src/app/App.ts:39`) and imports nothing from here.
  Also does not hit the lens: `App` passes only `dofResolutionScale`
  (`App.ts:72-74`); focus distance and the blur curves live in `cameraConfig.ts:15` and
  `CinematicDofPass`. And removing the compare overlay does not shrink the production
  bundle — the DEV guard already removes it.

## Surfaces

| Surface | Role |
|---|---|
| `versions/v1-procedural/src/main.ts` | constructs App, DEV-imports the compare overlay |
| `versions/v1-procedural/scripts/shots.mjs` | reads — drives `?det=1&t=N`, waits on `__papsukkalReady` |
| `versions/v1-procedural/scripts/motion-probe.mjs` | reads — `__papsukkalReady`, the only caller of `__advanceTo`, then `__app.sim` |
| `versions/v1-procedural/scripts/perf-probe.mjs` | reads — `__papsukkalReady`, then `__app` for frame timings (live mode) |
| `versions/v1-procedural/scripts/video-probe.mjs` | reads — `__papsukkalReady` only, live playback recording |
| `versions/v1-procedural/tests/e2e/smoke.spec.ts` | reads `__app`, `__papsukkalReady` |
| `versions/v1-procedural/src/dev/compare.ts` | DEV overlay, keyed 1–5/0, reference via drag-drop |

## See

- Source: `versions/v1-procedural/src/app/App.ts`
- Source: `versions/v1-procedural/src/main.ts`
- Docs: `versions/v1-procedural/docs/dev-workflow.md:19-21`
