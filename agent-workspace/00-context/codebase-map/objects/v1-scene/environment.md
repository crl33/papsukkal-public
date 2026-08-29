---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/environment.ts
---

# Environment

Everything behind and beneath the meadow: a shader-painted backdrop plane far upstage plus a dark soil plane, added by `addEnvironment` before any plant exists.

## Why this shape

Two constraints shaped this. First, the backdrop paints in **world** coordinates, not UV: the app widens the vertical FOV on narrow viewports, so a UV-space gradient would slide and stretch its features with the framing. Painting from `vWorld.xy` anchors the cyan sky-gap and the warm murmurs to fixed points in the world, and the plane is oversized (4× the frustum half-height at its depth, ×1.6 again in width) so a tall portrait framing still lands inside painted area. Second, the soil must never end in a visible line — a hard far edge would read as a horizon and destroy the macro-photograph illusion, so the ground fragment mixes toward the atmosphere colour with distance and is fully dissolved before its own edge is reached. Everything here is deliberately coarse: DOF eats the fine detail at this depth, so the job is a colour wash — deep navy-teal, a luminous sage meadow band where the flowers sit, dark corners.

## Shape

- Backdrop: plane at `z = -11`, centred at camera height, half-height `halfHeightAt(11) × 4`, width also scaled by `refAspect × 1.6`; `ShaderMaterial`, no textures.
- Vertical wash: `t = clamp((y + 2)/9)`, near-black `(0.002, 0.008, 0.012)` up to `(0.03, 0.1, 0.12)`.
- Sage meadow band: a gaussian on `y` centred at `0.95`, width `2.1`, adding `(0.05, 0.098, 0.078)` — the middle must read olive-teal, never a navy void.
- Thirteen world-space `blob()` calls: six of ochre/rose/void variation inside the band, three stacked into the cyan sky gap around `(0.75, 2.5)`, two warm murmurs upper-left, two red field glows left and right.
- Ground: hardcoded 60×60 plane at `(0, 0, -16)` — nothing about it is camera-derived — with a seeded 256² painted soil texture (`createRng(42)`, 700 ellipses), faded to `uAtm = #1c3a31` by `smoothstep(3.0, 9.0, dist) × 0.96`.
- Ground tiling is `vUv = uv * 8.0` in the vertex shader plus `RepeatWrapping`, and nothing else: the texture's own `tex.repeat.set(4, 4)` is inert, because three.js applies `repeat` through the `uvTransform` / `mapTransform` chunks that a raw `ShaderMaterial` with a custom vertex shader never includes. Change the `8.0`, not the repeat.
- `scene.background = #081d2a` — a fallback wash the oversized backdrop essentially never lets you see.

Citations: `versions/v1-procedural/src/scene/environment.ts:1-8`, `:34-41`, `:44-60`, `:66-75`, `:84-88`, `:92-98`, `:100-127`, `:129-140`, `:141-156`

## Connected to

- **owns:** the frame's background colour field and the soil under the meadow.
- **owned-by:** `MeadowScene`, which calls `addEnvironment(scene)` first thing in its constructor (`MeadowScene.ts:98`).
- **joins:** the locked camera — `halfHeightAt` / `cameraConfig.refAspect` / `cameraConfig.height` size and place the **backdrop** only (`versions/v1-procedural/src/scene/environment.ts:132-138`); the ground is hardcoded and reads nothing from `cameraConfig`. Also the DOF pass, which blurs the backdrop purely because it sits 11 m behind a 1.18 m focus plane.
- **looks-like-but-is-not:** not V2's plate. V2's background is the inpainted photograph `public/reference/layers/plate.jpg`, not a shader.

## If you change this

- **Hits:** the mood of every frame — this is most of the visible pixel area behind the flowers. Moving `backdropZ`, or shrinking the `× 4` / `× 1.6` oversize, can expose the plane's edge (and the raw `scene.background`) on tall portrait viewports, because the app widens FOV there. Editing blob centres moves features in **world** metres, not screen fractions, so they will not track a re-framed composition. Narrowing the ground's `smoothstep(3.0, 9.0)` range, or dropping the `0.96` mix, lets a horizon line form — the one failure this file exists to prevent.
- **Does not hit:** the **vegetation's** own distance fade. Plants dissolve toward `uAtmCol = #3d6455` (`vegetationMaterial.ts:334`) over a range hardcoded in that fragment shader — `atmStart = mix(1.0, 2.6, vHeadFlag)`, `atmEnd = mix(3.8, 8.0, vHeadFlag)` (`vegetationMaterial.ts:292-294`) — constants this file never reads. Retune the ground's `#1c3a31` and the plants will still fade to a different teal; the two are matched only by eye. Do not try to retune that fade through `uAtmRange`: it is declared (`vegetationMaterial.ts:193`) and given `(2.2, 8.0)` (`:335`), but no line of the shader samples it — a dead uniform, edits to it change nothing. It also does not change DOF (blur comes from depth and `focusDistance`, untouched by colour), does not move any flower (placements are projected through `cameraConfig`, not the backdrop), and does not affect V2.

## Surfaces

| Surface | Role |
|---|---|
| `MeadowScene` constructor | writes — calls `addEnvironment(scene)` before building plants |
| `cameraConfig` | read — `halfHeightAt`, `refAspect`, `height` size and place the backdrop; the ground plane is hardcoded |
| `CinematicDofPass` | reads (indirectly) — blurs the backdrop by depth alone |
| `vegetationMaterial.srgb` | read — colour helper only; atmosphere constants are not shared |

## See

- Source: `versions/v1-procedural/src/scene/environment.ts`
- Caller: `versions/v1-procedural/src/scene/MeadowScene.ts`
- Framing: `versions/v1-procedural/src/config/cameraConfig.ts`
