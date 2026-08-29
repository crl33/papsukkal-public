---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/config/cameraConfig.ts
---

# Locked camera

Six numbers (`cameraConfig`) plus the projection inverse `placeFromScreen()` — the
coordinate system every V1 placement is authored in, and a camera that never moves.

## Why this shape

The reference photograph is the spec, and matching it by eye in world coordinates
is unwinnable: a flower at 1.15 m and one at 3.4 m need wildly different metre
offsets to land on the same spot in frame. So the projection is inverted instead —
art direction says *where it sits in the photo* plus *how far away*, and
`placeFromScreen()` solves for the world position, so the frame reproduces the
photo's layout by construction rather than by tuning (`versions/v1-procedural/docs/visual-reference.md:123`).
That only holds while the camera is static, so **the camera is locked**: no orbit,
no parallax, no pointer follow, no drift, set once at construction and never
touched again. A product rule, not an oversight. The one concession is FOV.

## Shape

- `fovY 22`, `height 0.52` m, `refAspect 1.51`, `focusDistance 1.18` m, `near 0.05`,
  `far 30`. World units are metres; camera at origin, looking −Z, pitch 0.
- `placeFromScreen(nx, ny, depth) -> [x, y, −depth]`: `x` and `y` scale with the
  frustum half-height at `depth`; `z` is `−depth` verbatim. `frameWidthAt(depth)`
  turns a `sizeFrac` into metres.
- Responsive framing widens `camera.fov` only when the frame gets too narrow to
  hold `mustSee = 0.30` m of half-width at the focus plane. Nothing is re-placed —
  the wider FOV reveals more margin around a composition already baked at 22°.
- Stale comment: `App.ts:114-118` claims resize also "biases the view slightly left
  of center". It does not — no position or rotation is ever written. What
  `handleResize` *does* write beside `fov`: `camera.aspect` (`App.ts:124`),
  `updateProjectionMatrix`, then the renderer pixel ratio, the renderer size and
  the post-chain size (`App.ts:139-142`).

Citations: `versions/v1-procedural/src/config/cameraConfig.ts:8`, `versions/v1-procedural/src/config/cameraConfig.ts:15`, `versions/v1-procedural/src/config/cameraConfig.ts:37`, `versions/v1-procedural/src/app/App.ts:59`, `versions/v1-procedural/src/app/App.ts:61`, `versions/v1-procedural/src/app/App.ts:124`, `versions/v1-procedural/src/app/App.ts:127`, `versions/v1-procedural/src/app/App.ts:133`, `versions/v1-procedural/src/app/App.ts:139-142`, `versions/v1-procedural/tests/unit/cameraConfig.test.ts:16`

## Connected to

- **owns:** the screen coordinate system every `screen: [nx, ny]` in `composition.ts`
  is written in; the world position of every plant in the scene.
- **owned-by:** the photograph's optics as measured in `versions/v1-procedural/docs/visual-reference.md:26`
  (~85–135 mm equiv, ≈0.5 m height, level pitch, FOV 20–25°).
- **joins:** `MeadowScene` (projects every placement and scatter sample,
  `MeadowScene.ts:104`, `:175`, `:241`, `:268`); `CinematicDofPass:221`
  (`near`/`far`/`focusDistance` uniforms); `environment.ts:133` (backdrop sized
  from `halfHeightAt`, so it follows automatically).
- **looks-like-but-is-not:** V2 has no camera config — its framing is a cover-fit of
  the photograph (`versions/v2-reference-driven/src/config/layers.ts:16`, `IMG_ASPECT`
  = 1242/822 ≈ the same 1.51). Same photo, independently written number.

## If you change this

- **Hits:** every placement, everywhere. `fovY`, `height` and `refAspect` are inputs
  to `placeFromScreen`, so touching one moves all 82 art-directed placements
  (`composition.ts:263-269` — 22 heroes, 12 red clusters, 14 blue sprigs, 14
  foreground, 20 background), the `bgField` clusters, the tangle/feather scatter and
  the backdrop plane at once. The 20 background entries are no exception: they become
  sprite impostors, but through the same `placeFromScreen` call as everything else
  (`MeadowScene.ts:104`). The numbers in `composition.ts` do not change, the picture
  does. It also silently desyncs `MeadowScene.ts:351-353`, which re-derives the
  projection with the values hardcoded (`11°`, `1.51`, `0.52`) to test mid-flowers
  against the hero keep-clear discs — those constants do not follow `cameraConfig`.
  `near`/`far` are the exception to *layout* only — they move nothing — but they are
  the real clip planes on the `PerspectiveCamera` (`App.ts:59`), not just the DOF's
  depth linearization: shrinking `far` clips content, starting with the backdrop
  plane at z = −11 (`environment.ts:132-138`), and `composition.test.ts:22-23` gates
  every placement's depth against both.
- **Does not hit:** the focus plane, or the wind. `focusDistance` is its own field —
  widening `fovY` or raising `height` leaves it at 1.18 m, and `placeFromScreen`
  returns `z = −depth` untouched, so nothing moves in or out of focus; the blur
  curves live in `CinematicDofPass`, not here. `WindField`/`PlantSim` never import
  `cameraConfig` — gust speed and timing are unchanged (plants slide within the same
  field, they do not re-tune it). Runtime FOV widening re-places nothing: the
  geometry was already built at 22°.

## Surfaces

| Surface | Role |
|---|---|
| `MeadowScene`, `environment.ts` | read — project placements, size the backdrop |
| `CinematicDofPass` | reads `near`, `far`, `focusDistance` |
| `App.handleResize` | writes `camera.fov`, `camera.aspect`, renderer + post size — never position or rotation |
| `versions/v1-procedural/scripts/shots.mjs` | captures 1242×822 first, so renders compare to the reference |

## See

- Source: `versions/v1-procedural/src/config/cameraConfig.ts`
- Framing: `versions/v1-procedural/src/app/App.ts:114-143`
- Gate: `versions/v1-procedural/tests/unit/cameraConfig.test.ts`
