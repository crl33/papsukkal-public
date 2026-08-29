---
date: 2026-08-29
area: v1-botany
outcome: kept
---

# Hero flowers: frontal disc → oblique cup

## Why

Side by side, the hero magenta cosmos read as a front-facing circular "flower
icon" while the reference's is a shallow bowl seen obliquely from below. The
silhouette aspect was the giveaway: mine ≈1:1, the reference ≈2:1 wide.

## What was changed

- `src/scene/flowers/species.ts` — added `elevation` / `flare` / `aoBase` to
  `addTexturedPetals`; rebuilt `buildCosmos` as two whorls rising out of the
  receptacle plane
- `src/config/composition.ts` — hero `facing` pitch 72° → 30° (orientation only;
  screen positions untouched)
- `src/scene/shaders/vegetationMaterial.ts` — petal underside darkening,
  thickness-driven transmission, soft specular

## Numbers

| Gate | Before | After | Target |
|---|---|---|---|
| B — hero morphology | frontal disc, ~1:1 | oblique bowl, ~2:1 | reference bowl |

## Result

Kept. The single largest visual gain of the whole pass.

## What the next agent should know

Tune hero morphology by **screen-space silhouette comparison**
(`silhouette.mjs hero`), never by picking pitch/yaw numbers that sound right.
Two calibration traps: the first underside multiplier (0.34) was so dark the
flower went muted — the reference is vividly saturated *with* dark accents; and
raising petal-grid resolution over-resolved the striations into a pinwheel, so
the fix was narrower blades and softer stripes, not more geometry.
