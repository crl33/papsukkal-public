---
date: 2026-08-29
area: v1-colour
outcome: kept
---

# "Wire forest": the stems were not the problem

## Why

The midground read as high-contrast black-and-white straight lines — a
wireframe, not a meadow. The obvious diagnosis was "stems too bright / too
many".

## What was changed

First, a real bug: `rngShade()` sampled white noise **per vertex along each
ribbon**, so every stem rendered as a *dashed* line. Replaced with smooth
low-frequency variation. Then curved every filament (branches, leaflets,
feather threads were all straight strokes) and broke instance parallelism with
per-instance lean on two axes.

Then the actual cause, found by measuring instead of guessing.

## Numbers

`node scripts/measure.mjs`, midground band:

| Metric | Reference | Mine (before) |
|---|---|---|
| mean luminance | 54.5 | **23.3** |
| median | 54.5 | **17.3** |
| teal coverage | 13.1% | 5.2% |

## Result

Kept. The stems were *not* too bright — the background between them was far too
dark, so any lit stem read as a stroke on black. The fix was lifting and filling
the midground (atmosphere band, distance-faded ground, defocused foliage mass),
not darkening stems.

## What the next agent should know

**Measure the band before you fix the thing you think is wrong.** Also: after
lifting, the band overshot into a flat teal wash (mean 56.7 but teal 26% vs the
reference's 13%) — mean alone is gameable, and a flat wash scores well while
looking dead. Pair Gate D with Gate A every time.
