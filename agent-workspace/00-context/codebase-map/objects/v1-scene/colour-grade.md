---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/postprocessing/composer.ts
---

# Colour grade

V1's final look — "the grade" is `GradeEffect`, a custom effect that runs *after* ACES filmic tone mapping inside one shared `EffectPass`, alongside the `createPostChain` factory that assembles the whole optics chain.

## Why this shape

Tone mapping and grading answer different questions and must stay in that order. ACES compresses HDR scene-referred light into display range; only once values are display-referred can a look be authored against them, because every threshold in the grade (`smoothstep(0.75, 1.0, l2)` for highlight protection, the `pow(1 − luma, 2.2)` shadow mask) is a statement about *displayed* luminance. Swap the order and every constant in `GRADE_FRAG` becomes meaningless. Three of the grade's moves are corrections for how synthetic colour fails against a photograph: shadows in the reference are never neutral, so they are pushed toward teal-navy *and* given a small additive lift so they glow rather than crush (`composer.ts:43`–`:44`); saturation is raised but faded to 1.0 in the highlights so bright petals do not turn into flat clipped chips (`:51`); and a **gamut floor** lifts the weakest channel to 8.5% of the strongest (`:57`) — real saturated photographic colour never has a channel at literal zero, and a zeroed channel is the single most "CG" artefact in the frame. Grain is driven by `grainTime`, a value the app sets from *simulation* time rather than wall clock (`:66`, `:88`), so a deterministic capture at a fixed `t` reproduces the exact same frame including its noise.

## Shape

- Order is fixed in `createPostChain`: `RenderPass` → `CinematicDofPass` → one `EffectPass` carrying `ToneMappingEffect(ACES_FILMIC)` then `GradeEffect` (`:107`–`:114`).
- Composer runs at `HalfFloatType` (`:106`).
- Grade constants, all uniforms so they are tunable without a recompile: `shadowTint (0.62, 0.85, 1.0)`, `saturation 1.14`, `vignette 0.5`, `grain 0.008`, `contrast 1.2` (`:77`–`:82`).
- Steps in the fragment, in order: shadow tint + additive lift → contrast about mid grey → highlight-protected saturation → gamut floor → vignette (`smoothstep(0.35, 0.95, |uv−0.5| * 1.25)`) → grain (`:42`–`:66`).
- Grain is hashed against a fixed `1920×1080` UV grid, so its apparent size is resolution-independent (`:66`).
- `blendFunction: BlendFunction.SRC` — the effect replaces, it does not blend over (`:75`).

Citations: `versions/v1-procedural/src/scene/postprocessing/composer.ts:43`, `:44`, `:47`, `:51`, `:57`, `:61`, `:66`, `:75`, `:77`, `:88`, `:106`, `:110`, `:113`, `:114`, `versions/v1-procedural/src/app/App.ts:89`, `versions/v1-procedural/src/app/App.ts:151`

## Connected to

- **owns:** the display-referred look — shadow bias, contrast, saturation, gamut floor, vignette, grain; and the *order* of the whole optics chain.
- **owned-by:** `App` constructs the chain with the quality tier's `dofResolutionScale` and calls `grade.setGrainTime` on every path — live tick, fixed-time boot, and the `__advanceTo` test hook (`App.ts:72`, `:89`, `:100`, `:151`).
- **joins:** `CinematicDofPass` (upstream in the same composer); `PlantSim.time`, which is the value fed to `setGrainTime` — the grain and the wind share one clock.
- **looks-like-but-is-not:** the per-plant atmospheric haze toward `uAtmCol` in `vegetationMaterial` (`shaders/vegetationMaterial.ts:295`) and the backdrop wash in `environment.ts:34`. Both are teal, both read as "the grade" in a screenshot, and neither is in this file — they are scene-space, depth-aware, and unaffected by anything here.

## If you change this

- **Hits:** every pixel, including the UI-free page background, since the meadow *is* the page. Changing `grain` or how `grainTime` is derived breaks frame-identical determinism, which the fixed-time boot path and `__advanceTo` hook exist to provide — `npm run shots` comparisons stop being meaningful. Raising `saturation` or lowering the gamut floor changes the apparent hue of every plant, so the per-species `aColor` and `uUnderside` values in `vegetationMaterial`/`MeadowScene` were tuned *through* this grade and will read wrong. Reordering the passes in `createPostChain` — putting the grade before ACES, or before DOF — invalidates every constant in `GRADE_FRAG` at once.
- **Does not hit:** **the depth of field.** The natural assumption is that darkening or desaturating changes what reads as blurred — it does not: `CinematicDofPass` runs strictly upstream and computes circles of confusion from the depth buffer, never from colour (`CinematicDofPass.ts:58`). Focus, bokeh structure, and near-field coverage are untouched by any grade edit. It also does not hit `composer.ts`'s own stale header comment, which still names a `DepthOfFieldEffect` the chain no longer uses (`:3`) — fix that when you are next in the file. And not V2, which has its own chain.

## Surfaces

| Surface | Role |
|---|---|
| `App` constructor | reads `quality.dofResolutionScale`, builds the chain |
| `App.tick` / fixed-time path / `__advanceTo` | writes `grade.setGrainTime(sim.time)` |
| `App.handleResize` | writes `post.setSize(w, h)` |
| `versions/v1-procedural/scripts/shots.mjs` | reads the graded frame — determinism is what makes it comparable |

## See

- Source: `versions/v1-procedural/src/scene/postprocessing/composer.ts`
- Upstream pass: `versions/v1-procedural/src/scene/postprocessing/CinematicDofPass.ts`
- Driver: `versions/v1-procedural/src/app/App.ts`
