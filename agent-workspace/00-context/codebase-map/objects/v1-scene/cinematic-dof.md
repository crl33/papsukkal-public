---
type: object
cluster: v1-scene
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/postprocessing/CinematicDofPass.ts
---

# Cinematic DOF

V1's lens — "the DOF" is `CinematicDofPass`, a hand-written `postprocessing` Pass that builds its own blur pyramid and composites two *separate* defocus fields (far gather, near scatter) from the real depth buffer. V2 has no equivalent; its blur is baked into the photograph.

## Why this shape

The reference photograph's foreground blur discs are on the order of 10–15% of frame width (`CinematicDofPass.ts:5`). A single gather kernel cannot reach that — you would need hundreds of taps per pixel, and it would still show the two classic tells. So the pass splits the problem. The **far field** is a gather: each pixel picks its own blur level by its own CoC, and it deliberately *caps at level C* (`:139`) with only a 0.55-weighted drift into D (`:142`) — because distant flowers must stay structured bokeh, not fog; blurring the background to level D turns the meadow's depth into a flat wash. The **near field** cannot be a gather at all, because a defocused foreground object spills *outward past its own silhouette*. It is therefore rendered as its own premultiplied scatter layer (`:86`) and composited over the far result. Premultiplication is the load-bearing part: colour is multiplied by coverage before blurring, so where no near geometry exists coverage is zero and the blur contributes nothing — that is precisely what stops a big out-of-focus magenta petal from tinting the sharp midground behind it. At composite the layer is un-premultiplied (`:160`) to recover the true average foreground colour with no dark fringe at the edge, and the coverage is then re-shaped by a **saturating ramp** `smoothstep(0.10, 0.46, …)` (`:161`) so interiors go fully to the smear while the faint wide tail is cut to zero: the foreground can *occlude* the midground, never merely tint it.

One line exists purely to fix a gather-DOF artefact: `c = mix(c, dd.rgb, smoothstep(0.12, 0.62, coc.x))` (`:148`). The base image still holds the foreground object perfectly sharp, and the scatter layer at a small near object is faint. Without this pre-blur of the base by the pixel's *own* near CoC, a small foreground flower shows crisp petals through a soft haze — the give-away that the blur is composited rather than optical.

## Shape

- Pyramid, all `HalfFloatType`, Kawase iterations chained so each level continues from the last: `Pre/A/B` at 1/2, `C` at 1/4, `D` at 1/8 of the quality-scaled size (`:271`–`:298`).
- Near layer: prefiltered at 1/2, then seven Kawase passes down to 1/8, reusing the finished far pyramid's ping targets as scratch (`:359`–`:368`).
- CoC curve, shared by all three shaders via `COC_GLSL`: `mag = max(|d − f| − deadZone, 0) / d`, split into near/far by `step` on the sign (`:58`–`:65`). Defaults `deadZone 0.085`, `nearScale 1.7`, `farScale 2.3`; `focusDistance` comes from `cameraConfig` (`:219`–`:227`, `config/cameraConfig.ts:15`).
- The near prefilter sharpens its coverage ramp with `smoothstep(0.16, 0.62, near)` *before* premultiplying, so partly-defocused midground plants never register as foreground (`:95`).
- `setSize` resizes in place rather than reallocating, so window drags do not churn GPU memory (`:300`).
- `needsDepthTexture = true` — the pass asks the composer for the depth texture (`:217`).
- `rtNPing`/`rtNear` are 1/8, not 1/16: `pyramidSizes()` still returns a 16th entry but it is explicitly voided (`:293`).

Citations: `versions/v1-procedural/src/scene/postprocessing/CinematicDofPass.ts:5`, `:58`, `:86`, `:95`, `:139`, `:142`, `:148`, `:158`, `:160`, `:161`, `:217`, `:219`, `:271`, `:293`, `:300`, `:359`, `versions/v1-procedural/src/config/cameraConfig.ts:15`

## Connected to

- **owns:** the near/far CoC split; the blur pyramid and its render targets; `setFocus` / `setStrength` as the only sanctioned runtime tuning surface (`:257`, `:264`).
- **owned-by:** `createPostChain` constructs it with `quality.dofResolutionScale` and inserts it before the tone-map/grade EffectPass (`postprocessing/composer.ts:109`, `:113`).
- **joins:** `cameraConfig.focusDistance`/`near`/`far` — the composition's focus plane and the lens agree by construction; `quality.ts` tiers (1 / 0.75 / 0.5) which scale every pyramid level.
- **looks-like-but-is-not:** the `DepthOfFieldEffect` named in `composer.ts`'s header comment (`composer.ts:5`) — that comment is stale; the chain uses this pass. Also not the atmospheric haze in `vegetationMaterial` (`:292`): that is per-plant colour, not blur, and survives even at zero CoC.

## If you change this

- **Hits:** the entire frame's read of depth. Moving `focusDistance` re-sorts which placements are sharp, so `composition.ts`'s `focusRole` hierarchy — hero sharp, background soft — is what actually breaks, not just "the blur". Changing `nearScale`/`deadZone` changes near coverage, which changes how much foreground occludes midground, so the composition's negative space moves. Changing the pyramid *sizes* breaks `tests/unit/dofPass.test.ts`, which asserts the exact 960/480/240 chain at 1920×1080 and the 0.5-tier equivalents. Removing the `:148` base pre-blur line re-introduces sharp near petals under the smear. Adding a level, or reordering the near-field scratch reuse at `:359`–`:368`, corrupts the near layer silently — those targets are only free *because* the far pyramid has already finished.
- **Does not hit:** **the grade and the tone map.** The intuition is "blur and colour are both post, so they move together" — they do not: DOF runs as its own Pass writing an intermediate buffer, and ACES + `GradeEffect` run afterwards in a separate `EffectPass` (`composer.ts:113`–`:114`), reading whatever DOF produced. Vignette, grain, and shadow tint are unchanged by any DOF edit. Also **not the vegetation shader** — plants do not know they are being defocused; and **not V2**, which has no runtime DOF at all.

## Surfaces

| Surface | Role |
|---|---|
| `createPostChain` | constructs it, hands it the quality resolution scale, orders it before the grade |
| `App.handleResize` | drives `post.setSize(w, h)` → `setSize` on this pass |
| `EffectComposer` | writes the depth texture in via `setDepthTexture` |
| `tests/unit/dofPass.test.ts` | reads pyramid target sizes — a hard gate |

## See

- Source: `versions/v1-procedural/src/scene/postprocessing/CinematicDofPass.ts`
- Chain: `versions/v1-procedural/src/scene/postprocessing/composer.ts`
- Focus plane: `versions/v1-procedural/src/config/cameraConfig.ts`
- Gate: `versions/v1-procedural/tests/unit/dofPass.test.ts`
