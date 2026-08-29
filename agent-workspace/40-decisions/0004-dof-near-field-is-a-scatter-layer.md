---
id: 0004
date: 2026-08-29
status: accepted
---

# 0004 — The near field is a separate premultiplied scatter layer

## Context

A single gather-DOF composite drove every pixel from `max(farCoC, nearCoC,
nearSpread)`. A sharp midground pixel next to a defocused foreground therefore
adopted the whole blur pyramid and got washed with foreground colour. Reported
as "the foreground bloom bleeds into the midground stems".

## Decision

The near field is prefiltered into its own **premultiplied** layer
(`colour × nearCoC`, `nearCoC`), blurred as a unit, then un-premultiplied and
composited *over* the far-field result with a saturated coverage ramp. Zero
coverage leaves the midground bit-identical. Additionally the base layer is
blurred by each pixel's own near CoC so near objects cannot keep their own
sharpness.

## Rejected alternatives

- **Shrink the near blur radius** — treats the symptom; the bleed is a
  compositing error, not a radius error.
- **Use an off-the-shelf DOF effect** — cannot produce the reference's
  foreground blur (10–15% of frame width) without severe artefacts. This is why
  `CinematicDofPass` exists at all.

## Consequences

Two extra render targets and a second small blur chain. The far field caps at a
mid pyramid level so distant flowers stay structured bokeh rather than fog.

## What would reverse this

A single-pass formulation that keeps foreground colour off the sharp midground
and still reaches the required blur width.
